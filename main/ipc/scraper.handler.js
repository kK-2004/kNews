'use strict';

/**
 * Register IPC handlers for the scraper engine.
 *
 * @param {Electron.IpcMain} ipcMain
 * @param {Object} deps
 * @param {import('../../core/scraper/scraper-engine')} deps.scraperEngine
 * @param {import('../../core/auth/auth-context')} [deps.authContext] - for future premium check
 */
function register(ipcMain, { scraperEngine, authContext, localCache }) {
  ipcMain.handle('scraper:refreshAll', async () => {
    try {
      // TODO: Premium gating — uncomment when ready:
      // const session = authContext?.getSession();
      // if (!session || (session.level ?? 0) < 1) {
      //   return { error: '此功能仅对高级用户开放' };
      // }

      await scraperEngine.refreshAll({ force: true });
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

  /**
   * Return cache metadata (fetchedAt) for a list of source IDs.
   * Payload: { sourceIds: string[] }
   * Response: { [sourceId]: { cached: boolean, fetchedAt: number | null } }
   */
  ipcMain.handle('scraper:cacheStatus', async (_event, sourceIds) => {
    try {
      const ids = Array.isArray(sourceIds) ? sourceIds : [];
      const result = {};
      for (const id of ids) {
        const entry = localCache.read(id);
        result[id] = entry
          ? { cached: true, fetchedAt: entry.fetchedAt || null }
          : { cached: false, fetchedAt: null };
      }
      return result;
    } catch (err) {
      return { error: err.message };
    }
  });
}

module.exports = { register };
