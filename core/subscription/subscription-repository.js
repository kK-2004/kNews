'use strict';

class SubscriptionRepository {
  /**
   * @param {import('@supabase/supabase-js').SupabaseClient} supabase
   */
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * Find the current active subscription for a user.
   * @param {number} userId
   * @returns {Promise<Object|null>}
   */
  async findActiveByUserId(userId) {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find active subscription: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new subscription record.
   * @param {Object} record
   * @returns {Promise<Object>}
   */
  async create(record) {
    const { data, error } = await this.supabase
      .from('subscriptions')
      .insert(record)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create subscription: ${error.message}`);
    }

    return data;
  }

  /**
   * Mark a subscription as expired by ID.
   * @param {string} id
   * @returns {Promise<void>}
   */
  async expireById(id) {
    const { error } = await this.supabase
      .from('subscriptions')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to expire subscription ${id}: ${error.message}`);
    }
  }
}

module.exports = SubscriptionRepository;
