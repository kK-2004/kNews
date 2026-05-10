'use strict';

const { app, BrowserWindow, Menu, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');
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
let bootstrapDone = false;
let quitConfirmed = false;
const appIconPath = path.join(__dirname, '..', 'renderer-dist', 'logo.png');

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

  mainWindow.on('close', async (event) => {
    if (quitConfirmed || isQuitting) return;

    event.preventDefault();
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['退出', '取消'],
      defaultId: 1,
      cancelId: 1,
      title: '退出 K-News',
      message: '确定要退出 K-News 吗？',
      detail: '退出后后台抓取、MCP 服务和当前会话会停止。',
      noLink: true,
    });

    if (result.response !== 0) return;
    quitConfirmed = true;
    app.quit();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function hasLocalCache() {
  const cacheDir = path.join(os.homedir(), '.knews', 'cache');
  try {
    if (!fs.existsSync(cacheDir)) return false;
    const files = fs.readdirSync(cacheDir);
    return files.some((f) => f.endsWith('.json'));
  } catch {
    return false;
  }
}

function loadHtmlScreen(title, message, detail = '') {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);
  const safeDetail = escapeHtml(detail);
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f7f7f7;
      --surface: #ffffff;
      --text: #171717;
      --muted: #666666;
      --border: #dddddd;
      --primary: #111111;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0d0d0d;
        --surface: #161616;
        --text: #f5f5f5;
        --muted: #a9a9a9;
        --border: #303030;
        --primary: #f5f5f5;
      }
    }
    * { box-sizing: border-box; }
    body {
      align-items: center;
      background: var(--bg);
      color: var(--text);
      display: flex;
      font-family: "Inter", "IBM Plex Sans", "Segoe UI", sans-serif;
      height: 100vh;
      justify-content: center;
      margin: 0;
    }
    main {
      align-items: center;
      display: grid;
      gap: 1rem;
      justify-items: center;
      max-width: 28rem;
      padding: 2rem;
      text-align: center;
    }
    .spinner {
      animation: spin 0.9s linear infinite;
      border: 2px solid var(--border);
      border-top-color: var(--primary);
      border-radius: 999px;
      height: 1.5rem;
      width: 1.5rem;
    }
    h1 {
      font-size: 1.35rem;
      line-height: 1.25;
      margin: 0;
    }
    p {
      color: var(--muted);
      font-size: 0.92rem;
      line-height: 1.7;
      margin: 0;
    }
    .detail {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      color: var(--muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.78rem;
      line-height: 1.5;
      max-width: 100%;
      overflow-wrap: anywhere;
      padding: 0.75rem;
      text-align: left;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <main>
    ${safeDetail ? '' : '<div class="spinner" aria-hidden="true"></div>'}
    <h1>${safeTitle}</h1>
    <p>${safeMessage}</p>
    ${safeDetail ? `<div class="detail">${safeDetail}</div>` : ''}
  </main>
</body>
</html>`;
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

function loadInitializingScreen() {
  loadHtmlScreen('正在初始化 K-News', '正在连接服务并准备本地数据，完成后会自动进入应用。');
}

function loadStartupErrorScreen(error) {
  const message = error instanceof Error ? error.message : String(error || '未知错误');
  loadHtmlScreen('初始化失败', '连接 Supabase 或启动本地服务时出现问题。请检查网络和配置后重启应用。', message);
}

function loadAppScreen() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer-dist', 'index.html'));
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
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(appIconPath);
  }

  if (process.platform === 'win32') {
    Menu.setApplicationMenu(null);
  }

  createWindow();

  // First-time users (no local cache) see the initializing screen
  // Returning users (with cache) go straight to the app for instant load
  const cached = hasLocalCache();
  if (cached) {
    loadAppScreen();
  } else {
    loadInitializingScreen();
  }

  // Register minimal IPC handler for bootstrap status immediately
  const { ipcMain: earlyIpc } = require('electron');
  earlyIpc.handle('bootstrap:status', () => ({ ready: bootstrapDone }));

  // Fallback: catch unregistered invoke channels before bootstrap completes
  // Returns a structured error instead of crashing
  const fallbackHandler = (e, ...args) => {
    if (!bootstrapDone) {
      return { error: 'Service not ready', retry: true };
    }
  };
  // Register fallback for channels that renderer calls on mount
  const earlyChannels = [
    'auth:getSession', 'user:profile', 'sources:list',
    'user:getPreferences', 'feeds:get', 'feeds:getCachedBatch'
  ];
  for (const ch of earlyChannels) {
    earlyIpc.handle(ch, fallbackHandler);
  }

  // macOS: handle deep link when app is already running
  app.on('open-url', (event, urlStr) => {
    event.preventDefault();
    handleDeepLinkCallback(urlStr);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      if (instances || hasLocalCache()) loadAppScreen();
      else loadInitializingScreen();
    }
  });

  // Bootstrap in background — renderer shows cached data while initializing
  try {
    instances = await bootstrap({
      safeStorage: require('electron').safeStorage,
      shell: require('electron').shell,
    });

    const { ipcMain } = require('electron');
    // Remove fallback handlers before registering real ones
    for (const ch of earlyChannels) {
      ipcMain.removeHandler(ch);
    }
    registerIpcHandlers(ipcMain, instances);
    bootstrapDone = true;

    // Notify renderer that bootstrap is complete
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('bootstrap:done');
    }

    // If user is on initializing screen (first-time), switch to app screen
    if (!cached && mainWindow && !mainWindow.isDestroyed()) {
      loadAppScreen();
    }

    if (pendingDeepLink) {
      handleDeepLinkCallback(pendingDeepLink);
    }
  } catch (err) {
    console.error('[main] Bootstrap failed:', err.message);
    bootstrapDone = true;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('bootstrap:error', err instanceof Error ? err.message : String(err));
      // Show error screen for first-time users who were on initializing screen
      if (!cached) {
        loadStartupErrorScreen(err);
      }
    }
  }
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
