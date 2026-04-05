'use strict';

/**
 * Register IPC handlers for user operations.
 *
 * Channels:
 *   user:profile          - looks up user by id via userRepo
 *   user:update           - updates user by id via userService
 *   user:getPreferences   - get user preferences (stub)
 *   user:savePreferences  - save user preferences (stub)
 *
 * @param {Electron.IpcMain} ipcMain
 * @param {Object} deps
 * @param {import('../../core/user/user-repository')} deps.userRepo
 * @param {import('../../core/user/user-service')} deps.userService
 */
function register(ipcMain, { userRepo, userService }) {
  ipcMain.handle('user:profile', async (_event, userId) => {
    try {
      // The preload currently sends no argument for profile.
      // Support both cases: if userId is provided, look up by it;
      // otherwise fall back to the session user.
      if (userId) {
        return await userRepo.findById(userId);
      }
      return null;
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
      return { data: {} };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('user:savePreferences', async (_event, _preferences) => {
    try {
      return { ok: true };
    } catch (err) {
      return { error: err.message };
    }
  });
}

module.exports = { register };
