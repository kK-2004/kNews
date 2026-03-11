import { getD1Tables } from './db.d1.js'
import { getEnv } from './runtime-env.js'

class D1LikeStatement {
  constructor(stmt) {
    this.stmt = stmt
    this.params = []
  }

  bind(...params) {
    this.params = params
    return this
  }

  async run() {
    this.stmt.run(...this.params)
    return { success: true }
  }

  async first() {
    return this.stmt.get(...this.params) || null
  }

  async all() {
    return { results: this.stmt.all(...this.params) || [] }
  }
}

class D1LikeDatabase {
  constructor(db) {
    this.db = db
  }

  prepare(sql) {
    return new D1LikeStatement(this.db.prepare(sql))
  }
}

let localDb = null
let localTablesPromise = null

function resolveDbPath() {
  const configured = getEnv('KNEWS_DB_PATH', '.data/knews.sqlite')
  const cwd = globalThis?.process?.cwd?.() || '.'
  return `${cwd}/${configured}`.replace(/\\/g, '/')
}

async function initBetterSqlite3() {
  const betterSqlite3 = await import(/* @vite-ignore */ ('better' + '-sqlite3'))
  const fsMod = await import(/* @vite-ignore */ ('node:' + 'fs'))
  const pathMod = await import(/* @vite-ignore */ ('node:' + 'path'))
  const dbPath = resolveDbPath()
  const absPath = pathMod.resolve(dbPath)
  fsMod.mkdirSync(pathMod.dirname(absPath), { recursive: true })
  const sqlite = new betterSqlite3.default(absPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  return new D1LikeDatabase(sqlite)
}

export async function getLocalDatabase() {
  if (localDb) return localDb

  localDb = await initBetterSqlite3()

  return localDb
}

export async function getLocalTables() {
  if (!localTablesPromise) {
    const db = await getLocalDatabase()
    localTablesPromise = getD1Tables(db)
  }
  return localTablesPromise
}
