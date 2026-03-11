import { randomUUID } from 'node:crypto'

const DEFAULT_SOURCES = [
  { id: 'hn', name: 'Hacker News', url: 'https://hnrss.org/frontpage', category: 'tech', enabled: 1 },
  { id: 'techcrunch', name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'tech', enabled: 1 },
  { id: 'verge', name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'tech', enabled: 1 },
  { id: 'bbc-world', name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'world', enabled: 1 }
]

export class SourceTable {
  constructor(db) {
    this.db = db
  }

  async init() {
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS source (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        category TEXT,
        enabled INTEGER DEFAULT 1,
        created INTEGER NOT NULL,
        updated INTEGER NOT NULL
      )
    `).run()
    await this.db.prepare('CREATE INDEX IF NOT EXISTS idx_source_enabled ON source(enabled)').run()
    await this.seedDefaults()
  }

  async seedDefaults() {
    const row = await this.db.prepare('SELECT COUNT(*) as count FROM source').get()
    if (Number(row?.count || 0) > 0) return

    const now = Date.now()
    for (const source of DEFAULT_SOURCES) {
      await this.db.prepare(`
        INSERT INTO source (id, name, url, category, enabled, created, updated)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(source.id, source.name, source.url, source.category, source.enabled, now, now)
    }
  }

  async list() {
    return this.db.prepare(`
      SELECT id, name, url, category, enabled, created, updated
      FROM source
      ORDER BY created ASC
    `).all()
  }

  async listEnabled() {
    return this.db.prepare(`
      SELECT id, name, url, category, enabled, created, updated
      FROM source
      WHERE enabled = 1
      ORDER BY created ASC
    `).all()
  }

  async create(payload) {
    const id = String(payload?.id || randomUUID())
    const now = Date.now()
    await this.db.prepare(`
      INSERT INTO source (id, name, url, category, enabled, created, updated)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      String(payload?.name || 'Untitled Source'),
      String(payload?.url || ''),
      String(payload?.category || 'general'),
      payload?.enabled === false ? 0 : 1,
      now,
      now
    )
    return this.db.prepare('SELECT id, name, url, category, enabled, created, updated FROM source WHERE id = ?').get(id)
  }

  async update(id, payload) {
    const current = await this.db.prepare('SELECT * FROM source WHERE id = ?').get(id)
    if (!current) return null
    const now = Date.now()
    await this.db.prepare(`
      UPDATE source
      SET name = ?, url = ?, category = ?, enabled = ?, updated = ?
      WHERE id = ?
    `).run(
      String(payload?.name ?? current.name),
      String(payload?.url ?? current.url),
      String(payload?.category ?? current.category),
      payload?.enabled === undefined ? Number(current.enabled) : payload.enabled ? 1 : 0,
      now,
      id
    )
    return this.db.prepare('SELECT id, name, url, category, enabled, created, updated FROM source WHERE id = ?').get(id)
  }

  async remove(id) {
    const existed = await this.db.prepare('SELECT id FROM source WHERE id = ?').get(id)
    if (!existed) return false
    await this.db.prepare('DELETE FROM source WHERE id = ?').run(id)
    return true
  }
}
