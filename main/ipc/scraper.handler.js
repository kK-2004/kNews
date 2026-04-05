'use strict';

/**
 * Register IPC handlers for the scraper engine.
 *
 * @param {Electron.IpcMain} ipcMain
 * @param {Object} deps
 * @param {import('../../core/scraper/scraper-engine')} deps.scraperEngine
 * @param {import('../../core/auth/auth-context')} [deps.authContext] - for future premium check
 */
function register(ipcMain, { scraperEngine, authContext }) {
  ipcMain.handle('scraper:refreshAll', async () => {
    try {
      // TODO: Premium gating — uncomment when ready:
      // const session = authContext?.getSession();
      // if (!session || (session.level ?? 0) < 1) {
      //   return { error: '此功能仅对高级用户开放' };
      // }

      await scraperEngine.refreshAll();
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('scraper:refreshOne', async (_event, sourceId) => {
    try {
      return await scraperEngine.refreshOne(sourceId);
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('scraper:getStatus', async () => {
    try {
      return {
        running: scraperEngine.isRunning(),
        sourceCount: scraperEngine.sources.size,
      };
    } catch (err) {
      return { error: err.message };
    }
  });
}

module.exports = { register };
