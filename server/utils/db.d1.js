import { NEWSNOW_SOURCES } from './newsnow-sources.js'
import { listKnownSourceIds } from '../getters.js'

function now() {
  return Date.now()
}

function jsonParse(value, fallback) {
  try {
    return JSON.parse(String(value || ''))
  } catch {
    return fallback
  }
}

function randomHex(bytes = 16) {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  return Array.from(arr, (v) => v.toString(16).padStart(2, '0')).join('')
}

async function run(db, sql, params = []) {
  return db.prepare(sql).bind(...params).run()
}

async function first(db, sql, params = []) {
  return db.prepare(sql).bind(...params).first()
}

async function all(db, sql, params = []) {
  const result = await db.prepare(sql).bind(...params).all()
  return Array.isArray(result?.results) ? result.results : []
}

function normalizeSourceEntries() {
  const supported = new Set(listKnownSourceIds())
  return Object.entries(NEWSNOW_SOURCES || {})
    .filter(([id]) => !String(id).includes('-'))
    .map(([id, meta]) => {
      const redirect = String(meta?.redirect || '')
      const supportedByProvider = supported.has(String(id)) || (redirect && supported.has(redirect))
      return {
        id: String(id),
        name: String(meta?.name || id),
        title: String(meta?.title || ''),
        type: String(meta?.type || 'hottest'),
        column: String(meta?.column || 'china'),
        home: String(meta?.home || ''),
        color: String(meta?.color || 'blue'),
        interval: Number(meta?.interval || 600000),
        redirect,
        url: '',
        category: String(meta?.column || 'china'),
        enabled: supportedByProvider ? 1 : 0
      }
    })
}

async function ensureSchema(db) {
  await run(db, `
    CREATE TABLE IF NOT EXISTS cache (
      id TEXT PRIMARY KEY,
      updated INTEGER NOT NULL,
      data TEXT NOT NULL
    )
  `)
  await run(db, `
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      email TEXT,
      login TEXT,
      is_blacklisted INTEGER DEFAULT 0,
      type TEXT,
      created INTEGER NOT NULL,
      updated INTEGER NOT NULL
    )
  `)
  await run(db, `
    CREATE TABLE IF NOT EXISTS preference (
      user_id TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created INTEGER NOT NULL,
      updated INTEGER NOT NULL
    )
  `)
  await run(db, `
    CREATE TABLE IF NOT EXISTS api_key (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      key_plaintext TEXT,
      name TEXT,
      source_ids TEXT DEFAULT '[]',
      max_count INTEGER DEFAULT 12,
      rate_limit_rph INTEGER DEFAULT 100,
      is_active INTEGER DEFAULT 1,
      last_used INTEGER,
      call_count INTEGER DEFAULT 0,
      created INTEGER NOT NULL,
      updated INTEGER NOT NULL
    )
  `)
  await run(db, 'CREATE INDEX IF NOT EXISTS idx_api_key_user ON api_key(user_id)')
  await run(db, 'CREATE INDEX IF NOT EXISTS idx_api_key_hash ON api_key(key_hash)')

  await run(db, `
    CREATE TABLE IF NOT EXISTS github_login_audit (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      github_login TEXT NOT NULL,
      logged_in_at INTEGER NOT NULL,
      created INTEGER NOT NULL
    )
  `)
  await run(db, 'CREATE INDEX IF NOT EXISTS idx_login_audit_user ON github_login_audit(user_id)')
  await run(db, 'CREATE INDEX IF NOT EXISTS idx_login_audit_time ON github_login_audit(logged_in_at DESC)')

  await run(db, `
    CREATE TABLE IF NOT EXISTS api_usage_event (
      id TEXT PRIMARY KEY,
      api_key_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      called_at INTEGER NOT NULL,
      day TEXT NOT NULL,
      hour TEXT NOT NULL,
      created INTEGER NOT NULL
    )
  `)
  await run(db, 'CREATE INDEX IF NOT EXISTS idx_usage_event_called ON api_usage_event(called_at DESC)')
  await run(db, 'CREATE INDEX IF NOT EXISTS idx_usage_event_key_hour ON api_usage_event(api_key_id, hour)')

  await run(db, `
    CREATE TABLE IF NOT EXISTS source (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      title TEXT,
      type TEXT,
      column_name TEXT,
      home TEXT,
      color TEXT,
      interval INTEGER,
      redirect TEXT,
      url TEXT,
      category TEXT,
      enabled INTEGER DEFAULT 1,
      created INTEGER NOT NULL,
      updated INTEGER NOT NULL
    )
  `)
  await run(db, 'CREATE INDEX IF NOT EXISTS idx_source_enabled ON source(enabled)')

  await run(db, `
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated INTEGER NOT NULL
    )
  `)
}

