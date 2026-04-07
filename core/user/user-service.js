class UserService {
  /**
   * @param {import('./user-repository')} userRepository
   */
  constructor(userRepository) {
    this.userRepository = userRepository;
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
    return await this.userRepository.create({ github_id, email, nickname });
  }
}

module.exports = UserService;
