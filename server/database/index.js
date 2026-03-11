import { CacheTable } from './cache'
import { ApiKeyTable } from './api-key'
import { SourceTable } from './source'
import { UserTable } from './user'

export async function createDatabase(db) {
  const cache = new CacheTable(db)
  const apiKey = new ApiKeyTable(db)
  const source = new SourceTable(db)
  const user = new UserTable(db)

  await cache.init()
  await apiKey.init()
  await source.init()
  await user.init()

  return { cache, apiKey, source, user }
}
