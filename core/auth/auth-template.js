'use strict';

class AuthTemplate {
  /**
   * @param {Object} deps
   * @param {import('../user/user-repository')} deps.userRepo
   * @param {import('../user/user-service')} deps.userService
   */
  constructor({ userRepo, userService }) {
    this.userRepo = userRepo;
    this.userService = userService;
  }

  /**
   * Template method that orchestrates the full authentication flow.
   * @param {...*} args - Arguments forwarded to initiate()
   * @returns {Promise<{userId: number, nickname: string, loginAt: string, provider: string}>}
   */
  async authenticate(...args) {
    const initiated = await this.initiate(...args);
    const userInfo = await this.validate(initiated);
    const user = await this.syncUser(userInfo);
    const session = await this.createSession({ ...userInfo, id: user.id, level: user.level });
    return session;
  }

  /**
   * Initiate the auth flow (e.g. open browser, receive JWT).
   * @abstract
   * @param {...*} args
   * @returns {Promise<Object>}
   */
  async initiate() {
    throw new Error('Must be implemented by subclass');
  }

  /**
   * Validate the result of initiate() and extract user identity.
   * @abstract
   * @param {Object} initiated - The result from initiate()
   * @returns {Promise<{github_id?: string, email?: string, nickname: string}>}
   */
  async validate() {
    throw new Error('Must be implemented by subclass');
  }

  /**
   * Synchronize user in the database via UserService.
   * @param {Object} userInfo
   * @param {string} [userInfo.github_id]
   * @param {string} [userInfo.email]
   * @param {string} userInfo.nickname
   * @returns {Promise<Object>} The synced user record.
   */
  async syncUser(userInfo) {
    return await this.userService.syncUser(userInfo);
  }

  /**
   * Create a session object from user info.
   * @param {Object} params
   * @param {number} params.id - User database ID
   * @param {string} params.nickname
   * @param {string} [params.provider] - Auth provider name
   * @returns {Promise<{userId: number, nickname: string, loginAt: string, provider: string}>}
   */
  async createSession({ id, nickname, provider, level }) {
    const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    return {
      userId: id,
      nickname,
      loginAt: new Date().toISOString(),
      expiresAt: Date.now() + SESSION_TTL_MS,
      provider,
      level: level ?? 0,
    };
  }
}

module.exports = AuthTemplate;
