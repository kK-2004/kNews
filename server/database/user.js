export class UserTable {
  constructor(db) {
    this.db = db
  }

  async init() {
    await this.db.prepare(`
      CREATE TABLE IF NOT EXISTS user (
        id TEXT PRIMARY KEY,
        email TEXT,
        data TEXT,
        type TEXT,
        created INTEGER,
        updated INTEGER
      )
    `).run()
  }

  async upsertUser({ id, email, type = 'github' }) {
    const now = Date.now()
    const current = await this.db.prepare('SELECT id FROM user WHERE id = ?').get(id)
    if (current) {
      await this.db.prepare('UPDATE user SET email = ?, type = ?, updated = ? WHERE id = ?').run(email, type, now, id)
      return
    }

    await this.db.prepare('INSERT INTO user (id, email, data, type, created, updated) VALUES (?, ?, ?, ?, ?, ?)').run(id, email, '', type, now, now)
  }
}
