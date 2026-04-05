'use strict';

const { load } = require('cheerio');

// Use Chromium's network stack (same TLS fingerprint as Chrome)
let netFetch = null;
try {
  const electron = require('electron');
  netFetch = electron.net?.fetch?.bind(electron.net);
} catch {
  // not in Electron main process
}

function getFetch() {
  return netFetch || globalThis.fetch;
}

const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const DEFAULT_TIMEOUT = 15000;
const DEFAULT_RETRIES = 2;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * SourceFetcher - fetches and parses news items from a source.
 *
 * Supports three source types:
 *   - 'api'    : fetch JSON, apply `config.mapResponse(data)` to extract items
 *   - 'html'   : fetch HTML, parse with cheerio using `config.selectors`, extract items
 *   - 'rss'    : fetch RSS/Atom XML feed, parse items
 */
class SourceFetcher {
  async fetch(source) {
    const { type, url, config = {} } = source;

    // Pre-fetch hook: some sources need a cookie fetch first
    if (config.preFetch) {
      try {
        const extraHeaders = await config.preFetch(getFetch());
        config.headers = { ...config.headers, ...extraHeaders };
      } catch {
        // pre-fetch failed, try without
      }
    }

    let items;
    switch (type) {
      case 'api':
        items = await this._fetchAPI(source);
        break;
      case 'html':
        items = await this._fetchHTML(source);
        break;
      case 'rss':
        items = await this._fetchRSS(source);
        break;
      default:
        throw new Error(`Unknown source type: ${type}`);
    }

    // Normalize: ensure every item has { title, url, date, source }
    return items.map((item) => ({
      title: item.title || '',
      url: item.url || '',
      date: item.date || item.pubDate || null,
      source: source.id,
      extra: item.extra || undefined,
    }));
  }

  // ---------------------------------------------------------------------------
  // API sources
  // ---------------------------------------------------------------------------

  async _fetchAPI(source) {
    const { url, config = {} } = source;
    let res;

    if (config.method === 'POST') {
      res = await this._httpPost(url, config.body, config.headers);
    } else {
      res = await this._httpGet(url, config.headers);
    }

    // Some APIs return JS (e.g. jin10), mapResponse handles raw string
    const data = config.mapResponse && typeof res === 'string'
      ? res  // let mapResponse parse it
      : (typeof res === 'string' ? this._safeParseJSON(res) : res);

    if (!data) {
      throw new Error(`API source ${source.id} returned non-JSON response`);
    }

    const rawItems = config.mapResponse
      ? config.mapResponse(data)
      : Array.isArray(data)
        ? data
        : data?.data || data?.items || [];

    const mapped = config.mapItem
      ? rawItems.map(config.mapItem)
      : rawItems;

    // Filter out nulls (some mapItem return null to skip items)
    return mapped.filter(Boolean);
  }

  // ---------------------------------------------------------------------------
  // HTML sources
  // ---------------------------------------------------------------------------

  async _fetchHTML(source) {
    const { url, config = {} } = source;
    const html = await this._httpGetText(url, config.headers);
    const $ = load(html);

    if (config.extract) {
      return config.extract($);
    }

    const { selectors = {} } = config;
    const containerSel = selectors.container || 'body';
    const itemSel = selectors.item;
    const titleSel = selectors.title || 'a';
    const urlSel = selectors.url || 'a';
    const dateSel = selectors.date;

    if (!itemSel) {
      throw new Error(`HTML source ${source.id} missing config.selectors.item`);
    }

    const items = [];
    $(containerSel).find(itemSel).each((_, el) => {
      const $el = $(el);
      const title = $el.find(titleSel).first().text().trim();
      const url = $el.find(urlSel).first().attr('href') || '';
      const date = dateSel ? $el.find(dateSel).text().trim() : null;

      if (title && url) {
        items.push({
          title,
          url: this._resolveURL(url, source.url),
          date: date ? this._parseDate(date) : null,
        });
      }
    });

    return items;
  }

