// Run this with: wrangler d1 execute knew --remote --file=./migrations/0002_seed_sources.sql
// Or generate the SQL file first

import { listKnownSourceIds } from '../server/getters.js'
import { NEWSNOW_SOURCES } from '../shared/newsnow-original/sources.js'

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

const rows = normalizeSourceEntries()
const ts = Date.now()

// Generate SQL INSERT statements
console.log('-- Seed sources data')
console.log('DELETE FROM source;') // Clear existing data

for (const row of rows) {
  const values = [
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
  ].map(v => `'${String(v).replace(/'/g, "''")}'`).join(', ')

  console.log(`INSERT INTO source (id, name, title, type, column_name, home, color, interval, redirect, url, category, enabled, created, updated) VALUES (${values});`)
}
