'use strict';

const AuthTemplate = require('./auth-template');

class EmailMagicLinkStrategy extends AuthTemplate {
  /**
   * @param {Object} deps
   * @param {import('../user/user-repository')} deps.userRepo
   * @param {import('../user/user-service')} deps.userService
   * @param {Object} deps.supabase - Supabase client instance
   */
  constructor({ userRepo, userService, supabase }) {
    super({ userRepo, userService });
    this.supabase = supabase;
  }

  /**
   * Send Magic Link email via Supabase.
   * @param {Object} args
   * @param {string} args.email - User email address
   * @returns {Promise<{email: string}>}
   */
  async initiate({ email }) {
    if (!email) {
      throw new Error('Email is required');
    }

    const { error } = await this.supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'knews://auth/callback',
      },
    });

    if (error) {
      throw new Error(`Magic Link send failed: ${error.message}`);
    }

    return { email };
  }

  /**
   * Verify the Magic Link token from the deep link callback.
   * Uses Supabase to exchange the token for a session.
   * @param {Object} initiated - Result from initiate()
   * @param {string} initiated.email - User email address
   * @param {string} [initiated.token] - Access token from deep link URL
   * @param {string} [initiated.refreshToken] - Refresh token from deep link URL
   * @returns {Promise<{email: string, nickname: string}>}
   */
  async validate({ email, token, refreshToken }) {
    if (token && refreshToken) {
      const { data, error } = await this.supabase.auth.setSession({
        access_token: token,
        refresh_token: refreshToken,
      });

      if (error) {
        throw new Error(`Magic Link verification failed: ${error.message}`);
      }

      return {
        email: data?.user?.email || email,
        nickname: (data?.user?.email || email).split('@')[0],
      };
    }

    // Fallback: if no token provided, rely on Supabase session already established
    const { data: { session }, error } = await this.supabase.auth.getSession();
    if (error || !session) {
      throw new Error('Magic Link verification failed: no valid session');
    }

    return {
      email: session.user.email || email,
      nickname: (session.user.email || email).split('@')[0],
    };
  }

  /**
   * Create session with provider set to 'magic-link'.
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  async createSession(params) {
    return super.createSession({ ...params, provider: 'magic-link' });
  }
}

module.exports = EmailMagicLinkStrategy;
