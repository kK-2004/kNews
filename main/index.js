'use strict';

const { app, BrowserWindow, Menu, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const url = require('url');
const dotenv = require('dotenv');

function loadEnvironment() {
  const envName = process.env.NODE_ENV || (app.isPackaged ? 'production' : '');
  const envFiles = envName
    ? [`.env.${envName}`, '.env']
    : ['.env'];
  const searchRoots = app.isPackaged
    ? [process.resourcesPath, path.dirname(process.execPath), process.cwd()]
    : [process.cwd()];

  for (const root of searchRoots) {
    for (const envFile of envFiles) {
      const envPath = path.join(root, envFile);
      if (!fs.existsSync(envPath)) continue;
      dotenv.config({ path: envPath });
      console.log(`[env] Loaded environment from ${envPath}`);
      return envPath;
    }
  }

  console.warn('[env] No .env file found in expected locations.');
  return null;
}

loadEnvironment();

const { bootstrap } = require('./bootstrap');

// IPC handler registrations
const { register: registerAuthHandlers } = require('./ipc/auth.handler');
const { register: registerFeedHandlers } = require('./ipc/feeds.handler');
const { register: registerSourceHandlers } = require('./ipc/sources.handler');
const { register: registerScraperHandlers } = require('./ipc/scraper.handler');
const { register: registerUserHandlers } = require('./ipc/user.handler');
const { register: registerAdminHandlers } = require('./ipc/admin.handler');
const { register: registerUserActionHandlers } = require('./ipc/user-actions.handler');
const { register: registerMcpHandlers } = require('./ipc/mcp.handler');
const { register: registerSubscriptionHandlers } = require('./ipc/subscription.handler');
const { register: registerChatHandlers } = require('./ipc/chat.handler');

let mainWindow = null;
let instances = null;
const appIconPath = path.join(__dirname, '..', 'renderer-dist', 'logo.png');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    icon: appIconPath,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer-dist', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// --- Window helpers ---

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  if (process.platform === 'darwin') {
    app.focus({ steal: true });
  }
}

// --- Deep Link (knews://) ---

const PROTOCOL = 'knews';

function registerDeepLinkProtocol() {
  if (process.defaultApp || process.env.NODE_ENV === 'development') {
    console.log('[deep-link] Skip protocol registration in development/defaultApp mode');
    return;
  }

  app.setAsDefaultProtocolClient(PROTOCOL);
}

async function handleDeepLinkCallback(deepLinkUrl) {
  try {
    console.log('[deep-link] Received URL:', deepLinkUrl);

    if (!deepLinkUrl.startsWith(`${PROTOCOL}://auth/callback`)) {
      console.warn('[deep-link] URL does not match expected path');
      return;
    }

    // Supabase puts tokens in hash fragment (#), not query string (?)
    // e.g. knews://auth/callback#access_token=eyJ...&refresh_token=xxx
    const hashIndex = deepLinkUrl.indexOf('#');
    const fragment = hashIndex !== -1 ? deepLinkUrl.slice(hashIndex + 1) : '';
    const parsed = url.parse(deepLinkUrl, true);
    const params = { ...parsed.query, ...Object.fromEntries(new URLSearchParams(fragment)) };

    if (params.error) {
      console.warn('[deep-link] Auth error:', params.error, params.error_description);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('auth:magic-link-error', params.error_description || params.error);
      }
      return;
    }

    const { access_token, refresh_token } = params;
    if (!access_token || !refresh_token) {
      console.warn('[deep-link] Missing tokens in callback URL. Params:', params);
      return;
    }

    if (!instances) {
      console.warn('[deep-link] App not ready, ignoring callback');
      return;
    }

    const { authContext, sessionPersistence } = instances;
    const strategy = authContext.createStrategy('magic-link');
    const userInfo = await strategy.validate({ token: access_token, refreshToken: refresh_token });
    const user = await strategy.syncUser(userInfo);
    const session = await strategy.createSession({ ...userInfo, id: user.id, level: user.level });

    if (sessionPersistence && session) {
      await sessionPersistence.saveSession(session);
    }
    authContext.session = session;

    console.log('[deep-link] Magic Link login successful');

    // Notify renderer + bring window to front
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('auth:magic-link-success', session);
      focusMainWindow();
    }
  } catch (err) {
    console.error('[deep-link] Error handling callback:', err.message);
  }
}

