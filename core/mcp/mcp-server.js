'use strict';

const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { WebStandardStreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js');
const { createMcpSdkServer } = require('./mcp-tools');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the path for the MCP port config file.
 * ~/.knews/mcp-port.json
 */
function getPortConfigPath() {
  return path.join(os.homedir(), '.knews', 'mcp-port.json');
}

/**
 * Write the current port to the local config file so other processes (e.g.
 * the Electron renderer or external MCP clients) can discover the server.
 */
function writePortConfig(port) {
  const configPath = getPortConfigPath();
  try {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({ port, updated: Date.now() }, null, 2),
      'utf-8',
    );
  } catch (err) {
    console.warn('[McpServer] Failed to write port config:', err.message);
  }
}

/**
 * Remove the port config file on shutdown.
 */
function removePortConfig() {
  try {
    fs.unlinkSync(getPortConfigPath());
  } catch (_e) {
    // ignore – file may already be gone
  }
}

/**
 * Hash an API key with SHA-256 + salt (matching the scheme used by
 * kNews/server/utils/api-key.js).
 */
const HASH_SALT = 'knews_api_key_salt';
function hashApiKey(apiKey) {
  return crypto
    .createHash('sha256')
    .update(String(apiKey) + HASH_SALT)
    .digest('hex');
}

/**
 * Send a JSON response.
 */
function jsonResponse(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

// ---------------------------------------------------------------------------
// Rate limiter – in-memory, per-key, hourly window
// ---------------------------------------------------------------------------

class RateLimiter {
  constructor() {
    /** @type {Map<string, { count: number, resetTime: number }>} */
    this.store = new Map();
  }

  /**
   * Check whether the key identified by `keyId` is allowed to make a request.
   *
   * @param {string} keyId       – unique identifier (api key hash or id)
   * @param {number} rateLimit   – max requests per hour
   * @returns {{ allowed: boolean, retryAfter: number|null }}
   */
  check(keyId, rateLimit) {
    const now = Date.now();
    const HOUR_MS = 60 * 60 * 1000;

    let entry = this.store.get(keyId);
    if (!entry || now >= entry.resetTime) {
      entry = { count: 0, resetTime: now + HOUR_MS };
      this.store.set(keyId, entry);
    }

    if (entry.count >= rateLimit) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return { allowed: false, retryAfter: retryAfter > 0 ? retryAfter : 1 };
    }

    entry.count += 1;
    return { allowed: true, retryAfter: null };
  }
}

// ---------------------------------------------------------------------------
// McpServer
// ---------------------------------------------------------------------------

