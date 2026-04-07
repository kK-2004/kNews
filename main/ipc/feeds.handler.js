'use strict';

/**
 * Register IPC handlers for feeds.
 *
 * Channels:
 *   feeds:get          - getFeeds() -> all cached feeds
 *   feeds:getBySource  - getFeedsBySource(sourceId) -> cached feed for source
 *
 * @param {Electron.IpcMain} ipcMain
 * @param {Object} deps
 * @param {import('../../core/feed/feed-service')} deps.feedService
 */
function register(ipcMain, { feedService }) {
  ipcMain.handle('feeds:get', async (_event, options) => {
    try {
      return await feedService.getFeeds(options);
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('feeds:getBySource', async (_event, sourceId, options) => {
    try {
      return await feedService.getFeedsBySource(sourceId, options);
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('feeds:getCachedBatch', async (_event, sourceIds) => {
    try {
      const ids = Array.isArray(sourceIds) ? sourceIds : [];
      return await feedService.getCachedBatch(ids);
    } catch (err) {
      return { error: err.message };
    }
  });
}

module.exports = { register };
