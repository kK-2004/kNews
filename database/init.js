const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

const EXPECTED_TABLES = ['users', 'api_key', 'source', 'preference', 'settings', 'subscriptions'];

/**
 * Read all SQL migration files from the migrations/ directory in order.
 * Returns an array of { filename, sql } objects sorted by filename.
 */
function loadMigrations() {
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  return files.map(filename => ({
    filename,
    sql: fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf-8'),
  }));
}

/**
 * Verify that a table exists by attempting a SELECT LIMIT 0 against it.
 * Returns true if the table is accessible, false otherwise.
 */
async function verifyTableExists(supabase, tableName) {
  const { error } = await supabase
    .from(tableName)
    .select('*')
    .limit(0);

  if (error) {
    console.error(`[database/init] Table "${tableName}" check failed: ${error.message} (code: ${error.code})`);
  }
  return !error;
}

/**
 * Initialize the database: verify all expected tables exist.
 *
 * Since Supabase's JS client does not support raw DDL execution,
 * this function checks that the required tables are already created
 * (via Supabase dashboard, CLI, or SQL editor) and reports status.
 *
 * The SQL migration files in database/migrations/ should be run
 * manually in the Supabase SQL editor or via `supabase db push`.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<{ ok: boolean, tables: Record<string, boolean>, missing: string[] }>}
 */
async function initDatabase(supabase) {
  const migrations = loadMigrations();

  console.log(`[database/init] Found ${migrations.length} migration file(s):`);
  for (const m of migrations) {
    console.log(`[database/init]   - ${m.filename}`);
  }

  console.log('[database/init] Verifying tables...');
  const tables = {};
  const missing = [];

  for (const tableName of EXPECTED_TABLES) {
    const exists = await verifyTableExists(supabase, tableName);
    tables[tableName] = exists;
    const status = exists ? 'OK' : 'MISSING';
    console.log(`[database/init]   - ${tableName}: ${status}`);
    if (!exists) {
      missing.push(tableName);
    }
  }

  if (missing.length > 0) {
    console.error(
      `[database/init] Missing tables: ${missing.join(', ')}. ` +
      'Run the SQL migration files in database/migrations/ via the Supabase SQL editor or CLI.'
    );
  } else {
    console.log('[database/init] All tables verified successfully.');
  }

  return {
    ok: missing.length === 0,
    tables,
    missing,
  };
}

module.exports = { initDatabase, loadMigrations, EXPECTED_TABLES };
