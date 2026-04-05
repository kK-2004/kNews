'use strict';

class SettingsRepository {
  /**
   * @param {import('@supabase/supabase-js').SupabaseClient} supabase
   */
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * Get a setting value by key.
   * @param {string} key
   * @returns {Promise<string|null>}
   */
  async get(key) {
    const { data, error } = await this.supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get setting "${key}": ${error.message}`);
    }

    return data ? data.value : null;
  }

  /**
   * Set a setting value (upsert).
   * @param {string} key
   * @param {string} value
   * @returns {Promise<void>}
   */
  async set(key, value) {
    const { error } = await this.supabase
      .from('settings')
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      );

    if (error) {
      throw new Error(`Failed to set setting "${key}": ${error.message}`);
    }
  }

  /**
   * Get all settings as a flat object.
   * @returns {Promise<Record<string, string>>}
   */
  async getAll() {
    const { data, error } = await this.supabase
      .from('settings')
      .select('key, value');

    if (error) {
      throw new Error(`Failed to get settings: ${error.message}`);
    }

    const result = {};
    for (const row of data || []) {
      result[row.key] = row.value;
    }
    return result;
  }
}

module.exports = SettingsRepository;
