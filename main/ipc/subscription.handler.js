'use strict';

/**
 * Register IPC handlers for subscription operations.
 *
 * Channels:
 *   subscription:getCurrent  - get current subscription for logged-in user
 *   subscription:create       - create/upgrade subscription with mock payment
 *
 * @param {Electron.IpcMain} ipcMain
 * @param {Object} deps
 * @param {import('../../core/subscription/subscription-service')} deps.subscriptionService
 * @param {import('../../core/auth/auth-context')} deps.authContext
 */
function register(ipcMain, { subscriptionService, authContext }) {
  ipcMain.handle('subscription:getCurrent', async () => {
    try {
      const session = authContext.getSession();
      if (!session?.userId) {
        return { error: 'Not authenticated' };
      }
      const subscription = await subscriptionService.getCurrentSubscription(session.userId);
      return subscription;
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('subscription:create', async (_event, { plan }) => {
    try {
      const session = authContext.getSession();
      if (!session?.userId) {
        return { error: 'Not authenticated' };
      }
      if (!plan) {
        return { error: 'plan is required' };
      }
      const subscription = await subscriptionService.createSubscription(session.userId, plan);
      return { success: true, subscription };
    } catch (err) {
      return { error: err.message };
    }
  });
}

module.exports = { register };