async function seedSourcesIfNeeded(db) {
  const rows = normalizeSourceEntries()
  const ts = now()
  // Use batch INSERT for better performance on Cloudflare Workers
  // Group into batches of 20 to avoid hitting query size limits
  const batchSize = 20
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const placeholders = batch.map(() =>
      '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).join(', ')
    const values = batch.flatMap(row => [
      row.id,
      row.name,
      row.title,
      row.type,
      row.column,
      row.home,
      row.color,
      row.interval,
      row.redirect,
      row.url,
      row.category,
      row.enabled,
      ts,
      ts
    ])
    await run(db, `
      INSERT OR IGNORE INTO source (
        id, name, title, type, column_name, home, color, interval, redirect, url, category, enabled, created, updated
      ) VALUES ${placeholders}
    `, values)
  }
}

async function applySourceEnableMigrationIfNeeded(db) {
  const key = 'source_enabled_migration_v2'
  const meta = await first(db, 'SELECT value FROM app_meta WHERE key = ?', [key])
  if (meta?.value === 'done') return

  const rows = normalizeSourceEntries()
  const enabledIds = rows.filter((row) => row.enabled === 1).map((row) => row.id)
  const ts = now()

  await run(db, 'UPDATE source SET enabled = 0, updated = ?', [ts])
  for (const id of enabledIds) {
    await run(db, 'UPDATE source SET enabled = 1, updated = ? WHERE id = ?', [ts, id])
  }

  await run(db, `
    INSERT INTO app_meta (key, value, updated)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated = excluded.updated
  `, [key, 'done', ts])
}

function mapSourceRow(row) {
  if (!row) return null
  return {
    id: String(row.id),
    name: String(row.name || ''),
    title: String(row.title || ''),
    type: String(row.type || 'hottest'),
    column: String(row.column_name || 'china'),
    home: String(row.home || ''),
    color: String(row.color || 'blue'),
    interval: Number(row.interval || 600000),
    redirect: String(row.redirect || ''),
    url: String(row.url || ''),
    category: String(row.category || 'china'),
    enabled: Number(row.enabled || 0),
    created: Number(row.created || 0),
    updated: Number(row.updated || 0)
  }
}

function toKeyRow(row) {
  if (!row) return null
  return {
    ...row,
    source_ids: jsonParse(row.source_ids, []),
    max_count: Math.min(30, Math.max(1, Number(row.max_count) || 12)),
    rate_limit_rph: Math.max(1, Number(row.rate_limit_rph) || 100),
    is_active: Number(row.is_active || 0),
    last_used: row.last_used ? Number(row.last_used) : null,
    call_count: Number(row.call_count || 0),
    created: Number(row.created || 0),
    updated: Number(row.updated || 0)
  }
}

