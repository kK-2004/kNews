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
 * @param {import('../../core/auth/auth-context')} deps.authContext
 */
function register(ipcMain, { userRepo, userService, prefRepo, authContext }) {
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
      await prefRepo.upsert(session.userId, preferences);
      return { ok: true };
    } catch (err) {
      return { error: err.message };
    }
  });
}

module.exports = { register };
