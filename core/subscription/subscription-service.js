'use strict';

const crypto = require('node:crypto');

/** Fallback used when settings table is empty or JSON parse fails */
const FALLBACK_LEVEL_PERMISSIONS = {
  0: { rate_limit: 3, max_count: 5 },
  1: { rate_limit: 20, max_count: 10 },
  2: { rate_limit: -1, max_count: 50 },
};

/** Plan name → level mapping */
const PLAN_LEVELS = {
  free: 0,
  plus: 1,
  pro: 2,
};

class SubscriptionService {
  /**
   * @param {Object} deps
   * @param {import('./subscription-repository')} deps.subscriptionRepo
   * @param {import('./payment-service')} deps.paymentService
   * @param {import('../user/user-repository')} deps.userRepo
   * @param {import('../auth/api-key-repository')} deps.apiKeyRepo
   * @param {import('../config/settings-repository')} [deps.settingsRepo]
   */
  constructor({ subscriptionRepo, paymentService, userRepo, apiKeyRepo, settingsRepo }) {
    this.subscriptionRepo = subscriptionRepo;
    this.paymentService = paymentService;
    this.userRepo = userRepo;
    this.apiKeyRepo = apiKeyRepo;
    this.settingsRepo = settingsRepo;
  }

  /**
   * Create a new subscription for a user.
   * - Expires current active subscription (if any)
   * - Processes payment via PaymentService
   * - Creates new subscription record
   * - Updates user level
   * - Syncs MCP API Key permissions
   *
   * @param {number} userId
   * @param {string} plan - 'free' | 'plus' | 'pro'
   * @returns {Promise<Object>} Created subscription
   */
  async createSubscription(userId, plan) {
    const targetLevel = PLAN_LEVELS[plan];
    if (targetLevel === undefined) {
      throw new Error(`Unknown plan: ${plan}`);
    }

    // Check for duplicate active subscription with same plan
    const current = await this.subscriptionRepo.findActiveByUserId(userId);
    if (current && current.plan === plan) {
      return current;
    }

    // Expire current subscription if exists
    if (current) {
      await this.subscriptionRepo.expireById(current.id);
    }

    // Process payment (mock 3s delay)
    await this.paymentService.processPayment({
      userId,
      plan,
      amount: this._getPrice(plan),
    });

    // Create new subscription
    const subscription = await this.subscriptionRepo.create({
      id: crypto.randomUUID(),
      user_id: userId,
      plan,
      level: targetLevel,
      status: 'active',
      started_at: new Date().toISOString(),
      expires_at: this._calculateExpiry(),
    });

    // Update user level
    await this.userRepo.update(userId, { level: targetLevel });

    // Sync MCP API Key permissions
    await this._syncApiKeyPermissions(userId, targetLevel);

    return subscription;
  }

  /**
   * Get the current subscription for a user.
   * Returns active subscription or Free default info.
   *
   * @param {number} userId
   * @returns {Promise<Object>}
   */
  async getCurrentSubscription(userId) {
    const active = await this.subscriptionRepo.findActiveByUserId(userId);

    if (active) {
      return {
        plan: active.plan,
        level: active.level,
        status: active.status,
        expires_at: active.expires_at,
      };
    }

    return {
      plan: 'free',
      level: 0,
      status: 'active',
      expires_at: null,
    };
  }

  /**
   * Get price for a plan.
   * @param {string} plan
   * @returns {number}
   */
  _getPrice(plan) {
    const prices = { free: 0, plus: 5, pro: 15 };
    return prices[plan] || 0;
  }

  /**
   * Calculate expiry date (30 days from now for paid plans).
   * @returns {string|null}
   */
  _calculateExpiry() {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString();
  }

  /**
   * Sync MCP API Key permissions based on user level.
   * @param {number} userId
   * @param {number} level
   */
  async _syncApiKeyPermissions(userId, level) {
    const allPermissions = await this._getLevelPermissions();
    const permissions = allPermissions[level];
    if (!permissions) return;

    const keys = await this.apiKeyRepo.findActiveByUserId(userId);
    const supabase = this.apiKeyRepo.supabase;
    const now = new Date().toISOString();

    for (const key of keys) {
      const { error } = await supabase
        .from('api_key')
        .update({
          rate_limit: permissions.rate_limit,
          max_count: permissions.max_count,
          updated_at: now,
        })
        .eq('id', key.id);

      if (error) {
        throw new Error(`Failed to sync API key ${key.id}: ${error.message}`);
      }
    }
  }

  /**
   * Read level permissions from settings table, fallback to hardcoded defaults.
   * @returns {Promise<Object<number, {rate_limit: number, max_count: number}>>}
   */
  async _getLevelPermissions() {
    if (!this.settingsRepo) return FALLBACK_LEVEL_PERMISSIONS;
    try {
      const raw = await this.settingsRepo.get('level_permissions');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (_e) {
      // fall through to fallback
    }
    return FALLBACK_LEVEL_PERMISSIONS;
  }
}

module.exports = SubscriptionService;
