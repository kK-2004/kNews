class ApiKeyRepository {
  /**
   * @param {import('@supabase/supabase-js').SupabaseClient} supabase
   */
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * Find an active API key by hash.
   * @param {string} keyHash
   * @param {{ isDefault?: boolean }} [options]
   * @returns {Promise<Object|null>}
   */
  async findByHash(keyHash, options = {}) {
    let query = this.supabase
      .from('api_key')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('is_active', true);

    if (typeof options.isDefault === 'boolean') {
      query = query.eq('is_default', options.isDefault);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error(`Failed to find api_key by hash: ${error.message}`);
    }

    return data;
  }

  /**
   * Find the default API key for a user.
   * @param {number} userId
   * @returns {Promise<Object|null>}
   */
  async findDefaultByUserId(userId) {
    const { data, error } = await this.supabase
      .from('api_key')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find default api_key for user ${userId}: ${error.message}`);
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
    if (!error) return;

    const { data: existing, error: fetchError } = await this.supabase
      .from('api_key')
      .select('call_count')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to update api_key usage for ${id}: ${error.message}; fallback fetch failed: ${fetchError.message}`);
    }

    const nextCount = Number(existing?.call_count || 0) + 1;
    const { error: updateError } = await this.supabase
      .from('api_key')
      .update({
        last_used: new Date().toISOString(),
        call_count: nextCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      throw new Error(`Failed to update api_key usage for ${id}: ${error.message}; fallback update failed: ${updateError.message}`);
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
