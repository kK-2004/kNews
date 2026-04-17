'use strict';

const crypto = require('node:crypto');

const HASH_SALT = 'knews_api_key_salt';

/** Fallback used when settings table is empty or JSON parse fails */
const FALLBACK_LEVEL_PERMISSIONS = {
  0: { rate_limit: 3, max_count: 5 },
  1: { rate_limit: 20, max_count: 10 },
  2: { rate_limit: -1, max_count: 50 },
};

/**
 * Read level permissions from settings table, fallback to hardcoded defaults.
 * @param {import('../../core/config/settings-repository')} [settingsRepo]
 * @returns {Promise<Object<number, {rate_limit: number, max_count: number}>>}
 */
async function getLevelPermissions(settingsRepo) {
  if (!settingsRepo) return FALLBACK_LEVEL_PERMISSIONS;
  try {
    const raw = await settingsRepo.get('level_permissions');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (_e) {
    // fall through to fallback
  }
  return FALLBACK_LEVEL_PERMISSIONS;
}

function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(String(apiKey) + HASH_SALT).digest('hex');
}

/**
 * Register IPC handlers for admin operations.
 *
 * @param {Electron.IpcMain} ipcMain
 * @param {Object} deps
 */
function register(ipcMain, { sourceRepo, userRepo, apiKeyRepo, usageRepo, authContext, settingsRepo }) {
  // --- Datasources ---

  ipcMain.handle('admin:listDatasources', async () => {
    try {
      const items = await sourceRepo.findAll();
      return { items };
    } catch (err) {
      return { error: err.message, items: [] };
    }
  });

  ipcMain.handle('admin:createDatasource', async (_event, payload) => {
    try {
      const row = await sourceRepo.create(payload);
      return { ok: true, data: row };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('admin:updateDatasource', async (_event, id, payload) => {
    try {
      const row = await sourceRepo.update(id, payload);
      return { ok: true, data: row };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('admin:deleteDatasource', async (_event, id) => {
    try {
      await sourceRepo.delete(id);
      return { ok: true };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('admin:updateDatasourceScope', async (_event, sourceIds) => {
    try {
      // Enable only the selected sources, disable the rest
      const all = await sourceRepo.findAll();
      for (const source of all) {
        const enabled = sourceIds.includes(source.id);
        if (source.enabled !== enabled) {
          await sourceRepo.update(source.id, { enabled });
        }
      }
      return { ok: true };
    } catch (err) {
      return { error: err.message };
    }
  });

  // --- Users ---

  ipcMain.handle('admin:listUsers', async (_event, params) => {
    try {
      const { username, status, page = 1, pageSize = 10 } = params || {};
      let query = userRepo.supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (username) {
        query = query.ilike('nickname', `%${username}%`);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      // Fetch api_key counts per user
      const users = await Promise.all((data || []).map(async (u) => {
        const { data: keys } = await apiKeyRepo.supabase
          .from('api_key')
          .select('id, call_count')
          .eq('user_id', u.id);

        const apikeyCount = keys ? keys.length : 0;
        const totalCalls = keys ? keys.reduce((sum, k) => sum + (k.call_count || 0), 0) : 0;

        // Derive status from level: level < 0 means blacklisted
        const isBlacklisted = u.level < 0;

        return {
          id: u.id,
          username: u.nickname || u.email || '',
          apikeyCount,
          totalCalls,
          status: isBlacklisted ? 'blacklist' : 'normal',
          lastActive: u.updated_at || u.created_at,
        };
      }));

      const totalPages = Math.ceil((count || 0) / pageSize);

      return {
        users,
        loginAudits: [],
        pagination: { total: count || 0, totalPages, page, pageSize },
      };
    } catch (err) {
      return { users: [], loginAudits: [], pagination: { total: 0, totalPages: 1, page: 1, pageSize: 10 }, error: err.message };
    }
  });

  ipcMain.handle('admin:setUserBlacklist', async (_event, id, blacklisted) => {
    try {
      // Use level to indicate blacklist: -1 = blacklisted, 0 = normal
      const level = blacklisted ? -1 : 0;
      await userRepo.update(id, { level });
      return { ok: true };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('admin:listUserKeys', async (_event, userId) => {
    try {
      const keys = await apiKeyRepo.findActiveByUserId(userId);
      return {
        keys: (keys || []).map((k) => ({
          id: k.id,
          name: k.name || '未命名 Key',
          rateLimitRph: k.rate_limit ?? 100,
          callCount: k.call_count || 0,
          lastUsed: k.last_used || null,
        })),
      };
    } catch (err) {
      return { keys: [], error: err.message };
    }
  });

  // --- API Keys ---

  ipcMain.handle('admin:createApiKey', async (_event, payload) => {
    try {
      const session = authContext?.getSession?.();
      if (!session?.userId) {
        return { error: '请先登录' };
      }

      const { name, maxCount, sourceIds } = payload || {};
      if (!name) {
        return { error: 'Key 名称不能为空' };
      }

      // Resolve level permission ceiling
      const userLevel = session.level ?? 0;
      const levelPermissions = await getLevelPermissions(settingsRepo);
      const levelPerm = levelPermissions[userLevel] || levelPermissions[0];
      const ceilingRate = levelPerm.rate_limit < 0 ? Infinity : levelPerm.rate_limit;
      const ceilingCount = levelPerm.max_count < 0 ? Infinity : levelPerm.max_count;

      const effectiveRateLimit = Math.min(100, ceilingRate);
      const effectiveMaxCount = Math.min(maxCount || 10, ceilingCount);

      // Generate a random API key: knews_<random>
      const rawKey = `knews_${crypto.randomBytes(24).toString('hex')}`;
      const keyHash = hashApiKey(rawKey);

      const row = {
        id: crypto.randomUUID(),
        user_id: session.userId,
        key_hash: keyHash,
        name,
        is_active: true,
        source_scope: JSON.stringify(sourceIds || []),
        rate_limit: effectiveRateLimit,
        max_count: effectiveMaxCount,
        call_count: 0,
      };

      const { data, error } = await apiKeyRepo.supabase
        .from('api_key')
        .insert(row)
        .select()
        .single();

      if (error) throw error;

      // Return the raw key to the frontend (only shown once)
      return { ok: true, key: rawKey, data };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('admin:listApiKeys', async (_event, params) => {
    try {
      const session = authContext?.getSession?.();

      let query = apiKeyRepo.supabase
        .from('api_key')
        .select('*, users(nickname)')
        .order('created_at', { ascending: false });

      // Default: filter by current session user; pass { all: true } for admin page
      if (!params?.all && session?.userId) {
        query = query.eq('user_id', session.userId);
      } else if (!params?.all) {
        // Not logged in and not requesting all — return empty
        return { keys: [] };
      }

      if (params?.keyId) {
        query = query.eq('id', params.keyId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        keys: (data || []).map((k) => ({
          id: k.id,
          name: k.name || '未命名 Key',
          username: k.users?.nickname || '未知',
          rateLimitRph: k.rate_limit ?? 100,
          callCount: k.call_count || 0,
          call_count: k.call_count || 0,
          lastCallTime: k.last_used || null,
          last_used: k.last_used || null,
          active: k.is_active,
          is_default: k.is_default || false,
          source_ids: typeof k.source_scope === 'string' ? JSON.parse(k.source_scope) : (Array.isArray(k.source_scope) ? k.source_scope : []),
          max_count: k.max_count ?? 10,
        })),
      };
    } catch (err) {
      return { keys: [], error: err.message };
    }
  });

  ipcMain.handle('admin:deleteApiKey', async (_event, id) => {
    try {
      // Check if this is a default key — prevent deletion
      const { data: key, error: fetchErr } = await apiKeyRepo.supabase
        .from('api_key')
        .select('is_default')
        .eq('id', id)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      if (key?.is_default) {
        return { error: '默认 API Key 不可删除，但可以修改数据源。' };
      }

      const { error } = await apiKeyRepo.supabase
        .from('api_key')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { ok: true };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('admin:updateApiKeyRateLimit', async (_event, id, rateLimitRph) => {
    try {
      const { data, error } = await apiKeyRepo.supabase
        .from('api_key')
        .update({ rate_limit: rateLimitRph })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ok: true, data };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('admin:updateApiKey', async (_event, id, payload) => {
    try {
      const updates = {};
      if (payload.source_scope !== undefined) updates.source_scope = payload.source_scope;
      if (payload.name !== undefined) updates.name = payload.name;
      if (payload.max_count !== undefined) updates.max_count = payload.max_count;

      if (Object.keys(updates).length === 0) {
        return { error: '没有需要更新的字段' };
      }

      const { data, error } = await apiKeyRepo.supabase
        .from('api_key')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ok: true, data };
    } catch (err) {
      return { error: err.message };
    }
  });

  // --- Level Permissions ---

  ipcMain.handle('admin:getLevelPermissions', async () => {
    try {
      const data = await getLevelPermissions(settingsRepo);
      return { ok: true, data };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('admin:updateLevelPermissions', async (_event, payload) => {
    try {
      if (!payload || typeof payload !== 'object') {
        return { error: '参数格式错误' };
      }

      // Validate each level entry
      for (const [level, perm] of Object.entries(payload)) {
        if (!perm || typeof perm !== 'object') return { error: `参数格式错误: level ${level}` };
        if (typeof perm.rate_limit !== 'number' || typeof perm.max_count !== 'number') {
          return { error: `参数格式错误: level ${level} 的 rate_limit 和 max_count 必须为数字` };
        }
      }

      // Persist to settings table
      await settingsRepo.set('level_permissions', JSON.stringify(payload));

      // Sync all active API Keys
      const { data: activeKeys, error: fetchErr } = await apiKeyRepo.supabase
        .from('api_key')
        .select('id, user_id, users(level)')
        .eq('is_active', true);

      if (fetchErr) throw fetchErr;

      const now = new Date().toISOString();
      for (const key of activeKeys || []) {
        const userLevel = key.users?.level ?? 0;
        const perm = payload[userLevel];
        if (!perm) continue;

        const { error: updateErr } = await apiKeyRepo.supabase
          .from('api_key')
          .update({
            rate_limit: perm.rate_limit,
            max_count: perm.max_count,
            updated_at: now,
          })
          .eq('id', key.id);

        if (updateErr) {
          console.error(`[admin] Failed to sync API key ${key.id}:`, updateErr.message);
        }
      }

      return { ok: true };
    } catch (err) {
      return { error: err.message };
    }
  });

  // --- Analytics ---

  ipcMain.handle('admin:getAnalytics', async (_event, params) => {
    try {
      const startTs = Number(params?.start || 0);
      const endTs = Number(params?.end || Date.now());

      let query = apiKeyRepo.supabase
        .from('api_key')
        .select('id, name, call_count, last_used, users(nickname)')
        .eq('is_active', true)
        .order('call_count', { ascending: false });

      if (params?.keyId) {
        query = query.eq('id', params.keyId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const keys = (data || []).map((item) => ({
        id: item.id,
        apiKeyName: item.name || '未命名',
        username: item.users?.nickname || '未知',
        calls: Number(item.call_count || 0),
        lastUsed: item.last_used || null,
      }));

      const total = keys.reduce((sum, item) => sum + item.calls, 0);
      const leaderboardItems = keys.filter((item) => item.calls > 0).slice(0, 10);
      const hourLabelDate = Number.isFinite(endTs) ? new Date(endTs) : new Date();
      const leaderboardHour = `${hourLabelDate.getUTCFullYear()}-${String(hourLabelDate.getUTCMonth() + 1).padStart(2, '0')}-${String(hourLabelDate.getUTCDate()).padStart(2, '0')} ${String(hourLabelDate.getUTCHours()).padStart(2, '0')}`;

      const recentCalls = keys.filter((item) => {
        if (!item.lastUsed) return false;
        const ts = new Date(item.lastUsed).getTime();
        return Number.isFinite(ts) && ts >= startTs && ts <= endTs;
      }).length;

      // Query hourly usage data from usage table
      let hourly = [];
      if (usageRepo) {
        try {
          hourly = await usageRepo.findByRange(startTs, endTs, { keyId: params?.keyId || undefined });
        } catch (_e) {
          // non-critical – return empty hourly
        }
      }

      return {
        hourly,
        leaderboard: { items: leaderboardItems, hour: leaderboardHour, recentCalls },
        total,
      };
    } catch (err) {
      return { hourly: [], leaderboard: { items: [], hour: '' }, total: 0, error: err.message };
    }
  });
}

module.exports = { register };
