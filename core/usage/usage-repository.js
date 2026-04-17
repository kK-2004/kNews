'use strict';

/**
 * Get the current UTC hour string in format "YYYY-MM-DD HH".
 * @returns {string}
 */
function getCurrentUtcHour() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const h = String(now.getUTCHours()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}`;
}

/**
 * Convert a millisecond timestamp to a UTC hour string "YYYY-MM-DD HH".
 * @param {number} ts
 * @returns {string}
 */
function tsToUtcHour(ts) {
  const d = new Date(ts);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}`;
}

class UsageRepository {
  /**
   * @param {import('@supabase/supabase-js').SupabaseClient} supabase
   */
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * Increment the hourly usage counter for an API key.
   * Creates a new record if none exists for the current hour.
   *
   * @param {string} apiKeyId - The api_key id
   * @returns {Promise<void>}
   */
  async incrementHourly(apiKeyId) {
    const hourStr = getCurrentUtcHour();

    // Try RPC first (atomic upsert)
    const { error } = await this.supabase.rpc('increment_usage', {
      key_id: apiKeyId,
      hour_str: hourStr,
    });
    if (!error) return;

    // Fallback: JS-side upsert
    const crypto = require('node:crypto');
    const { data: existing, error: fetchErr } = await this.supabase
      .from('usage')
      .select('id, call_count')
      .eq('api_key_id', apiKeyId)
      .eq('hour', hourStr)
      .maybeSingle();

    if (fetchErr) {
      console.error('[UsageRepo] fetch error:', fetchErr.message);
      return;
    }

    if (existing) {
      const { error: updateErr } = await this.supabase
        .from('usage')
        .update({
          call_count: (existing.call_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (updateErr) console.error('[UsageRepo] update error:', updateErr.message);
    } else {
      const { error: insertErr } = await this.supabase
        .from('usage')
        .insert({
          id: crypto.randomUUID(),
          api_key_id: apiKeyId,
          hour: hourStr,
          call_count: 1,
        });
      if (insertErr) console.error('[UsageRepo] insert error:', insertErr.message);
    }
  }

  /**
   * Query hourly usage data within a time range.
   *
   * @param {number} startTs - Start timestamp in ms
   * @param {number} endTs - End timestamp in ms
   * @param {{ keyId?: string }} [options]
   * @returns {Promise<Array<{hour: string, calls: number}>>}
   */
  async findByRange(startTs, endTs, options = {}) {
    const startHour = tsToUtcHour(startTs);
    const endHour = tsToUtcHour(endTs);

    let query = this.supabase
      .from('usage')
      .select('hour, call_count')
      .gte('hour', startHour)
      .lte('hour', endHour)
      .order('hour', { ascending: true });

    if (options.keyId) {
      query = query.eq('api_key_id', options.keyId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[UsageRepo] findByRange error:', error.message);
      return [];
    }

    // Aggregate by hour (in case multiple keys, sum per hour)
    const map = new Map();
    for (const row of data || []) {
      const h = row.hour;
      map.set(h, (map.get(h) || 0) + (row.call_count || 0));
    }

    return Array.from(map.entries())
      .map(([hour, calls]) => ({ hour, calls }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }
}

module.exports = UsageRepository;