function toDayString(ts) {
  const date = new Date(ts)
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toHourString(ts) {
  const date = new Date(ts)
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  const h = String(date.getUTCHours()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}`
}

function createCacheTable(db) {
  return {
    async init() {},
    async set(key, items) {
      await run(db, `
        INSERT INTO cache (id, updated, data)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET updated = excluded.updated, data = excluded.data
      `, [String(key), now(), JSON.stringify(items || [])])
    },
    async get(key) {
      const row = await first(db, 'SELECT id, updated, data FROM cache WHERE id = ?', [String(key)])
      if (!row) return undefined
      return {
        id: String(row.id),
        updated: Number(row.updated || 0),
        items: jsonParse(row.data, [])
      }
    }
  }
}

function createUserTable(db) {
  return {
    async init() {},
    async getById(id) {
      const row = await first(db, 'SELECT id, email, login, is_blacklisted, type, created, updated FROM user WHERE id = ?', [String(id)])
      if (!row) return null
      return {
        ...row,
        is_blacklisted: Number(row.is_blacklisted || 0),
        created: Number(row.created || 0),
        updated: Number(row.updated || 0)
      }
    },
    async upsertUser({ id, email, login = '', type = 'github' }) {
      const uid = String(id)
      const existing = await this.getById(uid)
      const ts = now()
      if (existing) {
        await run(db, 'UPDATE user SET email = ?, login = ?, type = ?, updated = ? WHERE id = ?', [
          String(email || ''),
          String(login || existing.login || ''),
          String(type || 'github'),
          ts,
          uid
        ])
      } else {
        await run(db, 'INSERT INTO user (id, email, login, is_blacklisted, type, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?)', [
          uid,
          String(email || ''),
          String(login || ''),
          0,
          String(type || 'github'),
          ts,
          ts
        ])
      }
      return this.getById(uid)
    },
    async listForAdmin({ username = '', status = '', page = 1, pageSize = 10 } = {}) {
      const normalizedName = String(username || '').trim().toLowerCase()
      const normalizedStatus = String(status || '').trim().toLowerCase()
      const currentPage = Math.max(1, Number(page) || 1)
      const size = Math.max(1, Math.min(200, Number(pageSize) || 10))

      const users = await all(db, 'SELECT id, email, login, is_blacklisted, type, created, updated FROM user')
      const apiStats = await all(db, `
        SELECT user_id, COUNT(*) AS apikey_count, COALESCE(SUM(call_count), 0) AS total_calls
        FROM api_key
        WHERE is_active = 1
        GROUP BY user_id
      `)
      const loginStats = await all(db, `
        SELECT user_id, MAX(logged_in_at) AS last_login_at
        FROM github_login_audit
        GROUP BY user_id
      `)

      const apiMap = new Map(apiStats.map((row) => [String(row.user_id), row]))
      const loginMap = new Map(loginStats.map((row) => [String(row.user_id), row]))

      let merged = users.map((u) => {
        const uid = String(u.id)
        const stats = apiMap.get(uid) || {}
        const loginRow = loginMap.get(uid) || {}
        return {
          ...u,
          is_blacklisted: Number(u.is_blacklisted || 0),
          apikey_count: Number(stats.apikey_count || 0),
          total_calls: Number(stats.total_calls || 0),
          last_login_at: loginRow.last_login_at ? Number(loginRow.last_login_at) : null
        }
      })

      if (normalizedName) {
        merged = merged.filter((row) => (
          String(row.id || '').toLowerCase().includes(normalizedName)
          || String(row.email || '').toLowerCase().includes(normalizedName)
          || String(row.login || '').toLowerCase().includes(normalizedName)
        ))
      }

      if (normalizedStatus === 'blacklist') merged = merged.filter((row) => Number(row.is_blacklisted) === 1)
      if (normalizedStatus === 'normal') merged = merged.filter((row) => Number(row.is_blacklisted) !== 1)

      merged.sort((a, b) => Number(b.last_login_at || b.updated || 0) - Number(a.last_login_at || a.updated || 0))

      const total = merged.length
      const totalPages = Math.max(1, Math.ceil(total / size))
      const offset = (currentPage - 1) * size
      const items = merged.slice(offset, offset + size)

      return { items, total, page: currentPage, pageSize: size, totalPages }
    },
    async setBlacklisted(id, blacklisted) {
      const current = await this.getById(id)
      if (!current) return null
      await run(db, 'UPDATE user SET is_blacklisted = ?, updated = ? WHERE id = ?', [blacklisted ? 1 : 0, now(), String(id)])
      return this.getById(id)
    }
  }
}

function createPreferenceTable(db) {
  return {
    async init() {},
    async getByUserId(userId) {
      const row = await first(db, 'SELECT user_id, value, created, updated FROM preference WHERE user_id = ?', [String(userId)])
      if (!row) return null
      return {
        userId: String(row.user_id),
        value: jsonParse(row.value, {}),
        created: Number(row.created || 0),
        updated: Number(row.updated || 0)
      }
    },
    async setByUserId(userId, value) {
      const uid = String(userId)
      const current = await this.getByUserId(uid)
      const ts = now()
      await run(db, `
        INSERT INTO preference (user_id, value, created, updated)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET value = excluded.value, updated = excluded.updated
      `, [uid, JSON.stringify(value && typeof value === 'object' ? value : {}), Number(current?.created || ts), ts])
      return this.getByUserId(uid)
    }
  }
}

function createApiKeyTable(db) {
  return {
    async init() {},
    async createKey(userId, keyHash, keyPlaintext, name = null, sourceIds = [], maxCount = 12, rateLimitRph = 100) {
      const id = randomHex(16)
      const ts = now()
      const normalizedSourceIds = Array.isArray(sourceIds) ? sourceIds.map((item) => String(item || '')).filter(Boolean) : []
      const normalizedMaxCount = Math.min(30, Math.max(1, Number(maxCount) || 12))
      const normalizedRate = Math.max(1, Number(rateLimitRph) || 100)
      await run(db, `
        INSERT INTO api_key (id, user_id, key_hash, key_plaintext, name, source_ids, max_count, rate_limit_rph, is_active, last_used, call_count, created, updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NULL, 0, ?, ?)
      `, [
        id,
        String(userId),
        String(keyHash),
        String(keyPlaintext),
        name == null ? null : String(name),
        JSON.stringify(normalizedSourceIds),
        normalizedMaxCount,
        normalizedRate,
        ts,
        ts
      ])
      return {
        id,
        user_id: String(userId),
        key_hash: String(keyHash),
        key_plaintext: String(keyPlaintext),
        name,
        source_ids: normalizedSourceIds,
        max_count: normalizedMaxCount,
        rate_limit_rph: normalizedRate,
        is_active: 1,
        last_used: null,
        call_count: 0,
        created: ts,
        updated: ts
      }
    },
    async getKeysByUserId(userId) {
      const rows = await all(db, `
        SELECT id, name, source_ids, max_count, rate_limit_rph, is_active, last_used, call_count, key_plaintext, created, updated
        FROM api_key
        WHERE user_id = ? AND is_active = 1
        ORDER BY created DESC
      `, [String(userId)])
      return rows.map(toKeyRow)
    },
    async listActiveKeys() {
      return all(db, 'SELECT * FROM api_key WHERE is_active = 1')
    },
    async getById(id) {
      return toKeyRow(await first(db, 'SELECT * FROM api_key WHERE id = ?', [String(id)]))
    },
    async deleteKey(id, userId) {
      const existed = await first(db, 'SELECT id FROM api_key WHERE id = ? AND user_id = ? AND is_active = 1', [String(id), String(userId)])
      if (!existed) return false
      await run(db, 'UPDATE api_key SET is_active = 0, updated = ? WHERE id = ? AND user_id = ?', [now(), String(id), String(userId)])
      return true
    },
    async adminDeleteKey(id) {
      const existed = await first(db, 'SELECT id FROM api_key WHERE id = ?', [String(id)])
      if (!existed) return false
      await run(db, 'UPDATE api_key SET is_active = 0, updated = ? WHERE id = ?', [now(), String(id)])
      return true
    },
    async setRateLimit(id, rateLimitRph) {
      const key = await first(db, 'SELECT id FROM api_key WHERE id = ?', [String(id)])
      if (!key) return null
      const normalizedRate = Math.max(1, Number(rateLimitRph) || 100)
      await run(db, 'UPDATE api_key SET rate_limit_rph = ?, updated = ? WHERE id = ?', [normalizedRate, now(), String(id)])
      return this.getById(id)
    },
    async listForAdmin({ keyId = '' } = {}) {
      const normalizedKeyId = String(keyId || '').trim()
      const rows = await all(db, `
        SELECT
          ak.id,
          ak.user_id,
          ak.name,
          ak.source_ids,
          ak.max_count,
          ak.rate_limit_rph,
          ak.is_active,
          ak.last_used,
          ak.call_count,
          ak.created,
          ak.updated,
          ak.key_plaintext,
          u.login,
          u.email
        FROM api_key ak
        LEFT JOIN user u ON u.id = ak.user_id
        WHERE ak.is_active = 1
        ORDER BY ak.updated DESC
      `)
      return rows
        .map(toKeyRow)
        .filter((row) => !normalizedKeyId || row.id === normalizedKeyId)
        .map((row) => ({
          ...row,
          username: row.login || row.email || row.user_id
        }))
    },
    async listByUserForAdmin(userId) {
      const rows = await all(db, `
        SELECT
          id,
          user_id,
          name,
          source_ids,
          max_count,
          rate_limit_rph,
          is_active,
          last_used,
          call_count,
          created,
          updated,
          key_plaintext
        FROM api_key
        WHERE user_id = ? AND is_active = 1
        ORDER BY updated DESC
      `, [String(userId)])
      return rows.map(toKeyRow)
    },
    async updateUsage(keyHash) {
      const ts = now()
      await run(db, 'UPDATE api_key SET call_count = call_count + 1, last_used = ?, updated = ? WHERE key_hash = ?', [ts, ts, String(keyHash)])
      const key = await first(db, 'SELECT id, user_id FROM api_key WHERE key_hash = ? AND is_active = 1', [String(keyHash)])
      if (!key) return
      await run(db, `
        INSERT INTO api_usage_event (id, api_key_id, user_id, called_at, day, hour, created)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        crypto.randomUUID(),
        String(key.id),
        String(key.user_id),
        ts,
        toDayString(ts),
        toHourString(ts),
        ts
      ])
    },
    async getUsageAnalytics({ start, end, keyId = '' }) {
      const startTs = Number(start) || Date.now() - 7 * 24 * 60 * 60 * 1000
      const endTs = Number(end) || Date.now()
      const normalizedKeyId = String(keyId || '').trim()
      const dailyRows = await all(db, `
        SELECT day, COUNT(*) AS calls
        FROM api_usage_event
        WHERE called_at >= ? AND called_at <= ?
          AND (? = '' OR api_key_id = ?)
        GROUP BY day
        ORDER BY day ASC
      `, [startTs, endTs, normalizedKeyId, normalizedKeyId])
      const hourlyRows = await all(db, `
        SELECT hour, COUNT(*) AS calls
        FROM api_usage_event
        WHERE called_at >= ? AND called_at <= ?
          AND (? = '' OR api_key_id = ?)
        GROUP BY hour
        ORDER BY hour ASC
      `, [startTs, endTs, normalizedKeyId, normalizedKeyId])

      return {
        daily: dailyRows.map((row) => ({ date: String(row.day), calls: Number(row.calls || 0) })),
        hourly: hourlyRows.map((row) => ({ hour: String(row.hour), calls: Number(row.calls || 0) }))
      }
    },
    async getHourlyLeaderboard(limit = 20) {
      const latest = await first(db, 'SELECT hour FROM api_usage_event ORDER BY called_at DESC LIMIT 1')
      const hour = String(latest?.hour || '')
      if (!hour) return { hour: '', items: [] }
      const rows = await all(db, `
        SELECT
          e.api_key_id,
          e.user_id,
          COUNT(*) AS calls,
          ak.name AS key_name,
          u.login
        FROM api_usage_event e
        LEFT JOIN api_key ak ON ak.id = e.api_key_id
        LEFT JOIN user u ON u.id = e.user_id
        WHERE e.hour = ?
        GROUP BY e.api_key_id, e.user_id
        ORDER BY calls DESC
        LIMIT ?
      `, [hour, Math.max(1, Number(limit) || 20)])

      return {
        hour,
        items: rows.map((row) => ({
          apiKeyId: String(row.api_key_id),
          userId: String(row.user_id),
          calls: Number(row.calls || 0),
          apiKeyName: String(row.key_name || ''),
          username: String(row.login || row.user_id || '')
        }))
      }
    }
  }
}

