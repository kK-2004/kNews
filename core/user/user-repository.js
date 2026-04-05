class UserRepository {
  /**
   * @param {import('@supabase/supabase-js').SupabaseClient} supabase
   */
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * Find a user by their GitHub ID.
   * @param {string} githubId
   * @returns {Promise<Object|null>}
   */
  async findByGithubId(githubId) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('github_id', githubId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find user by github_id: ${error.message}`);
    }

    return data;
  }

  /**
   * Find a user by their database ID.
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find user by id: ${error.message}`);
    }

    return data;
  }

  /**
   * Find a user by their email address.
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find user by email: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new user.
   * @param {Object} data - User fields to insert.
   * @returns {Promise<Object>}
   */
  async create(data) {
    const { data: row, error } = await this.supabase
      .from('users')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return row;
  }

  /**
   * Update a user by ID.
   * @param {number} id
   * @param {Object} data - Fields to update.
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    const { data: row, error } = await this.supabase
      .from('users')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user ${id}: ${error.message}`);
    }

    return row;
  }
}

module.exports = UserRepository;
