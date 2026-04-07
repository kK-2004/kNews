'use strict';

/**
 * Register IPC handlers for authentication.
 *
 * Channels:
 *   auth:initiateGithub  - Start GitHub Device Flow, returns {user_code, verification_uri}
 *   auth:completeGithub   - Poll for token, returns session
 *   auth:sendMagicLink   - Send Magic Link email via Supabase
 *   auth:verifyMagicLink - Verify Magic Link token -> session
 *   auth:logout          - Logout + clear persisted session
 *   auth:getSession      - Returns current session
 *
 * @param {Electron.IpcMain} ipcMain
 * @param {Object} deps
 */
function register(ipcMain, { authContext, sessionPersistence, supabase, mainWindow, focusMainWindow }) {
  // --- GitHub Device Flow (split into initiate + complete) ---
  let pendingDeviceFlow = null;

  ipcMain.handle('auth:initiateGithub', async (event) => {
    try {
      console.log('[auth] Starting GitHub Device Flow...');
      const strategy = authContext.createStrategy('github');
      const initiated = await strategy.initiate();

      // Store for later completion
      pendingDeviceFlow = {
        strategy,
        device_code: initiated.device_code,
        user_code: initiated.user_code,
        interval: initiated.interval,
        sender: event.sender,
        abortController: new AbortController(),
      };

      return {
        user_code: initiated.user_code,
        verification_uri: initiated.verification_uri || 'https://github.com/login/device',
      };
    } catch (err) {
      console.error('[auth] GitHub initiate failed:', err.message);
      return { error: err.message };
    }
  });

  ipcMain.handle('auth:openGithubBrowser', async () => {
    if (pendingDeviceFlow?.strategy) {
      try {
        await pendingDeviceFlow.strategy.openBrowserAfterDelay();
      } catch (err) {
        console.error('[auth] Failed to open browser:', err.message);
      }
    }
    return { success: true };
  });

  ipcMain.handle('auth:completeGithub', async () => {
    if (!pendingDeviceFlow) {
      return { error: 'No pending GitHub login. Please start again.' };
    }

    const { strategy, device_code, interval, abortController } = pendingDeviceFlow;

    try {
      const userInfo = await strategy.validate({ device_code, interval, signal: abortController.signal });
      const user = await strategy.syncUser(userInfo);
      const session = await strategy.createSession({ ...userInfo, id: user.id, level: user.level });

      if (sessionPersistence && session) {
        await sessionPersistence.saveSession(session);
      }
      authContext.session = session;
      pendingDeviceFlow = null;

      if (focusMainWindow) focusMainWindow();

      console.log('[auth] GitHub login successful');
      return session;
    } catch (err) {
      console.error('[auth] GitHub complete failed:', err.message);
      return { error: err.message };
    } finally {
      pendingDeviceFlow = null;
    }
  });

  ipcMain.handle('auth:cancelGithub', async () => {
    if (pendingDeviceFlow?.abortController) {
      pendingDeviceFlow.abortController.abort();
      pendingDeviceFlow = null;
      console.log('[auth] GitHub Device Flow cancelled by user');
    }
    return { cancelled: true };
  });

  // --- Magic Link ---

  ipcMain.handle('auth:sendMagicLink', async (_event, email) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: 'knews://auth/callback',
        },
      });
      if (error) {
        return { error: error.message };
      }
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('auth:verifyMagicLink', async (_event, { token, refreshToken }) => {
    try {
      const session = await authContext.login('magic-link', { token, refreshToken });
      if (sessionPersistence) {
        await sessionPersistence.saveSession(session);
      }
      return session;
    } catch (err) {
      return { error: err.message };
    }
  });

  // --- Session management ---

  ipcMain.handle('auth:logout', async () => {
    try {
      authContext.logout();
      pendingDeviceFlow = null;
      if (sessionPersistence) {
        await sessionPersistence.clearSession();
      }
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('auth:getSession', async () => {
    try {
      return authContext.getSession();
    } catch (err) {
      return { error: err.message };
    }
  });
}

module.exports = { register };
