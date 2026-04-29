'use strict';

const AuthTemplate = require('./auth-template');

class GitHubOAuthStrategy extends AuthTemplate {
  /**
   * @param {Object} deps
   * @param {import('../user/user-repository')} deps.userRepo
   * @param {import('../user/user-service')} deps.userService
   * @param {string} deps.clientId - GitHub OAuth App client ID
   * @param {Object} deps.shell - Electron shell module (injected, not imported)
   */
  constructor({ userRepo, userService, clientId, shell }) {
    super({ userRepo, userService });
    this.clientId = clientId;
    this.shell = shell;
  }

  /**
   * Initiate GitHub Device Flow:
   * 1. POST to GitHub device/code endpoint to get device_code + user_code
   * 2. Open the verification URI in the default browser
   * @returns {Promise<{device_code: string, user_code: string, interval: number}>}
   */
  async initiate() {
    const response = await this._fetchWithNetworkRetry('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        scope: 'repo,user:email',
      }),
    }, { label: 'GitHub device code request' });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`GitHub device code request failed: ${response.status} - ${errBody}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`GitHub device code error: ${data.error_description || data.error}`);
    }

    // Delay opening browser by 5s so give user time to copy the code
    // Browser will be opened later via openBrowserAfterDelay()
    this._pendingBrowserOpen = {
      verifyUrl: `${data.verification_uri}?user_code=${encodeURIComponent(data.user_code)}`,
      delay: 5000,
    };

    // Copy user_code to clipboard silently
    try {
      const { clipboard } = require('electron');
      clipboard.writeText(data.user_code);
    } catch { /* ignore */ }

    console.log(`[github-auth] Code: ${data.user_code} → ${data.verification_uri}`);

    return {
      device_code: data.device_code,
      user_code: data.user_code,
      interval: data.interval || 5,
    };
  }

  /**
   * Validate by polling GitHub for the access token:
   * 1. Poll the access_token endpoint with client_id + device_code
   * 2. Handle authorization_pending / slow_down by waiting and retrying
   * 3. Once access_token is obtained, fetch GitHub user profile
   * 4. Max poll duration: 5 minutes
   * @param {Object} initiated - Result from initiate()
   * @param {string} initiated.device_code
   * @param {number} [initiated.interval] - Polling interval in seconds (default 5)
   * @returns {Promise<{github_id: string, email: string|null, nickname: string}>}
   */
  async validate({ device_code, interval = 5, signal } = {}) {
    const MAX_POLL_MS = 5 * 60 * 1000;
    const startTime = Date.now();
    let currentInterval = interval;

    let accessToken;
    // Wait before polling
    await this._sleep(3 * 1000, signal);

    try {
      while (Date.now() - startTime < MAX_POLL_MS) {
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }

        const response = await this._fetchWithNetworkRetry('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            client_id: this.clientId,
            device_code,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
          }),
          signal,
        }, { label: 'GitHub token polling' });

        if (!response.ok) {
          throw new Error(`GitHub token polling failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          await this._sleep(currentInterval * 1000, signal);
          if (data.error === 'authorization_pending') {
            continue; // User hasn't authorized yet, retry
          }
          if (data.error === 'slow_down') {
            currentInterval += 5; // Back off
            continue;
          }
          if (data.error === 'expired_token') {
            throw new Error('GitHub device code expired. Please try again.');
          }
          if (data.error === 'access_denied') {
            throw new Error('GitHub authorization was denied.');
          }
          throw new Error(`GitHub token error: ${data.error_description || data.error}`);
        }

        accessToken = data.access_token;
        break;
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Device flow was cancelled.');
      }
      throw err;
    }

    if (!accessToken) {
      throw new Error('GitHub Device Flow timed out after 5 minutes');
    }

    // Fetch user profile from GitHub API
    const userResponse = await this._fetchWithNetworkRetry('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }, { label: 'GitHub API request' });

    if (!userResponse.ok) {
      throw new Error(`GitHub API request failed: ${userResponse.status}`);
    }

    const githubUser = await userResponse.json();

    return {
      github_id: githubUser.id.toString(),
      email: githubUser.email,
      nickname: githubUser.login,
    };
  }

  /**
   * Create session with provider set to 'github'.
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  async createSession(params) {
    return super.createSession({ ...params, provider: 'github' });
  }

  /**
   * Open the browser after the configured delay (called by renderer after user sees the code).
   */
  async openBrowserAfterDelay() {
    if (this._pendingBrowserOpen) {
      const { verifyUrl } = this._pendingBrowserOpen;
      this._pendingBrowserOpen = null;
      await this.shell.openExternal(verifyUrl);
    }
  }

  /**
   * @param {number} ms
   * @returns {Promise<void>}
   */
  _sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
      const timer = setTimeout(resolve, ms);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      }, { once: true });
    });
  }

  async _fetchWithNetworkRetry(url, options = {}, { retries = 3, label = 'Network request' } = {}) {
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await fetch(url, options);
      } catch (err) {
        if (err?.name === 'AbortError' || options.signal?.aborted) {
          throw err;
        }
        if (!this._isNetworkFetchError(err)) {
          throw err;
        }
        lastError = err;
        if (attempt >= retries) break;
        await this._sleep(800 * (attempt + 1), options.signal);
      }
    }

    throw new Error(`${label} 网络请求失败，已重试 ${retries} 次：${lastError?.message || 'fetch failed'}`);
  }

  _isNetworkFetchError(err) {
    const message = String(err?.message || '').toLowerCase();
    return err instanceof TypeError
      || message.includes('fetch failed')
      || message.includes('network')
      || message.includes('econnreset')
      || message.includes('etimedout')
      || message.includes('enotfound');
  }
}

module.exports = GitHubOAuthStrategy;