  // ---------------------------------------------------------------------------
  // RSS sources
  // ---------------------------------------------------------------------------

  async _fetchRSS(source) {
    const { url, config = {} } = source;
    const xml = await this._httpGetText(url, config.headers);
    return this._parseRSS(xml);
  }

  _parseRSS(xml) {
    const items = [];

    const itemRegex = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1];

      const title = this._extractTag(block, 'title');
      const link = this._extractTag(block, 'link')
        || this._extractAttr(block, 'link', 'href');
      const pubDate = this._extractTag(block, 'pubDate')
        || this._extractTag(block, 'published')
        || this._extractTag(block, 'updated')
        || this._extractTag(block, 'dc:date');

      if (title) {
        items.push({
          title: this._decodeEntities(title),
          url: link || '',
          date: pubDate ? new Date(pubDate).getTime() : null,
        });
      }
    }

    return items;
  }

  // ---------------------------------------------------------------------------
  // HTTP helpers (with retry + timeout, same as kNews/myFetch)
  // ---------------------------------------------------------------------------

  async _httpGet(url, extraHeaders) {
    return this._doFetchWithRetry(url, {
      headers: extraHeaders,
    });
  }

  async _httpPost(url, body, extraHeaders) {
    return this._doFetchWithRetry(url, {
      method: 'POST',
      headers: extraHeaders,
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  async _httpGetText(url, extraHeaders) {
    const res = await this._doFetchWithRetryRaw(url, { headers: extraHeaders });
    return res.text();
  }

  async _doFetchWithRetry(url, options = {}) {
    const res = await this._doFetchWithRetryRaw(url, options);
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return await res.json();
    }

    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async _doFetchWithRetryRaw(url, options = {}) {
    const retries = options.retries ?? DEFAULT_RETRIES;
    const timeout = options.timeout ?? DEFAULT_TIMEOUT;
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const headers = {
          'User-Agent': DEFAULT_UA,
          ...options.headers,
        };

        const fetchOpts = {
          method: options.method || 'GET',
          headers,
          signal: controller.signal,
        };

        if (options.body) {
          if (!headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
          }
          fetchOpts.body = typeof options.body === 'string'
            ? options.body
            : JSON.stringify(options.body);
        }

        const response = await getFetch()(url, fetchOpts);

        if (!response.ok) {
          const retryable = response.status >= 500 || response.status === 429;
          if (retryable && attempt < retries) {
            await sleep((attempt + 1) * 300);
            continue;
          }
          throw new Error(`HTTP ${response.status} fetching ${url}`);
        }

        return response;
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          await sleep((attempt + 1) * 300);
        }
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError || new Error('fetch failed');
  }

  // ---------------------------------------------------------------------------
  // Utility helpers
  // ---------------------------------------------------------------------------

  _extractTag(block, tagName) {
    const regex = new RegExp(`<([^:>]*:)?${tagName}[^>]*>([\\s\\S]*?)<\\/([^:>]*:)?${tagName}>`, 'i');
    const match = block.match(regex);
    return match ? match[2].trim() : null;
  }

  _extractAttr(block, tagName, attrName) {
    const regex = new RegExp(`<${tagName}[^>]*${attrName}=["']([^"']+)["']`, 'i');
    const match = block.match(regex);
    return match ? match[1].trim() : null;
  }

  _resolveURL(href, baseURL) {
    if (!href) return '';
    if (href.startsWith('http://') || href.startsWith('https://')) return href;
    try {
      return new URL(href, baseURL).toString();
    } catch {
      return href;
    }
  }

  _safeParseJSON(text) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  _parseDate(dateStr) {
    const ts = Date.parse(dateStr);
    return isNaN(ts) ? null : ts;
  }

  _decodeEntities(str) {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
  }
}

module.exports = SourceFetcher;
