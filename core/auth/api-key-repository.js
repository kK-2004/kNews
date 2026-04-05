class ApiKeyRepository {
  /**
   * @param {import('@supabase/supabase-js').SupabaseClient} supabase
   */
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * Find an active API key by its hash.
   * @param {string} keyHash
   * @returns {Promise<Object|null>}
   */
  async findByHash(keyHash) {
    const { data, error } = await this.supabase
      .from('api_key')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find api_key by hash: ${error.message}`);
    }

    return data;
  }

  /**
   * Update usage statistics for an API key.
   * @param {string} id
   * @returns {Promise<void>}
   */
  async updateUsage(id) {
    // Use RPC to perform atomic increment via a Postgres function.
    // The function `increment_api_key_usage` should be defined in a migration:
    //   CREATE OR REPLACE FUNCTION increment_api_key_usage(key_id TEXT)
    //   RETURNS VOID AS $$
    //     UPDATE api_key SET last_used = now(), call_count = call_count + 1 WHERE id = key_id;
    //   $$ LANGUAGE sql;
    const { error } = await this.supabase.rpc('increment_api_key_usage', { key_id: id });

    if (error) {
      throw new Error(`Failed to update api_key usage for ${id}: ${error.message}`);
    }
  }

  /**
   * Find all active API keys for a user.
   * @param {number} userId
   * @returns {Promise<Object[]>}
   */
  async findActiveByUserId(userId) {
    const { data, error } = await this.supabase
      .from('api_key')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to find active api_keys for user ${userId}: ${error.message}`);
    }

    return data;
  }
}

module.exports = ApiKeyRepository;