registerDeepLinkProtocol();

// Windows: deep link from first-instance command line (captured before ready)
const pendingDeepLink = process.argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));

// Windows: handle deep link when app is already running (second instance)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const deepLink = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
    if (deepLink) {
      handleDeepLinkCallback(deepLink);
    }
    focusMainWindow();
  });
}

function registerIpcHandlers(ipcMain, deps) {
  registerAuthHandlers(ipcMain, {
    authContext: deps.authContext,
    sessionPersistence: deps.sessionPersistence,
    supabase: deps.supabase,
    mainWindow,
    focusMainWindow,
  });

  registerFeedHandlers(ipcMain, {
    feedService: deps.feedService,
  });

  registerSourceHandlers(ipcMain, {
    sourceService: deps.sourceService,
  });

  registerScraperHandlers(ipcMain, {
    scraperEngine: deps.scraperEngine,
    authContext: deps.authContext,
    localCache: deps.localCache,
  });

  registerUserHandlers(ipcMain, {
    userRepo: deps.userRepo,
    userService: deps.userService,
    prefRepo: deps.prefRepo,
    apiKeyRepo: deps.apiKeyRepo,
    authContext: deps.authContext,
  });

  registerAdminHandlers(ipcMain, {
    sourceRepo: deps.sourceRepo,
    userRepo: deps.userRepo,
    apiKeyRepo: deps.apiKeyRepo,
    usageRepo: deps.usageRepo,
    authContext: deps.authContext,
    settingsRepo: deps.settingsRepo,
  });

  registerUserActionHandlers(ipcMain, {});

  registerMcpHandlers(ipcMain, {
    mcpServer: deps.mcpServer,
  });

  registerSubscriptionHandlers(ipcMain, {
    subscriptionService: deps.subscriptionService,
    authContext: deps.authContext,
  });

  registerChatHandlers(ipcMain, {
    chatService: deps.chatService,
  });
}

async function cleanup() {
  console.log('[main] Cleaning up...');

  if (instances) {
    if (instances.scraperEngine) {
      console.log('[main] Stopping ScraperEngine...');
      instances.scraperEngine.stop();
    }

    if (instances.mcpServer) {
      console.log('[main] Stopping McpServer...');
      try {
        await instances.mcpServer.stop();
      } catch (err) {
        console.error('[main] Error stopping McpServer:', err.message);
      }
    }

    instances = null;
  }
}

app.whenReady().then(async () => {
  try {
    // Bootstrap the application with Electron APIs
    instances = await bootstrap({
      safeStorage: require('electron').safeStorage,
      shell: require('electron').shell,
    });

    // Register IPC handlers with bootstrapped instances
    const { ipcMain } = require('electron');
    registerIpcHandlers(ipcMain, instances);

    // Handle deep link from Windows first-instance startup
    if (pendingDeepLink) {
      handleDeepLinkCallback(pendingDeepLink);
    }
  } catch (err) {
    console.error('[main] Bootstrap failed:', err.message);
    dialog.showErrorBox('Startup Error', err.message);
    app.quit();
    return;
  }

  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(appIconPath);
  }

  if (process.platform === 'win32') {
    Menu.setApplicationMenu(null);
  }

  createWindow();

  // macOS: handle deep link when app is already running
  app.on('open-url', (event, urlStr) => {
    event.preventDefault();
    handleDeepLinkCallback(urlStr);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

let isQuitting = false;

app.on('before-quit', (event) => {
  if (isQuitting) return;

  if (instances) {
    event.preventDefault();
    isQuitting = true;

    // Force-quit after 5s regardless of cleanup progress
    const forceTimer = setTimeout(() => {
      console.warn('[main] Cleanup timeout, forcing quit');
      app.exit(0);
    }, 5000);

    cleanup()
      .then(() => {
        clearTimeout(forceTimer);
        app.quit();
      })
      .catch((err) => {
        clearTimeout(forceTimer);
        console.error('[main] Cleanup error:', err);
        app.quit();
      });
  }
});
