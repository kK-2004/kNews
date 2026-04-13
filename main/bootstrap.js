'use strict';

const { getSupabase } = require('../database/connection');
const { initDatabase } = require('../database/init');

const UserRepository = require('../core/user/user-repository');
const UserService = require('../core/user/user-service');
const SourceRepository = require('../core/source/source-repository');
const SourceService = require('../core/source/source-service');
const FeedRepository = require('../core/feed/feed-repository');
const FeedService = require('../core/feed/feed-service');
const ApiKeyRepository = require('../core/auth/api-key-repository');
const AuthContext = require('../core/auth/auth-context');
const SessionPersistence = require('../core/auth/session-persistence');
const SettingsRepository = require('../core/config/settings-repository');
const ScraperEngine = require('../core/scraper/scraper-engine');
const { sources } = require('../core/scraper/sources');
const McpServer = require('../core/mcp/mcp-server');
const LocalCacheRepository = require('../core/cache/local-cache-repository');
const PreferenceRepository = require('../core/preference/preference-repository');
const SubscriptionRepository = require('../core/subscription/subscription-repository');
const PaymentService = require('../core/subscription/payment-service');
const SubscriptionService = require('../core/subscription/subscription-service');

/**
 * Application bootstrap – wires every layer together.
 *
 * @param {Object} electronDeps
 * @param {Object} electronDeps.safeStorage - Electron safeStorage module
 * @param {Object} electronDeps.shell      - Electron shell module
 * @returns {Promise<Object>} All created instances
 */
async function bootstrap({ safeStorage, shell }) {
  console.log('[bootstrap] Starting application...');

  // 1. Supabase connection
  console.log('[bootstrap] Connecting to Supabase...');
  const supabase = await getSupabase();

  // 2. Verify database tables (only in dev when DB_CHECK=true)
  if (process.env.DB_CHECK === 'true') {
    console.log('[bootstrap] Verifying database tables...');
    const dbStatus = await initDatabase(supabase);
    if (!dbStatus.ok) {
      console.error('[bootstrap] Database verification failed. Missing tables:', dbStatus.missing);
      throw new Error(
        `Database tables missing: ${dbStatus.missing.join(', ')}. ` +
        'Run migrations via the Supabase SQL editor or CLI.',
      );
    }
  }

  // 3. Local cache
  const localCache = new LocalCacheRepository();

  // 4. Repositories
  const userRepo = new UserRepository(supabase);
  const sourceRepo = new SourceRepository(supabase);
  const feedRepo = new FeedRepository(localCache);
  const apiKeyRepo = new ApiKeyRepository(supabase);
  const settingsRepo = new SettingsRepository(supabase);
  const prefRepo = new PreferenceRepository(supabase, localCache);

  // 5. Services
  const userService = new UserService(userRepo);
  const sourceService = new SourceService(sourceRepo);
  const subscriptionRepo = new SubscriptionRepository(supabase);
  const paymentService = new PaymentService();
  const subscriptionService = new SubscriptionService({
    subscriptionRepo,
    paymentService,
    userRepo,
    apiKeyRepo,
  });

  // 6. ScraperEngine (created before FeedService so we can pass it)
  const scraperEngine = new ScraperEngine({
    sources,
    feedRepository: feedRepo,
    sourceRepository: sourceRepo,
    localCache,
  });

  const feedService = new FeedService(sourceRepo, feedRepo, scraperEngine);

  // 7. AuthContext + SessionPersistence
  const sessionPersistence = new SessionPersistence({ safeStorage });
  const clientId = (await settingsRepo.get('github_client_id')) || process.env.GITHUB_CLIENT_ID || '';
  const authContext = new AuthContext({
    userRepo,
    userService,
    supabase,
    clientId,
    shell,
  });

  // 8. Sync sources to database (for MCP / admin views) — only insert new ones
  console.log('[bootstrap] Syncing sources to database...');
  const { data: existingRows } = await supabase.from('source').select('id');
  const existingIds = new Set((existingRows || []).map((r) => r.id));
  let syncedCount = 0;
  for (const src of sources) {
    if (existingIds.has(src.id)) continue;
    await supabase.from('source').insert({
      id: src.id,
      name: src.name,
      url: src.url,
      category: src.category,
      enabled: src.enabled !== false,
      config: JSON.stringify(src.config || {}),
      updated_at: new Date().toISOString(),
    });
    syncedCount++;
  }
  console.log(`[bootstrap] Synced ${syncedCount} new sources (${existingIds.size} already existed).`);

  // 9. Schedule ScraperEngine — only force scrape if cache is empty or stale (>1h)
  const forceInitialScrape = scraperEngine.shouldInitialScrape();
  console.log(`[bootstrap] Initial scrape needed: ${forceInitialScrape}`);
  scraperEngine.schedule({ forceInitialScrape });

  // 10. McpServer
  console.log('[bootstrap] Starting McpServer...');
  const mcpServer = new McpServer({
    sourceService,
    feedService,
    apiKeyRepository: apiKeyRepo,
  });
  await mcpServer.start();

  // 11. Restore session (with expiration check)
  console.log('[bootstrap] Restoring session...');
  try {
    const savedSession = await sessionPersistence.loadValidSession();
    if (savedSession) {
      authContext.session = savedSession;
      console.log('[bootstrap] Session restored.');
    } else {
      console.log('[bootstrap] No valid session found.');
    }
  } catch (err) {
    console.warn('[bootstrap] Failed to restore session:', err.message);
  }

  console.log('[bootstrap] Application started successfully.');

  return {
    supabase,
    userRepo,
    sourceRepo,
    feedRepo,
    apiKeyRepo,
    settingsRepo,
    userService,
    prefRepo,
    sourceService,
    feedService,
    authContext,
    sessionPersistence,
    scraperEngine,
    mcpServer,
    localCache,
    subscriptionService,
  };
}

module.exports = { bootstrap };
