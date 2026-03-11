import { randomBytes } from 'node:crypto'

export class ApiKeyTable {
  constructor(db) {
    this.db = db
  }

  async init() {
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS api_key (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        key_hash TEXT NOT NULL UNIQUE,
        name TEXT,
        is_active INTEGER DEFAULT 1,
        last_used INTEGER,
        call_count INTEGER DEFAULT 0,
        created INTEGER NOT NULL,
        updated INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user(id)
      );
    `).run()
    await this.db.prepare('CREATE INDEX IF NOT EXISTS idx_api_key_user ON api_key(user_id)').run()
    await this.db.prepare('CREATE INDEX IF NOT EXISTS idx_api_key_hash ON api_key(key_hash)').run()
  }

  async createKey(userId, keyHash, name = null) {
    const id = randomBytes(16).toString('hex')
    const now = Date.now()
    await this.db.prepare(`
      INSERT INTO api_key (id, user_id, key_hash, name, is_active, last_used, call_count, created, updated)
      VALUES (?, ?, ?, ?, 1, NULL, 0, ?, ?)
    `).run(id, userId, keyHash, name, now, now)

    return {
      id,
      user_id: userId,
      key_hash: keyHash,
      name,
      is_active: 1,
      last_used: null,
      call_count: 0,
      created: now,
      updated: now
    }
  }

  async getKeysByUserId(userId) {
    return this.db.prepare(`
      SELECT id, name, is_active, last_used, call_count, created
      FROM api_key
      WHERE user_id = ? AND is_active = 1
      ORDER BY created DESC
    `).all(userId)
  }

  async listActiveKeys() {
    return this.db.prepare('SELECT * FROM api_key WHERE is_active = 1').all()
  }

  async deleteKey(id, userId) {
    const now = Date.now()
    const before = await this.db.prepare('SELECT id FROM api_key WHERE id = ? AND user_id = ? AND is_active = 1').get(id, userId)
    if (!before) return false
    await this.db.prepare('UPDATE api_key SET is_active = 0, updated = ? WHERE id = ? AND user_id = ?').run(now, id, userId)
    return true
  }

  async updateUsage(keyHash) {
    const now = Date.now()
    await this.db.prepare(`
      UPDATE api_key
      SET call_count = call_count + 1, last_used = ?, updated = ?
      WHERE key_hash = ?
    `).run(now, now, keyHash)
  }
}
