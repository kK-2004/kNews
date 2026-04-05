'use strict';

/**
 * Register IPC handlers for MCP (Model Context Protocol) operations.
 *
 * Channels:
 *   mcp:getHealth - returns MCP server health status
 *
 * @param {Electron.IpcMain} ipcMain
 * @param {Object} deps
 * @param {import('../../core/mcp/mcp-server')} deps.mcpServer
 */
function register(ipcMain, { mcpServer }) {
  ipcMain.handle('mcp:getHealth', async () => {
    try {
      const uptime = mcpServer.startedAt
        ? Math.floor((Date.now() - mcpServer.startedAt) / 1000)
        : 0;
      return {
        status: mcpServer.server ? 'ok' : 'stopped',
        uptime,
        port: mcpServer.port,
      };
    } catch (err) {
      return { error: err.message };
    }
  });
}

module.exports = { register };
