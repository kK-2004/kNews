'use strict';

/**
 * Register IPC handlers for user operations.
 *
 * Channels:
 *   user:profile          - looks up user by id via userRepo
 *   user:update           - updates user by id via userService
 *   user:getPreferences   - get user preferences (cache-first, fallback DB)
 *   user:savePreferences  - save user preferences (DB first, invalidate cache)
 *
 * @param {Electron.IpcMain} ipcMain
 * @param {Object} deps
 * @param {import('../../core/user/user-repository')} deps.userRepo
 * @param {import('../../core/user/user-service')} deps.userService
 * @param {import('../../core/preference/preference-repository')} deps.prefRepo
 * @param {import('../../core/auth/api-key-repository')} deps.apiKeyRepo
 * @param {import('../../core/auth/auth-context')} deps.authContext
 */
function register(ipcMain, { userRepo, userService, prefRepo, apiKeyRepo, authContext }) {
  ipcMain.handle('user:profile', async (_event, userId) => {
    try {
      // The preload currently sends no argument for profile.
      // Support both cases: if userId is provided, look up by it;
      // otherwise fall back to the session user.
      if (userId) {
        return await userRepo.findById(userId);
      }
      const session = authContext.getSession();
      if (!session?.userId) return null;
      return await userRepo.findById(session.userId);
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('user:update', async (_event, data) => {
    try {
      const { id, ...updateData } = data;
      if (!id) {
        return { error: 'user:update requires an id field' };
      }
      return await userService.userRepository.update(id, updateData);
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('user:getPreferences', async () => {
    try {
      const session = authContext.getSession();
      if (!session?.userId) return { preferences: {} };
      const data = await prefRepo.findByUserId(session.userId);
      return { preferences: data || {} };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('user:savePreferences', async (_event, preferences) => {
    try {
      const session = authContext.getSession();
      if (!session?.userId) return { ok: false, error: 'Not authenticated' };
      const normalizedPreferences = await normalizePreferencesForSave(session.userId, preferences, apiKeyRepo);
      await prefRepo.upsert(session.userId, normalizedPreferences);
      return { ok: true };
    } catch (err) {
      return { error: err.message };
    }
  });
}

async function normalizePreferencesForSave(userId, preferences, apiKeyRepo) {
  if (!preferences || typeof preferences !== 'object') {
    return preferences;
  }

  const rawPerSourceCount = preferences?.assistant?.perSourceCount;
  if (rawPerSourceCount === undefined) {
    return preferences;
  }

  const normalizedPerSourceCount = Math.floor(Number(rawPerSourceCount));
  if (!Number.isFinite(normalizedPerSourceCount) || normalizedPerSourceCount < 1) {
    throw new Error('perSourceCount 必须是大于 0 的整数');
  }

  const defaultKey = await apiKeyRepo?.findDefaultByUserId?.(userId);
  const maxCount = Math.floor(Number(defaultKey?.max_count));
  if (Number.isFinite(maxCount) && maxCount > 0 && normalizedPerSourceCount > maxCount) {
    throw new Error(`perSourceCount 不能超过当前 default key 的 max_count（${maxCount}）`);
  }

  return {
    ...preferences,
    assistant: {
      ...(preferences.assistant || {}),
      perSourceCount: normalizedPerSourceCount,
    },
  };
}

module.exports = { register };