function createSourceTable(db) {
  return {
    async init() {},
    async list() {
      const rows = await all(db, `
        SELECT id, name, title, type, column_name, home, color, interval, redirect, url, category, enabled, created, updated
        FROM source
        ORDER BY created ASC
      `)
      return rows.map(mapSourceRow)
    },
    async listEnabled() {
      const rows = await all(db, `
        SELECT id, name, title, type, column_name, home, color, interval, redirect, url, category, enabled, created, updated
        FROM source
        WHERE enabled = 1
        ORDER BY created ASC
      `)
      return rows.map(mapSourceRow)
    },
    async create(payload) {
      const id = String(payload?.id || crypto.randomUUID())
      const ts = now()
      await run(db, `
        INSERT INTO source (id, name, title, type, column_name, home, color, interval, redirect, url, category, enabled, created, updated)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        String(payload?.name || 'Untitled Source'),
        String(payload?.title || ''),
        String(payload?.type || 'hottest'),
        String(payload?.column || 'china'),
        String(payload?.home || ''),
        String(payload?.color || '#4d6bfe'),
        Number(payload?.interval || 600000),
        String(payload?.redirect || ''),
        String(payload?.url || ''),
        String(payload?.category || 'general'),
        payload?.enabled === false ? 0 : 1,
        ts,
        ts
      ])
      const row = await first(db, `
        SELECT id, name, title, type, column_name, home, color, interval, redirect, url, category, enabled, created, updated
        FROM source WHERE id = ?
      `, [id])
      return mapSourceRow(row)
    },
    async update(id, payload) {
      const current = await first(db, `
        SELECT id, name, title, type, column_name, home, color, interval, redirect, url, category, enabled, created, updated
        FROM source WHERE id = ?
      `, [String(id)])
      const base = mapSourceRow(current)
      if (!base) return null
      const ts = now()
      await run(db, `
        UPDATE source
        SET name = ?, title = ?, type = ?, column_name = ?, home = ?, color = ?, interval = ?, redirect = ?, url = ?, category = ?, enabled = ?, updated = ?
        WHERE id = ?
      `, [
        String(payload?.name ?? base.name),
        String(payload?.title ?? base.title),
        String(payload?.type ?? base.type),
        String(payload?.column ?? base.column),
        String(payload?.home ?? base.home),
        String(payload?.color ?? base.color),
        Number(payload?.interval ?? base.interval),
        String(payload?.redirect ?? base.redirect),
        String(payload?.url ?? base.url),
        String(payload?.category ?? base.category),
        payload?.enabled === undefined ? (base.enabled ? 1 : 0) : payload.enabled ? 1 : 0,
        ts,
        String(id)
      ])
      const updated = await first(db, `
        SELECT id, name, title, type, column_name, home, color, interval, redirect, url, category, enabled, created, updated
        FROM source WHERE id = ?
      `, [String(id)])
      return mapSourceRow(updated)
    },
    async remove(id) {
      const exists = await first(db, 'SELECT id FROM source WHERE id = ?', [String(id)])
      if (!exists) return false
      await run(db, 'DELETE FROM source WHERE id = ?', [String(id)])
      return true
    }
  }
}

function createAppMetaTable(db) {
  return {
    async init() {},
    async getJson(key, fallback = null) {
      const row = await first(db, 'SELECT value FROM app_meta WHERE key = ?', [String(key)])
      if (!row) return fallback
      return jsonParse(row.value, fallback)
    },
    async setJson(key, value) {
      await run(db, `
        INSERT INTO app_meta (key, value, updated)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated = excluded.updated
      `, [String(key), JSON.stringify(value), now()])
      return this.getJson(key, null)
    }
  }
}

function createLoginAuditTable(db) {
  return {
    async init() {},
    async recordLogin({ userId, githubLogin }) {
      const ts = now()
      await run(db, `
        INSERT INTO github_login_audit (id, user_id, github_login, logged_in_at, created)
        VALUES (?, ?, ?, ?, ?)
      `, [crypto.randomUUID(), String(userId), String(githubLogin || ''), ts, ts])
    },
    async listRecent(limit = 200) {
      const rows = await all(db, `
        SELECT id, user_id, github_login, logged_in_at, created
        FROM github_login_audit
        ORDER BY logged_in_at DESC
        LIMIT ?
      `, [Math.max(1, Number(limit) || 200)])
      return rows.map((row) => ({
        ...row,
        logged_in_at: Number(row.logged_in_at || 0),
        created: Number(row.created || 0)
      }))
    }
  }
}

let initPromise = null
let tablesPromise = null
let boundDb = null

// Flag to track if initialization has been done globally
// In Cloudflare Workers, we should skip auto-initialization
// and rely on the database being pre-initialized
let isInitialized = false

async function initDb(db) {
  if (!initPromise || boundDb !== db) {
    boundDb = db
    initPromise = (async () => {
      // Only ensure schema, skip auto-seeding in production
      // Sources should be pre-populated via migrations or admin API
      await ensureSchema(db)
      // Skip seedSourcesIfNeeded in Workers to avoid CPU timeout
      // await seedSourcesIfNeeded(db)
      // await applySourceEnableMigrationIfNeeded(db)
    })()
  }
  return initPromise
}

export function getD1Tables(db) {
  if (!db) {
    throw new Error('D1 binding `DB` is missing. Configure [[d1_databases]] in wrangler.toml.')
  }

  if (!tablesPromise || boundDb !== db) {
    tablesPromise = initDb(db).then(() => ({
      cache: createCacheTable(db),
      user: createUserTable(db),
      preference: createPreferenceTable(db),
      apiKey: createApiKeyTable(db),
      source: createSourceTable(db),
      appMeta: createAppMetaTable(db),
      loginAudit: createLoginAuditTable(db)
    }))
  }

  return tablesPromise
}
