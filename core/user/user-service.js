'use strict';

const crypto = require('node:crypto');

const HASH_SALT = 'knews_api_key_salt';

const DEFAULT_SOURCE_SCOPE = ['douyin', 'weibo', 'github', 'toutiao'];

const LEVEL_PERMISSIONS = {
  0: { rate_limit: 3, max_count: 5 },
  1: { rate_limit: 20, max_count: 10 },
  2: { rate_limit: -1, max_count: 50 },
};

class UserService {
  /**
   * @param {import('./user-repository')} userRepository
   * @param {import('../auth/api-key-repository')} [apiKeyRepo]
   */
  constructor(userRepository, apiKeyRepo) {
    this.userRepository = userRepository;
    this.apiKeyRepo = apiKeyRepo;
  }

  /**
   * Synchronize a user based on github_id or email.
   *
   * If github_id is provided, look up by github_id first.
   * If email is provided, look up by email next.
   * If a matching user is found, update their record.
   * If no match is found, create a new user.
   *
   * @param {Object} userInfo
   * @param {string} [userInfo.github_id]
   * @param {string} [userInfo.email]
   * @param {string} userInfo.nickname
   * @returns {Promise<Object>} The synced user object.
   */
  async syncUser(userInfo) {
    const { github_id, email, nickname } = userInfo;

    let user = null;

    // Try lookup by github_id first
    if (github_id) {
      user = await this.userRepository.findByGithubId(github_id);
    }

    // Fall back to lookup by email
    if (!user && email) {
      user = await this.userRepository.findByEmail(email);
    }

    if (user) {
      // Only update fields that actually changed
      const updateData = {};
      if (nickname && nickname !== user.nickname) updateData.nickname = nickname;
      if (github_id && github_id !== user.github_id) updateData.github_id = github_id;
      if (email && email !== user.email) updateData.email = email;

      if (Object.keys(updateData).length === 0) return user;

      return await this.userRepository.update(user.id, updateData);
    }

    // No existing user found — create a new one
    user = await this.userRepository.create({ github_id, email, nickname });

    // Auto-create a default MCP API Key for the new user
    await this._createDefaultApiKey(user);

    return user;
  }

  /**
   * Create a default MCP API Key for a new user.
   * @param {{ id: number, level?: number }} user
   */
  async _createDefaultApiKey(user) {
    if (!this.apiKeyRepo) return;

    try {
      const level = user.level ?? 0;
      const perm = LEVEL_PERMISSIONS[level] || LEVEL_PERMISSIONS[0];
      const rawKey = `knews_${crypto.randomBytes(24).toString('hex')}`;
      const keyHash = crypto.createHash('sha256').update(String(rawKey) + HASH_SALT).digest('hex');
      const displayName = user.nickname?.trim() || `用户${user.id}`;

      await this.apiKeyRepo.supabase.from('api_key').insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        key_hash: keyHash,
        name: `${displayName} 默认Key`,
        is_active: true,
        is_default: true,
        source_scope: JSON.stringify(DEFAULT_SOURCE_SCOPE),
        rate_limit: perm.rate_limit,
        max_count: perm.max_count,
        call_count: 0,
      });
    } catch (err) {
      console.error('[UserService] Failed to create default API key:', err.message);
    }
  }
}

module.exports = UserService;
