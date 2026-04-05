'use strict';

/**
 * Register IPC handlers for user actions.
 *
 * Channels:
 *   userActions:bookmark - bookmark/unbookmark an article
 *   userActions:like     - like/unlike an article
 *   userActions:share    - record a share event for an article
 *
 * @param {Electron.IpcMain} ipcMain
 * @param {Object} deps
 */
function register(ipcMain, _deps) {
  ipcMain.handle('userActions:bookmark', async (_event, _articleId, _active) => {
    return { ok: true };
  });

  ipcMain.handle('userActions:like', async (_event, _articleId, _active) => {
    return { ok: true };
  });

  ipcMain.handle('userActions:share', async (_event, _articleId, _channel) => {
    return { ok: true };
  });
}

module.exports = { register };
