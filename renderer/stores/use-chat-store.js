import { defineStore } from 'pinia'

export const useChatStore = defineStore('use-chat-store', {
  state: () => ({
    sessions: [],
    currentSessionId: null,
    messages: [],
    sending: false,
    error: null,
    statusEvents: [],
    streamingContent: null,
    streamingThinking: '',
    thinkingExpanded: false,
    pendingAbort: false,
  }),
  getters: {
    currentSession: (state) =>
      state.sessions.find((s) => s.id === state.currentSessionId) || null,
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
      this.currentSessionId = sessionId
      this.error = null
      this.statusEvents = []
      this.streamingContent = null
      this.streamingThinking = ''
      this.thinkingExpanded = false
      this.pendingAbort = false
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
      this.streamingThinking = ''
      this.thinkingExpanded = false
      this.pendingAbort = false
      return session
    },

    async sendMessage(content, { isHotTopic = false } = {}) {
      if (!this.currentSessionId) {
        await this.createSession()
        if (!this.currentSessionId) return
      }

      this.sending = true
      this.error = null
      this.statusEvents = []
      this.streamingContent = null
      this.streamingThinking = ''
      this.thinkingExpanded = false
      this.pendingAbort = false

      // Optimistic: show user message immediately
      const optimisticMsg = {
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      }
      this.messages.push(optimisticMsg)

      // Update session title optimistically
      const session = this.sessions.find((s) => s.id === this.currentSessionId)
      if (session && !session.title) {
        session.title = content.length > 20 ? content.slice(0, 20) + '…' : content
      }

      try {
        await new Promise((resolve, reject) => {
          window.api.chat.sendMessageStream(
            this.currentSessionId,
            content,
            isHotTopic,
            {
              onStatus: (event) => {
                this.statusEvents.push({
                  id: `${Date.now()}-${this.statusEvents.length}`,
                  status: event?.status || 'info',
                  sourceId: event?.sourceId || '',
                  sourceName: event?.sourceName || '',
                  detail: event?.detail || event?.text || '',
                })
              },
              onThinking: (text) => {
                this.streamingThinking += text
              },
              onToken: (text) => {
                if (this.streamingContent === null) this.streamingContent = ''
                this.streamingContent += text
              },
              onDone: (userMessage, assistantMessage, aborted) => {
                // Replace optimistic user msg with server version + add assistant
                this.messages.pop()
                this.messages.push(userMessage)

                const finalAssistantMessage = assistantMessage
                  ? {
                      ...assistantMessage,
                      content: aborted ? `${assistantMessage.content}\n\n_[已中断]_` : assistantMessage.content,
                    }
                  : (aborted && this.streamingContent
                    ? {
                        role: 'assistant',
                        content: `${this.streamingContent}\n\n_[已中断]_`,
                        timestamp: new Date().toISOString(),
                      }
                    : null)

                if (finalAssistantMessage) {
                  this.messages.push(finalAssistantMessage)
                }

                this.streamingContent = null
                this.streamingThinking = ''
                this.thinkingExpanded = false
                this.statusEvents = []
                this.pendingAbort = false

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
                this.streamingContent = null
                this.streamingThinking = ''
                this.thinkingExpanded = false
                this.statusEvents = []
                this.pendingAbort = false
                reject(new Error(error))
              },
            },
          )
        })
      } catch (_err) {
        // Error already set in onError callback
      } finally {
        this.sending = false
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
