const { createClient } = require('@supabase/supabase-js');

let _supabase = null;

async function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'Missing environment variable SUPABASE_URL. ' +
      'Please set it in your .env file or environment.'
    );
  }

  if (!supabasePublishableKey) {
    throw new Error(
      'Missing environment variable SUPABASE_PUBLISHABLE_KEY. ' +
      'Please set it in your .env file or environment.'
    );
  }

  console.log(`[database] Connecting to ${supabaseUrl}`);
  console.log(`[database] Key prefix: ${supabasePublishableKey.substring(0, 10)}...`);

  const client = createClient(supabaseUrl, supabasePublishableKey);

  // Verify connection works
  const { error } = await client.from('settings').select('key').limit(1);
  if (error) {
    console.error(`[database] Connection test failed: ${error.message} (code: ${error.code})`);
  } else {
    console.log('[database] Connection test passed.');
  }

  return client;
}

async function getSupabase() {
  if (!_supabase) {
    _supabase = await createSupabaseClient();
  }
  return _supabase;
}

function resetSupabase() {
  _supabase = null;
}

module.exports = { getSupabase, resetSupabase };
