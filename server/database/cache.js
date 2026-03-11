export class CacheTable {
  constructor(db) {
    this.db = db
  }

  async init() {
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS cache (
        id TEXT PRIMARY KEY,
        updated INTEGER,
        data TEXT
      )
    `).run()
  }

  async set(key, items) {
    const now = Date.now()
    await this.db.prepare('INSERT OR REPLACE INTO cache (id, data, updated) VALUES (?, ?, ?)').run(key, JSON.stringify(items), now)
  }

  async get(key) {
    const row = await this.db.prepare('SELECT id, data, updated FROM cache WHERE id = ?').get(key)
    if (!row) return undefined
    return {
      id: row.id,
      updated: row.updated,
      items: JSON.parse(row.data)
    }
  }
}
