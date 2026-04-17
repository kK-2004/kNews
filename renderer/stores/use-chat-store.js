import { defineStore } from 'pinia'
import { useToast } from '@/shared/composables/useToast'

export const useChatStore = defineStore('use-chat-store', {
  state: () => ({
    sessions: [],
    currentSessionId: null,
    messages: [],
    sending: false,
    activeStreamSessionId: null,
    error: null,
    statusEvents: [],
    streamingContent: null,
    pendingHotTopics: null,
    streamingThinking: '',
    thinkingExpanded: false,
    pendingAbort: false,
    summaryToastShown: false,
  }),
  getters: {
    currentSession: (state) =>
      state.sessions.find((s) => s.id === state.currentSessionId) || null,
    isCurrentSessionStreaming: (state) =>
      Boolean(state.sending && state.activeStreamSessionId && state.activeStreamSessionId === state.currentSessionId),
    latestStatusEvent: (state) =>
      state.statusEvents.length > 0 ? state.statusEvents[state.statusEvents.length - 1] : null,
    latestThinkingLine: (state) => {
      const text = (state.streamingThinking || '').trim()
      if (!text) return ''
      const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
      const latest = lines.length > 0 ? lines[lines.length - 1] : text
      return latest.length > 80 ? `${latest.slice(0, 80)}...` : latest
    },
  },
  actions: {
    normalizeAssistantContent(content) {
      return typeof content === 'string' ? content.replace(/\s+$/u, '') : ''
    },

    notifySingleSessionLimit() {
      const { error: toastError } = useToast()
      toastError('为了减缓llm请求压力，每个客户端仅支持同时一个会话。', { timeout: 4000 })
    },

    hasActiveGlobalStream() {
      return Boolean(this.sending || this.activeStreamSessionId)
    },

    updateTopicSummary(topicId, summary, summaryStatus = 'ready') {
      const applySummary = (topics) => {
        if (!topics?.sections) return false
        for (const section of topics.sections) {
          for (const item of section.items || []) {
            if ((item.topicId || item.id) === topicId) {
              item.summary = summary || ''
              item.summaryStatus = summaryStatus
              return true
            }
          }
        }
        return false
      }

      if (applySummary(this.pendingHotTopics)) return

      for (const message of this.messages) {
        if (applySummary(message.hotTopics)) return
      }
    },

    async loadSessions() {
      const result = await window.api.chat.listSessions()
      if (result?.error) {
        this.error = result.error
        return
      }
      this.sessions = result || []

      // Auto-select most recent session if its last activity is within 5 minutes
      if (this.sessions.length > 0 && !this.currentSessionId) {
        const latest = this.sessions[0] // already sorted by updatedAt desc
        const lastActive = new Date(latest.updatedAt).getTime()
        const fiveMinAgo = Date.now() - 5 * 60 * 1000
        if (lastActive > fiveMinAgo) {
          await this.selectSession(latest.id)
        }
      }
    },

    async selectSession(sessionId) {
      if (this.hasActiveGlobalStream() && sessionId !== this.activeStreamSessionId) {
        this.notifySingleSessionLimit()
        return
      }

      this.currentSessionId = sessionId
      this.error = null
      this.statusEvents = []
      this.streamingContent = null
      this.pendingHotTopics = null
      this.streamingThinking = ''
      this.thinkingExpanded = false
      this.pendingAbort = false
      this.summaryToastShown = false
      if (!sessionId) {
        this.messages = []
        return
      }
      const result = await window.api.chat.getSession(sessionId)
      if (result?.error) {
        this.error = result.error
        this.messages = []
        return
      }
      this.messages = result?.messages || []
    },

    async createSession() {
      if (this.hasActiveGlobalStream()) {
        this.notifySingleSessionLimit()
        return null
      }

      const result = await window.api.chat.createSession()
      if (result?.error) {
        this.error = result.error
        return null
      }
      const session = result.session
      this.sessions.unshift({
        id: session.id,
        title: session.title || '新对话',
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      })
      this.currentSessionId = session.id
      this.messages = []
      this.error = null
      this.statusEvents = []
      this.streamingContent = null
      this.pendingHotTopics = null
      this.streamingThinking = ''
      this.thinkingExpanded = false
      this.pendingAbort = false
      this.summaryToastShown = false
      return session
    },

    async sendMessage(content, { isHotTopic = false } = {}) {
      if (this.hasActiveGlobalStream()) {
        this.notifySingleSessionLimit()
        return
      }

      if (!this.currentSessionId) {
        await this.createSession()
        if (!this.currentSessionId) return
      }

      this.sending = true
      this.activeStreamSessionId = this.currentSessionId
      this.error = null
      this.statusEvents = []
      this.streamingContent = null
      this.pendingHotTopics = null
      this.streamingThinking = ''
      this.thinkingExpanded = false
      this.pendingAbort = false
      this.summaryToastShown = false

      // Optimistic: show user message immediately
      const optimisticMsg = {
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      }
      this.messages.push(optimisticMsg)

      // Update session title optimistically
      const streamSessionId = this.currentSessionId
      const session = this.sessions.find((s) => s.id === streamSessionId)
      if (session && !session.title) {
        session.title = content.length > 20 ? content.slice(0, 20) + '…' : content
      }

      try {
        await new Promise((resolve, reject) => {
          window.api.chat.sendMessageStream(
            streamSessionId,
            content,
            isHotTopic,
            {
              onStatus: (event) => {
                if (this.currentSessionId !== streamSessionId) return
                this.statusEvents.push({
                  id: `${Date.now()}-${this.statusEvents.length}`,
                  status: event?.status || 'info',
                  sourceId: event?.sourceId || '',
                  sourceName: event?.sourceName || '',
                  detail: event?.detail || event?.text || '',
                  topics: event?.topics || null,
                })
                if (event?.topics) this.pendingHotTopics = event.topics
              },
              onThinking: (text) => {
                if (this.currentSessionId !== streamSessionId) return
                this.streamingThinking += text
              },
              onToken: (text) => {
                if (this.currentSessionId !== streamSessionId) return
                if (this.streamingContent === null) this.streamingContent = ''
                this.streamingContent += text
              },
              onTopicSummary: (event) => {
                if (this.currentSessionId !== streamSessionId) return
                this.updateTopicSummary(event?.topicId, event?.summary || '', event?.summaryStatus || 'ready')
                if (event?.summaryStatus === 'error' && !this.summaryToastShown) {
                  const { warning, error: toastError } = useToast()
                  const message = event?.summaryError || '热点摘要生成失败'
                  if (message.includes('429') || message.includes('速率限制') || message.includes('请求频率')) {
                    warning('热点摘要请求过快，部分新闻暂未生成一句话描述。', { timeout: 5000 })
                  } else {
                    toastError(`热点摘要生成失败：${message}`, { timeout: 5000 })
                  }
                  this.summaryToastShown = true
                }
              },
              onDone: (userMessage, assistantMessage, aborted) => {
                if (this.currentSessionId === streamSessionId) {
                  const lastMessage = this.messages[this.messages.length - 1]
                  if (
                    lastMessage?.role === optimisticMsg.role &&
                    lastMessage?.content === optimisticMsg.content &&
                    lastMessage?.timestamp === optimisticMsg.timestamp
                  ) {
                    this.messages.pop()
                  }

                  this.messages.push(userMessage)

                  const finalAssistantMessage = assistantMessage
                    ? {
                        ...assistantMessage,
                        content: aborted
                          ? `${this.normalizeAssistantContent(assistantMessage.content)}\n\n_[已中断]_`
                          : this.normalizeAssistantContent(assistantMessage.content),
                      }
                    : (aborted && this.streamingContent
                      ? {
                          role: 'assistant',
                          content: `${this.normalizeAssistantContent(this.streamingContent)}\n\n_[已中断]_`,
                          timestamp: new Date().toISOString(),
                          hotTopics: this.pendingHotTopics,
                        }
                      : (this.pendingHotTopics
                        ? {
                            role: 'assistant',
                            content: aborted ? '_[已中断]_' : '',
                            timestamp: new Date().toISOString(),
                            hotTopics: this.pendingHotTopics,
                          }
                        : null))

                  if (finalAssistantMessage) {
                    this.messages.push(finalAssistantMessage)
                  }

                  this.streamingContent = null
                  this.pendingHotTopics = null
                  this.streamingThinking = ''
                  this.thinkingExpanded = false
                  this.statusEvents = []
                }

                this.pendingAbort = false
                this.summaryToastShown = false

                // Update session in list
                if (session) {
                  session.updatedAt = new Date().toISOString()
                  const idx = this.sessions.indexOf(session)
                  if (idx > 0) {
                    this.sessions.splice(idx, 1)
                    this.sessions.unshift(session)
                  }
                }
                resolve()
              },
              onError: (error) => {
                this.error = error
                if (this.currentSessionId === streamSessionId) {
                  this.streamingContent = null
                  this.pendingHotTopics = null
                  this.streamingThinking = ''
                  this.thinkingExpanded = false
                  this.statusEvents = []
                }
                this.pendingAbort = false
                this.summaryToastShown = false
                reject(new Error(error))
              },
            },
          )
        })
      } catch (_err) {
        // Error already set in onError callback
      } finally {
        this.sending = false
        this.activeStreamSessionId = null
      }
    },

    abortSending() {
      this.pendingAbort = true
      window.api.chat.abortStream()
      this.error = null
    },

    toggleThinkingExpanded() {
      this.thinkingExpanded = !this.thinkingExpanded
    },

    async deleteSession(sessionId) {
      if (this.hasActiveGlobalStream()) {
        this.notifySingleSessionLimit()
        return
      }

      const result = await window.api.chat.deleteSession(sessionId)
      if (result?.error) {
        this.error = result.error
        return
      }
      this.sessions = this.sessions.filter((s) => s.id !== sessionId)
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = this.sessions.length > 0 ? this.sessions[0].id : null
        if (this.currentSessionId) {
          await this.selectSession(this.currentSessionId)
        } else {
          this.messages = []
        }
      }
    },
  },
})
