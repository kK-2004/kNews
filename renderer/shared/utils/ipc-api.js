/**
 * IPC API utility — thin wrapper around window.api exposed by the preload script.
 * Replaces the HTTP-based fetch.js for the Electron desktop app.
 */

function ensureApi() {
  if (!window?.api) {
    throw new Error('IPC bridge (window.api) is not available')
  }
  return window.api
}

function wrapError(err) {
  if (err instanceof Error) throw err
  throw new Error(err?.message || err || 'Unknown IPC error')
}

export const authApi = {
  login(provider) {
    return ensureApi().auth.login(provider).catch(wrapError)
  },
  loginOtp(email) {
    return ensureApi().auth.loginOtp(email).catch(wrapError)
  },
  logout() {
    return ensureApi().auth.logout().catch(wrapError)
  },
  getSession() {
    return ensureApi().auth.getSession().catch(wrapError)
  }
}

export const feedsApi = {
  get(options) {
    return ensureApi().feeds.get(options).catch(wrapError)
  },
  getBySource(sourceId, options) {
    return ensureApi().feeds.getBySource(sourceId, options).catch(wrapError)
  }
}

export const sourcesApi = {
  list() {
    return ensureApi().sources.list().catch(wrapError)
  },
  get(id) {
    return ensureApi().sources.get(id).catch(wrapError)
  },
  create(data) {
    return ensureApi().sources.create(data).catch(wrapError)
  },
  update(id, data) {
    return ensureApi().sources.update(id, data).catch(wrapError)
  },
  delete(id) {
    return ensureApi().sources.delete(id).catch(wrapError)
  }
}

export const scraperApi = {
  refreshAll() {
    return ensureApi().scraper.refreshAll().catch(wrapError)
  },
  refreshOne(sourceId) {
    return ensureApi().scraper.refreshOne(sourceId).catch(wrapError)
  },
  getStatus() {
    return ensureApi().scraper.getStatus().catch(wrapError)
  }
}

export const userApi = {
  profile() {
    return ensureApi().user.profile().catch(wrapError)
  },
  update(data) {
    return ensureApi().user.update(data).catch(wrapError)
  },
  getPreferences() {
    return ensureApi().user.getPreferences().catch(wrapError)
  },
  savePreferences(preferences) {
    return ensureApi().user.savePreferences(preferences).catch(wrapError)
  }
}

export const userActionsApi = {
  bookmark(articleId, active) {
    return ensureApi().userActions.bookmark(articleId, active).catch(wrapError)
  },
  like(articleId, active) {
    return ensureApi().userActions.like(articleId, active).catch(wrapError)
  },
  share(articleId, channel) {
    return ensureApi().userActions.share(articleId, channel).catch(wrapError)
  }
}

export const adminApi = {
  listDatasources() {
    return ensureApi().admin.listDatasources().catch(wrapError)
  },
  createApiKey(payload) {
    return ensureApi().admin.createApiKey(payload).catch(wrapError)
  },
  createDatasource(payload) {
    return ensureApi().admin.createDatasource(payload).catch(wrapError)
  },
  updateDatasource(id, payload) {
    return ensureApi().admin.updateDatasource(id, payload).catch(wrapError)
  },
  deleteDatasource(id) {
    return ensureApi().admin.deleteDatasource(id).catch(wrapError)
  },
  updateDatasourceScope(sourceIds) {
    return ensureApi().admin.updateDatasourceScope(sourceIds).catch(wrapError)
  },
  listUsers(params) {
    return ensureApi().admin.listUsers(params).catch(wrapError)
  },
  setUserBlacklist(id, blacklisted) {
    return ensureApi().admin.setUserBlacklist(id, blacklisted).catch(wrapError)
  },
  listUserKeys(id) {
    return ensureApi().admin.listUserKeys(id).catch(wrapError)
  },
  listApiKeys(params) {
    return ensureApi().admin.listApiKeys(params).catch(wrapError)
  },
  deleteApiKey(id) {
    return ensureApi().admin.deleteApiKey(id).catch(wrapError)
  },
  updateApiKey(id, payload) {
    return ensureApi().admin.updateApiKey(id, payload).catch(wrapError)
  },
  updateApiKeyRateLimit(id, rateLimitRph) {
    return ensureApi().admin.updateApiKeyRateLimit(id, rateLimitRph).catch(wrapError)
  },
  getAnalytics(params) {
    return ensureApi().admin.getAnalytics(params).catch(wrapError)
  },
  getLevelPermissions() {
    return ensureApi().admin.getLevelPermissions().catch(wrapError)
  },
  updateLevelPermissions(data) {
    return ensureApi().admin.updateLevelPermissions(data).catch(wrapError)
  }
}
