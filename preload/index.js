const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  auth: {
    initiateGithub: () => ipcRenderer.invoke("auth:initiateGithub"),
    openGithubBrowser: () => ipcRenderer.invoke("auth:openGithubBrowser"),
    completeGithub: () => ipcRenderer.invoke("auth:completeGithub"),
    cancelGithub: () => ipcRenderer.invoke("auth:cancelGithub"),
    login: (provider) => ipcRenderer.invoke("auth:login", provider),
    sendMagicLink: (email) => ipcRenderer.invoke("auth:sendMagicLink", email),
    verifyMagicLink: (payload) => ipcRenderer.invoke("auth:verifyMagicLink", payload),
    onMagicLinkSuccess: (callback) => {
      const handler = (_event, session) => callback(session);
      ipcRenderer.on("auth:magic-link-success", handler);
      return () => ipcRenderer.removeListener("auth:magic-link-success", handler);
    },
    onMagicLinkError: (callback) => {
      const handler = (_event, message) => callback(message);
      ipcRenderer.on("auth:magic-link-error", handler);
      return () => ipcRenderer.removeListener("auth:magic-link-error", handler);
    },
    logout: () => ipcRenderer.invoke("auth:logout"),
    getSession: () => ipcRenderer.invoke("auth:getSession"),
  },

  feeds: {
    get: (options) => ipcRenderer.invoke("feeds:get", options),
    getBySource: (sourceId, options) =>
      ipcRenderer.invoke("feeds:getBySource", sourceId, options),
    getCachedBatch: (sourceIds) =>
      ipcRenderer.invoke("feeds:getCachedBatch", sourceIds),
  },

  sources: {
    list: () => ipcRenderer.invoke("sources:list"),
    get: (id) => ipcRenderer.invoke("sources:get", id),
    create: (data) => ipcRenderer.invoke("sources:create", data),
    update: (id, data) => ipcRenderer.invoke("sources:update", id, data),
    delete: (id) => ipcRenderer.invoke("sources:delete", id),
  },

  scraper: {
    refreshAll: () => ipcRenderer.invoke("scraper:refreshAll"),
    refreshOne: (sourceId) => ipcRenderer.invoke("scraper:refreshOne", sourceId),
    getStatus: () => ipcRenderer.invoke("scraper:getStatus"),
    cacheStatus: (sourceIds) => ipcRenderer.invoke("scraper:cacheStatus", sourceIds),
  },

  user: {
    profile: () => ipcRenderer.invoke("user:profile"),
    update: (data) => ipcRenderer.invoke("user:update", data),
    getPreferences: () => ipcRenderer.invoke("user:getPreferences"),
    savePreferences: (preferences) => ipcRenderer.invoke("user:savePreferences", preferences),
  },

  admin: {
    listDatasources: () => ipcRenderer.invoke("admin:listDatasources"),
    createApiKey: (payload) => ipcRenderer.invoke("admin:createApiKey", payload),
    createDatasource: (payload) => ipcRenderer.invoke("admin:createDatasource", payload),
    updateDatasource: (id, payload) => ipcRenderer.invoke("admin:updateDatasource", id, payload),
    deleteDatasource: (id) => ipcRenderer.invoke("admin:deleteDatasource", id),
    updateDatasourceScope: (sourceIds) => ipcRenderer.invoke("admin:updateDatasourceScope", sourceIds),
    listUsers: (params) => ipcRenderer.invoke("admin:listUsers", params),
    setUserBlacklist: (id, blacklisted) => ipcRenderer.invoke("admin:setUserBlacklist", id, blacklisted),
    listUserKeys: (id) => ipcRenderer.invoke("admin:listUserKeys", id),
    listApiKeys: (params) => ipcRenderer.invoke("admin:listApiKeys", params),
    deleteApiKey: (id) => ipcRenderer.invoke("admin:deleteApiKey", id),
    updateApiKey: (id, payload) => ipcRenderer.invoke("admin:updateApiKey", id, payload),
    updateApiKeyRateLimit: (id, rateLimitRph) => ipcRenderer.invoke("admin:updateApiKeyRateLimit", id, rateLimitRph),
    getAnalytics: (params) => ipcRenderer.invoke("admin:getAnalytics", params),
    getLevelPermissions: () => ipcRenderer.invoke("admin:getLevelPermissions"),
    updateLevelPermissions: (data) => ipcRenderer.invoke("admin:updateLevelPermissions", data),
  },

  userActions: {
    bookmark: (articleId, active) => ipcRenderer.invoke("userActions:bookmark", articleId, active),
    like: (articleId, active) => ipcRenderer.invoke("userActions:like", articleId, active),
    share: (articleId, channel) => ipcRenderer.invoke("userActions:share", articleId, channel),
  },

  mcp: {
    getHealth: () => ipcRenderer.invoke("mcp:getHealth"),
  },

  subscription: {
    getCurrent: () => ipcRenderer.invoke("subscription:getCurrent"),
    create: (plan) => ipcRenderer.invoke("subscription:create", { plan }),
  },

  chat: {
    listSessions: () => ipcRenderer.invoke("chat:listSessions"),
    getSession: (sessionId) => ipcRenderer.invoke("chat:getSession", sessionId),
    createSession: () => ipcRenderer.invoke("chat:createSession"),
    sendMessage: (sessionId, content, isHotTopic) =>
      ipcRenderer.invoke("chat:sendMessage", { sessionId, content, isHotTopic }),
    deleteSession: (sessionId) => ipcRenderer.invoke("chat:deleteSession", sessionId),
    sendMessageStream: (sessionId, content, isHotTopic, callbacks) => {
      const { onStatus, onThinking, onToken, onTopicSummary, onDone, onError } = callbacks;
      const handler = (_event, streamEvent) => {
        switch (streamEvent.type) {
          case "status":
            if (onStatus) onStatus(streamEvent);
            break;
          case "thinking":
            if (onThinking) onThinking(streamEvent.text);
            break;
          case "token":
            if (onToken) onToken(streamEvent.text);
            break;
          case "topic-summary":
            if (onTopicSummary) onTopicSummary(streamEvent);
            break;
          case "done":
            ipcRenderer.removeListener("chat:streamEvent", handler);
            if (onDone) onDone(streamEvent.userMessage, streamEvent.assistantMessage, streamEvent.aborted);
            break;
          case "error":
            ipcRenderer.removeListener("chat:streamEvent", handler);
            if (onError) onError(streamEvent.error);
            break;
        }
      };
      ipcRenderer.on("chat:streamEvent", handler);
      ipcRenderer.send("chat:sendMessageStream", { sessionId, content, isHotTopic });
      return () => {
        ipcRenderer.removeListener("chat:streamEvent", handler);
      };
    },
    abortStream: () => ipcRenderer.send("chat:abortStream"),
  },
});
