'use strict';

class PreferenceRepository {
  /**
   * @param {import('@supabase/supabase-js').SupabaseClient} supabase
   * @param {import('../cache/local-cache-repository')} localCache
   */
  constructor(supabase, localCache) {
    this.supabase = supabase;
    this.localCache = localCache;
  }

  /**
   * Find preferences for a user.
   * Reads local cache first, falls back to database.
   * @param {number} userId
   * @returns {Promise<Object|null>}
   */
  async findByUserId(userId) {
    const cacheKey = `pref:${userId}`;

    // 1. Try local cache
    const cached = this.localCache.read(cacheKey);
    if (cached) return cached.data;

    // 2. Fallback to database
    const { data: row, error } = await this.supabase
      .from('preference')
      .select('data')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find preference: ${error.message}`);
    }

    if (row?.data) {
      this.localCache.write(cacheKey, row.data);
      return row.data;
    }

    return null;
  }

  /**
   * Upsert preferences for a user.
   * Writes to database first, then invalidates local cache.
   * @param {number} userId
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async upsert(userId, data) {
    const rowId = `user:${userId}`;

    const { error } = await this.supabase
      .from('preference')
      .upsert({
        id: rowId,
        user_id: userId,
        data,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) {
      throw new Error(`Failed to save preference: ${error.message}`);
    }

    // Invalidate cache after successful DB write
    this.localCache.remove(`pref:${userId}`);
  }
}

module.exports = PreferenceRepository;
