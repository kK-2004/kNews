'use strict';

const AuthFactory = require('./auth-factory');

class AuthContext {
  /**
   * @param {Object} deps - Shared dependencies passed to all strategies
   * @param {import('../user/user-repository')} deps.userRepo
   * @param {import('../user/user-service')} deps.userService
   * @param {Object} [deps.supabase] - Supabase client instance (required for OTP)
   */
  constructor(deps) {
    this.deps = deps;
    this.session = null;
  }

  /**
   * Perform login using the specified auth strategy.
   * @param {'github'|'magic-link'} type - Auth strategy type
   * @param {...*} args - Extra arguments forwarded to strategy.authenticate()
   * @returns {Promise<Object>} The created session
   */
  async login(type, ...args) {
    const strategy = AuthFactory.create(type, this.deps);
    this.session = await strategy.authenticate(...args);
    return this.session;
  }

  /**
   * Create a strategy instance without executing it.
   * Useful for multi-phase flows (e.g. GitHub Device Flow).
   * @param {'github'|'magic-link'} type
   * @returns {import('./auth-template')}
   */
  createStrategy(type) {
    return AuthFactory.create(type, this.deps);
  }

  /**
   * Clear the current session.
   */
  logout() {
    this.session = null;
  }

  /**
   * Get the current session, if any.
   * @returns {Object|null}
   */
  getSession() {
    return this.session;
  }
}

module.exports = AuthContext;
