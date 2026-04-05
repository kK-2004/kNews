'use strict';

const GitHubOAuthStrategy = require('./github-oauth-strategy');
const EmailMagicLinkStrategy = require('./email-magic-link-strategy');

class AuthFactory {
  /**
   * Create an authentication strategy instance.
   * @param {'github'|'magic-link'} type - The auth strategy type
   * @param {Object} deps - Dependencies forwarded to the strategy constructor
   * @returns {GitHubOAuthStrategy|EmailMagicLinkStrategy}
   */
  static create(type, deps) {
    switch (type) {
      case 'github':
        return new GitHubOAuthStrategy(deps);
      case 'magic-link':
        return new EmailMagicLinkStrategy(deps);
      default:
        throw new Error(`Unknown auth strategy type: ${type}`);
    }
  }
}

module.exports = AuthFactory;