class McpServer {
  /**
   * @param {{ sourceService: object, feedService: object, apiKeyRepository: object, usageRepository?: object }} deps
   * @param {{ port?: number }=} opts
   */
  constructor({ sourceService, feedService, apiKeyRepository, usageRepository }, opts = {}) {
    this.sourceService = sourceService;
    this.feedService = feedService;
    this.apiKeyRepository = apiKeyRepository;
    this.usageRepository = usageRepository;

    this.defaultPort = opts.port || 12580;
    /** @type {http.Server|null} */
    this.server = null;
    this.port = null;
    this.startedAt = null;

    this.rateLimiter = new RateLimiter();

    /**
     * Active MCP sessions, keyed by session ID.
     * Each entry holds the SDK server instance, transport, and associated API key.
     * @type {Map<string, { server: object, transport: object, apiKeyId: string, createdAt: number }>}
     */
    this._sessions = new Map();

    /**
     * Sessions that have already been counted for usage in the current hour.
     * Key: `${apiKeyId}:${sessionId}` — cleared on hourly boundary.
     * @type {Set<string>}
     */
    this._billedSessions = new Set();

    /**
     * Sessions that have already consumed one rate-limit slot in the current hour.
     * A single chat request can make multiple MCP tool calls over the same session.
     * @type {Set<string>}
     */
    this._rateLimitedSessions = new Set();
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  /**
   * Start the HTTP server.  If the default port is occupied, try the next
   * sequential port (up to 10 attempts).
   */
  start() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 10;

      const tryListen = (port) => {
        const server = http.createServer((req, res) => {
          this._handleRequest(req, res).catch((err) => {
            console.error('[McpServer] Unhandled error:', err);
            jsonResponse(res, 500, { error: 'Internal server error' });
          });
        });

        server.on('error', (err) => {
          if (err.code === 'EADDRINUSE' && attempts < maxAttempts) {
            attempts++;
            const nextPort = this.defaultPort + attempts;
            console.warn(
              `[McpServer] Port ${port} in use, trying ${nextPort}...`,
            );
            tryListen(nextPort);
          } else {
            reject(err);
          }
        });

        server.listen(port, () => {
          this.server = server;
          this.port = port;
          this.startedAt = Date.now();
          writePortConfig(port);
          console.log(`[McpServer] Listening on port ${port}`);
          resolve();
        });
      };

      tryListen(this.defaultPort);
    });
  }

  /**
   * Gracefully stop the server and clean up all sessions.
   */
  stop() {
    return new Promise((resolve) => {
      // Close all active sessions
      for (const entry of this._sessions.values()) {
        entry.server.close().catch(() => {});
      }
      this._sessions.clear();
      this._billedSessions.clear();

      if (!this.server) {
        resolve();
        return;
      }

      const server = this.server;
      this.server = null;
      this.port = null;
      this.startedAt = null;
      removePortConfig();

      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        resolve();
      };

      // Force-destroy all sockets first
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }

      server.close(done);

      // Hard timeout — force resolve if server.close hangs
      setTimeout(done, 2000);
    });
  }

  // -----------------------------------------------------------------------
  // Auth middleware
  // -----------------------------------------------------------------------

  /**
   * Extract and validate the Bearer token from the Authorization header.
   * Returns the api_key row (with rate_limit, source_scope, etc.) or null.
   *
   * @param {http.IncomingMessage} req
   * @returns {Promise<object|null>}
   */
  async _authenticate(req) {
    let apiKey = '';

    // 1. Try Authorization: Bearer header
    const authHeader = req.headers['authorization'];
    if (authHeader && typeof authHeader === 'string') {
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (match) apiKey = match[1].trim();
    }

    // 2. Fallback: ?apikey= query parameter
    if (!apiKey) {
      const url = new URL(req.url, `http://localhost:${this.port}`);
      apiKey = (url.searchParams.get('apikey') || '').trim();
    }

    if (!apiKey) return null;

    try {
      // Default keys may already be passed around as the stored hash value.
      const defaultRow = await this.apiKeyRepository.findByHash(apiKey, {
        isDefault: true,
      });
      if (defaultRow) return defaultRow;

      const keyHash = hashApiKey(apiKey);
      const row = await this.apiKeyRepository.findByHash(keyHash);
      return row || null;
    } catch (err) {
      console.error('[McpServer] Auth lookup error:', err.message);
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // Request router
  // -----------------------------------------------------------------------

  async _handleRequest(req, res) {
    const url = new URL(req.url, `http://localhost:${this.port}`);

    // --- Health check (no auth) -----------------------------------------
    if (req.method === 'GET' && url.pathname === '/mcp/health') {
      return this._handleHealth(res);
    }

    // --- Standard MCP endpoint -------------------------------------------
    if (url.pathname === '/mcp') {
      return this._withAuth(req, res, (apiKeyRow) =>
        this._handleMcpRequest(req, res, apiKeyRow),
      );
    }

    // 404 for everything else
    jsonResponse(res, 404, { error: 'Not found' });
  }

  // -----------------------------------------------------------------------
  // Auth + rate-limit wrapper
  // -----------------------------------------------------------------------

  /**
   * Authenticate the request, enforce rate limiting, then invoke `handler`.
   */
  async _withAuth(req, res, handler) {
    const apiKeyRow = await this._authenticate(req);
    if (!apiKeyRow) {
      return jsonResponse(res, 401, { error: 'Unauthorized' });
    }

    // Rate limit – default 100 requests/hour if not set on the key.
    // Negative values mean "unlimited".
    const rateLimit =
      typeof apiKeyRow.rate_limit === 'number' ? apiKeyRow.rate_limit : 100;
    if (rateLimit < 0) {
      return handler(apiKeyRow);
    }

    const sessionId = this._getSessionId(req);
    if (sessionId && this._isSessionRateLimited(apiKeyRow.id, sessionId)) {
      return handler(apiKeyRow);
    }

    const result = this.rateLimiter.check(apiKeyRow.id, rateLimit);

    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfter));
      return jsonResponse(res, 429, {
        error: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
      });
    }

    return handler(apiKeyRow);
  }

  /**
   * Extract Mcp-Session-Id from request headers.
   * @param {http.IncomingMessage} req
   * @returns {string|null}
   */
  _getSessionId(req) {
    const val = req.headers['mcp-session-id'];
    if (typeof val === 'string' && val.trim()) return val.trim();
    return null;
  }

  /**
   * Get a billing key for the current hour + apiKey + session.
   * If no session exists, creates a one-shot key so the request is still billed.
   * @param {string} apiKeyId
   * @param {string|null} sessionId
   * @returns {string}
   */
  _getBillingKey(apiKeyId, sessionId) {
    const now = new Date();
    const hour = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')} ${String(now.getUTCHours()).padStart(2, '0')}`;
    const session = sessionId || `nosession-${crypto.randomUUID()}`;
    return `${hour}:${apiKeyId}:${session}`;
  }

  /**
   * Record hourly usage for the given API key, once per session per hour.
   *
   * @param {string} apiKeyId
   * @param {string|null} sessionId - Mcp-Session-Id header value
   */
  _recordUsageOncePerSession(apiKeyId, sessionId) {
    if (!this.usageRepository) return;

    const billingKey = this._getBillingKey(apiKeyId, sessionId);
    if (this._billedSessions.has(billingKey)) return;

    this._billedSessions.add(billingKey);
    try {
      this.usageRepository.incrementHourly(apiKeyId).catch(() => {});
      this.apiKeyRepository.updateUsage(apiKeyId).catch(() => {});
    } catch (_e) {
      // non-critical
    }
  }

  _isSessionRateLimited(apiKeyId, sessionId) {
    if (!sessionId) return false;
    return this._rateLimitedSessions.has(this._getBillingKey(apiKeyId, sessionId));
  }

  _recordRateLimitOncePerSession(apiKeyId, sessionId) {
    if (!sessionId) return;
    this._rateLimitedSessions.add(this._getBillingKey(apiKeyId, sessionId));
  }

  _handleHealth(res) {
    const uptime = this.startedAt
      ? Math.floor((Date.now() - this.startedAt) / 1000)
      : 0;
    jsonResponse(res, 200, { status: 'ok', uptime, port: this.port });
  }

  async _handleMcpRequest(req, res, apiKeyRow) {
    const sessionId = this._getSessionId(req);

    // --- Existing session: reuse transport + SDK server ---
    if (sessionId && this._sessions.has(sessionId)) {
      const entry = this._sessions.get(sessionId);
      try {
        const request = await this._toWebRequest(req);
        const response = await entry.transport.handleRequest(request);
        return this._sendWebResponse(res, response);
      } catch (err) {
        console.error('[McpServer] MCP session request error:', err);
        jsonResponse(res, 500, { error: `Internal server error: ${err.message}` });
      }
      return;
    }

    // --- New session (initialize) ---
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      enableJsonResponse: true,
    });

    const server = createMcpSdkServer({
      sourceService: this.sourceService,
      feedService: this.feedService,
      apiKey: apiKeyRow,
    });

    try {
      const request = await this._toWebRequest(req);
      transport.onerror = (err) =>
        console.error('[McpServer] MCP transport error:', err);

      await server.connect(transport);
      const response = await transport.handleRequest(request);

      // Capture the session ID assigned by the transport
      const newSessionId = transport.sessionId || null;
      if (newSessionId) {
        this._sessions.set(newSessionId, {
          server,
          transport,
          apiKeyId: apiKeyRow.id,
          createdAt: Date.now(),
        });

        // Record usage once per session per hour
        this._recordUsageOncePerSession(apiKeyRow.id, newSessionId);
        this._recordRateLimitOncePerSession(apiKeyRow.id, newSessionId);
      }

      return this._sendWebResponse(res, response);
    } catch (err) {
      console.error('[McpServer] MCP initialize error:', err);
      jsonResponse(res, 500, { error: `Internal server error: ${err.message}` });
      await server.close().catch(() => {});
    }
  }

  // -----------------------------------------------------------------------
  // Utility
  // -----------------------------------------------------------------------

  _readBody(req) {
    return new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        resolve(data || null);
      });
      req.on('error', () => {
        resolve(null);
      });
    });
  }

  async _toWebRequest(req) {
    const headers = {};
    for (const [key, value] of Object.entries(req.headers || {})) {
      if (Array.isArray(value)) {
        headers[key] = value.join(', ');
      } else if (typeof value === 'string') {
        headers[key] = value;
      }
    }

    const accept = headers.accept || '';
    if (!accept.includes('application/json') || !accept.includes('text/event-stream')) {
      headers.accept = 'application/json, text/event-stream';
    }

    const body =
      req.method === 'GET' || req.method === 'HEAD'
        ? undefined
        : await this._readBody(req);

    return new Request(`http://localhost:${this.port}${req.url}`, {
      method: req.method,
      headers,
      body: body || undefined,
    });
  }

  async _sendWebResponse(res, response) {
    // Forward all response headers (including mcp-session-id from transport)
    const headers = Object.fromEntries(response.headers.entries());
    res.writeHead(response.status, headers);
    if (!response.body) {
      res.end();
      return;
    }

    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!res.write(Buffer.from(value))) {
          await new Promise((resolve) => res.once('drain', resolve));
        }
      }
    } finally {
      reader.releaseLock();
    }

    res.end();
  }
}

module.exports = McpServer;
