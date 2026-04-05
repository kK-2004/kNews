'use strict';

/**
 * Register IPC handlers for source management.
 *
 * Channels:
 *   sources:list    - getSources()
 *   sources:get     - getSource(id)
 *   sources:create  - createSource(data)
 *   sources:update  - updateSource(id, data)
 *   sources:delete  - deleteSource(id)
 *
 * @param {Electron.IpcMain} ipcMain
 * @param {Object} deps
 * @param {import('../../core/source/source-service')} deps.sourceService
 */
function register(ipcMain, { sourceService }) {
  ipcMain.handle('sources:list', async () => {
    try {
      return await sourceService.getSources();
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('sources:get', async (_event, id) => {
    try {
      return await sourceService.getSource(id);
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('sources:create', async (_event, data) => {
    try {
      return await sourceService.createSource(data);
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('sources:update', async (_event, id, data) => {
    try {
      return await sourceService.updateSource(id, data);
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('sources:delete', async (_event, id) => {
    try {
      await sourceService.deleteSource(id);
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  });
}

module.exports = { register };
