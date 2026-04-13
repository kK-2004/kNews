'use strict';

const crypto = require('node:crypto');

const HASH_SALT = 'knews_api_key_salt';

const LEVEL_PERMISSIONS = {
  0: { rate_limit: 3, max_count: 5 },
  1: { rate_limit: 20, max_count: 10 },
  2: { rate_limit: -1, max_count: 50 },
};

function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(String(apiKey) + HASH_SALT).digest('hex');
}

/**
 * Register IPC handlers for admin operations.
 *
 * @param {Electron.IpcMain} ipcMain
 * @param {Object} deps
 */
function register(ipcMain, { sourceRepo, userRepo, apiKeyRepo, authContext }) {
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
          rateLimitRph: k.rate_limit || 100,
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
      const levelPerm = LEVEL_PERMISSIONS[userLevel] || LEVEL_PERMISSIONS[0];
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
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        keys: (data || []).map((k) => ({
          id: k.id,
          name: k.name || '未命名 Key',
          username: k.users?.nickname || '未知',
          key: k.id,
          rateLimitRph: k.rate_limit || 100,
          callCount: k.call_count || 0,
          call_count: k.call_count || 0,
          lastCallTime: k.last_used || null,
          last_used: k.last_used || null,
          active: k.is_active,
          source_ids: typeof k.source_scope === 'string' ? JSON.parse(k.source_scope) : (Array.isArray(k.source_scope) ? k.source_scope : []),
          max_count: k.max_count || 10,
        })),
      };
    } catch (err) {
      return { keys: [], error: err.message };
    }
  });

  ipcMain.handle('admin:deleteApiKey', async (_event, id) => {
    try {
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

  // --- Analytics ---

  ipcMain.handle('admin:getAnalytics', async (_event, params) => {
    try {
      const { start, end } = params || {};
      // Return empty analytics for now — can be expanded with a usage_logs table
      return {
        hourly: [],
        leaderboard: { items: [], hour: '' },
        total: 0,
      };
    } catch (err) {
      return { hourly: [], leaderboard: { items: [], hour: '' }, total: 0, error: err.message };
    }
  });
}

module.exports = { register };
