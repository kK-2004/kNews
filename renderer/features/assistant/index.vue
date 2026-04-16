<template>
  <div class="assistant-page">
    <aside class="chat-sidebar">
      <button class="new-chat-btn" type="button" @click="onNewChat">
        <span class="i-tabler-plus" aria-hidden="true"></span>
        新对话
      </button>
      <div class="session-list">
        <div class="session-label">历史记录</div>
        <button
          v-for="s in chatStore.sessions"
          :key="s.id"
          :class="['session-item', { active: s.id === chatStore.currentSessionId }]"
          type="button"
          @click="chatStore.selectSession(s.id)"
        >
          <span class="i-tabler-message" aria-hidden="true"></span>
          <span class="session-title">{{ s.title || '新对话' }}</span>
          <span class="i-tabler-x session-delete" @click.stop="onDelete(s.id)"></span>
        </button>
        <div v-if="chatStore.sessions.length === 0" class="session-empty">暂无对话</div>
      </div>
    </aside>

    <main class="chat-main">
      <header class="chat-topbar">
        <h2 class="topbar-title">K-Ai</h2>
        <div class="topbar-status">
          <span class="status-dot"></span>
          <span class="status-text">AI 对话助手</span>
        </div>
      </header>

      <div ref="messagesRef" class="chat-messages">
        <div v-if="chatStore.messages.length === 0 && !chatStore.sending" class="empty-state">
          <div class="empty-icon">
            <span class="i-tabler-robot" aria-hidden="true"></span>
          </div>
          <h3 class="empty-title">开始和 K-Ai 对话</h3>
          <p class="empty-desc">你可以问我任何关于新闻的问题，或点击下方热点快捷入口</p>
        </div>

        <div
          v-for="(msg, idx) in chatStore.messages"
          :key="idx"
          :class="['message-row', msg.role]"
        >
          <div v-if="msg.role === 'assistant'" class="avatar avatar-ai">
            <span class="i-tabler-robot" aria-hidden="true"></span>
          </div>
          <div :class="['message-bubble', msg.role]">
            <div v-if="msg.role === 'assistant'" class="message-text" v-html="renderMarkdown(msg.content)"></div>
            <div v-else class="message-text">{{ msg.content }}</div>
          </div>
          <div v-if="msg.role === 'user'" class="avatar avatar-user">
            <span class="i-tabler-user" aria-hidden="true"></span>
          </div>
        </div>

        <div
          v-if="chatStore.sending || chatStore.statusEvents.length > 0 || chatStore.streamingThinking || chatStore.streamingContent !== null"
          class="message-row assistant"
        >
          <div class="avatar avatar-ai">
            <span class="i-tabler-robot" aria-hidden="true"></span>
          </div>
          <div class="message-bubble assistant streaming pending-bubble">
            <div
              v-if="chatStore.latestStatusEvent"
              :class="['status-line', statusClass(chatStore.latestStatusEvent.status)]"
            >
              <span class="status-line-text">{{ formatLatestStatus(chatStore.latestStatusEvent) }}</span>
            </div>

            <button
              v-if="chatStore.streamingThinking"
              class="thinking-panel"
              type="button"
              @click="chatStore.toggleThinkingExpanded()"
            >
              <div class="thinking-label">
                <span class="thinking-dots"><span></span><span></span><span></span></span>
                <span>思考中...</span>
                <span class="thinking-toggle">{{ chatStore.thinkingExpanded ? '收起' : '展开' }}</span>
              </div>
              <div v-if="chatStore.thinkingExpanded" class="thinking-text">{{ chatStore.streamingThinking }}</div>
              <div v-else class="thinking-preview">{{ chatStore.latestThinkingLine || '正在整理最新思路...' }}</div>
            </button>

            <template v-if="chatStore.streamingContent">
              <div class="message-text pending-text" v-html="renderMarkdown(chatStore.streamingContent)"></div>
              <span class="cursor-blink">|</span>
            </template>

            <div v-else-if="chatStore.sending && !chatStore.streamingThinking" class="loading-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <div v-if="chatStore.error" class="chat-error">
          <span class="i-tabler-alert-circle" aria-hidden="true"></span>
          {{ chatStore.error }}
        </div>
      </div>

      <div class="chat-input-area">
        <div class="input-wrapper">
          <textarea
            ref="inputRef"
            v-model="inputText"
            class="chat-textarea"
            placeholder="问 K-Ai 任何问题..."
            rows="1"
            :disabled="chatStore.sending"
            @keydown.enter.exact.prevent="onSend"
            @input="autoResize"
          ></textarea>
          <button
            v-if="chatStore.sending"
            class="stop-btn"
            type="button"
            @click="chatStore.abortSending()"
          >
            <span class="i-tabler-square" aria-hidden="true"></span>
          </button>
          <button
            v-else
            class="send-btn"
            type="button"
            :disabled="!inputText.trim()"
            @click="onSend"
          >
            <span class="i-tabler-send" aria-hidden="true"></span>
          </button>
        </div>

        <div v-if="hotTopics.length > 0 && chatStore.messages.length === 0" class="hot-topics">
          <button
            v-for="(topic, idx) in hotTopics"
            class="hot-topic-chip"
            type="button"
            @click="onHotTopic(topic)"
          >
            <span class="i-tabler-flame" aria-hidden="true"></span>
            {{ topic }}
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, watch } from 'vue'
import { useChatStore } from '@/stores/use-chat-store'

const chatStore = useChatStore()
const inputText = ref('')
const inputRef = ref(null)
const messagesRef = ref(null)

const hotTopics = ref([
  '今天有什么热点新闻？',
  '最新的科技资讯有哪些？',
  '帮我总结一下今日时事',
])

onMounted(async () => {
  await chatStore.loadSessions()
})

watch(
  () => chatStore.messages.length,
  () => nextTick(scrollToBottom),
)
watch(
  () => chatStore.sending,
  (v) => {
    if (v) nextTick(scrollToBottom)
  },
)
watch(
  () => chatStore.streamingContent,
  () => nextTick(scrollToBottom),
)
watch(
  () => chatStore.statusEvents.length,
  () => nextTick(scrollToBottom),
)
watch(
  () => chatStore.streamingThinking,
  () => nextTick(scrollToBottom),
)

function scrollToBottom() {
  const el = messagesRef.value
  if (el) el.scrollTop = el.scrollHeight
}

function autoResize(e) {
  const ta = e.target
  ta.style.height = 'auto'
  ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
}

async function onNewChat() {
  await chatStore.createSession()
  nextTick(() => inputRef.value?.focus())
}

async function onSend() {
  const text = inputText.value.trim()
  if (!text || chatStore.sending) return
  inputText.value = ''
  if (inputRef.value) {
    inputRef.value.style.height = 'auto'
  }
  await chatStore.sendMessage(text)
  nextTick(() => inputRef.value?.focus())
}

async function onDelete(sessionId) {
  await chatStore.deleteSession(sessionId)
}

async function onHotTopic(topic) {
  inputText.value = ''
  await chatStore.sendMessage(topic, { isHotTopic: true })
}

function openUrl(url) {
  window.open(url, '_blank')
}

function statusClass(status) {
  return `status-${status || 'info'}`
}

function formatLatestStatus(event) {
  const sourceName = event?.sourceName || event?.sourceId || '热点'
  const prefix = `调用MCP获取中... ｜ [${sourceName}]`
  const statusMap = {
    start: '拉取中',
    success: '拉取成功',
    failed: '拉取失败',
    skipped: '已跳过',
    empty: '暂无数据',
    ready: '拉取成功',
  }
  return `${prefix} ${statusMap[event?.status] || '处理中'}`
}

/**
 * Render assistant markdown content into HTML with clickable news cards.
 */
function renderMarkdown(text) {
  if (!text) return ''
  const normalized = text.replace(/\r/g, '')
  const newsTokens = []
  let newsIndex = 0

  const withNewsTokens = normalized
    .replace(
      /(\d+)\.\s*\n+\s*\*\*([^*]+)\*\*\s*[-—]\s*(.*?)\s*\[([^\]]*)\]\(([^)]+)\)/g,
      (_, order, title, desc, linkText, url) => {
        const token = `@@NEWS_${newsIndex}@@`
        const source = extractSource(title, desc, linkText)
        newsTokens.push({ order, title: stripSource(title), desc: stripSource(desc), linkText, url, source })
        newsIndex += 1
        return token
      },
    )
    .replace(
      /(\d+)\.\s*\*\*([^*]+)\*\*\s*[-—]\s*(.*?)\s*\[([^\]]*)\]\(([^)]+)\)/g,
      (_, order, title, desc, linkText, url) => {
        const token = `@@NEWS_${newsIndex}@@`
        const source = extractSource(title, desc, linkText)
        newsTokens.push({ order, title: stripSource(title), desc: stripSource(desc), linkText, url, source })
        newsIndex += 1
        return token
      },
    )
    .replace(
      /\*\*([^*]+)\*\*\s*[-—]\s*(.*?)\s*\[([^\]]*)\]\(([^)]+)\)/g,
      (_, title, desc, linkText, url) => {
        const token = `@@NEWS_${newsIndex}@@`
        const source = extractSource(title, desc, linkText)
        newsTokens.push({ order: String(newsIndex + 1), title: stripSource(title), desc: stripSource(desc), linkText, url, source })
        newsIndex += 1
        return token
      },
    )

  let html = escapeHtml(withNewsTokens)

  // 标题：支持 1-6 级，允许行首空格
  html = html.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, title) => {
    const level = hashes.length
    return `<div class="md-heading md-heading-${level}">${title}</div>`
  })
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // 有序列表：允许行首空格
  html = html.replace(/^\s*(\d+)\.\s+(.+)$/gm, '<div class="md-list-item"><span class="list-num">$1.</span><span>$2</span></div>')
  // 无序列表：支持 * 或 - 开头
  html = html.replace(/^\s*[-*]\s+(.+)$/gm, '<div class="md-list-item"><span class="list-bullet">•</span><span>$1</span></div>')

  // ⚠️ 关键修正：必须在插入卡片 HTML 之前执行换行符替换
  html = html.replace(/\n{3,}/g, '<br><br>')
  html = html.replace(/\n{2}/g, '<br><br>')
  html = html.replace(/\n/g, '<br>')

  // 插入已格式化好且无多余换行符的新闻卡片 HTML 节点
  newsTokens.forEach((item, idx) => {
    const token = `@@NEWS_${idx}@@`
    const sourceTag = item.source ? `<span class="news-row-source">${escapeHtml(item.source)}</span>` : ''
    html = html.replace(
      token,
      `<div class="news-row" onclick="window._openNewsUrl('${escapeAttr(item.url)}')"><div class="news-row-index">${escapeHtml(item.order)}</div><div class="news-row-body"><div class="news-row-title">${escapeHtml(item.title)}${sourceTag}</div><div class="news-row-desc">${escapeHtml(item.desc.trim())}</div></div></div>`
    )
  })

  // 处理剩余可能出现的标准 Markdown 链接
  html = html.replace(
    /\[([^\]]*)\]\(([^)]+)\)/g,
    '<a class="md-link" href="#" onclick="event.preventDefault();window._openNewsUrl(\'$2\')">$1</a>',
  )

  return html
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttr(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;')
}

/**
 * Extract source tag like [来源名] from title or linkText.
 */
function extractSource(title, desc, linkText) {
  const combined = `${title} ${desc} ${linkText}`
  const m = combined.match(/[【\[]([^\]】]+)[\]】]/)
  return m ? m[1] : ''
}

function stripSource(str) {
  return str.replace(/[【\[][^\]】]+[\]】]/g, '').trim()
}

if (typeof window !== 'undefined') {
  window._openNewsUrl = openUrl
}
</script>

<style scoped>
.assistant-page {
  display: flex;
  height: calc(100dvh - 4.5rem);
  margin: -1.1rem -1.2rem -2rem;
  overflow: hidden;
  background: var(--bg);
}

/* ---- Sidebar ---- */
.chat-sidebar {
  width: 17rem;
  border-right: 1px solid var(--border);
  background: var(--surface);
  display: flex;
  flex-direction: column;
  padding: 1rem 0.75rem;
  flex-shrink: 0;
}

.new-chat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.65rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  margin-bottom: 1rem;
}

.new-chat-btn:hover {
  background: color-mix(in srgb, #0b63ff 10%, var(--surface));
  border-color: color-mix(in srgb, #0b63ff 38%, var(--border));
}

.new-chat-btn span:first-child {
  font-size: 1.1rem;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.session-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  padding: 0 0.5rem;
  margin-bottom: 0.4rem;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.55rem 0.6rem;
  border-radius: 0.7rem;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 0.84rem;
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
}

.session-item:hover {
  background: color-mix(in srgb, var(--muted) 10%, transparent);
}

.session-item.active {
  background: color-mix(in srgb, #0b63ff 12%, transparent);
  color: #0b63ff;
  font-weight: 600;
}

.session-item span:first-child {
  font-size: 1rem;
  flex-shrink: 0;
}

.session-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-delete {
  opacity: 0;
  font-size: 0.85rem;
  padding: 0.15rem;
  border-radius: 0.25rem;
  transition: opacity 0.15s, background 0.15s;
  flex-shrink: 0;
}

.session-item:hover .session-delete {
  opacity: 0.5;
}

.session-delete:hover {
  opacity: 1 !important;
  background: color-mix(in srgb, #e44 15%, transparent);
}

.session-empty {
  color: var(--muted);
  font-size: 0.82rem;
  text-align: center;
  padding: 2rem 0;
}

/* ---- Main ---- */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--bg);
}

.chat-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  height: 3.5rem;
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface) 80%, transparent);
  backdrop-filter: blur(12px);
  flex-shrink: 0;
}

.topbar-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: #0b63ff;
  margin: 0;
}

.topbar-status {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: color-mix(in srgb, var(--surface) 80%, var(--border));
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
}

.status-dot {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 999px;
  background: #22c55e;
  animation: pulse-dot 2s infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.status-text {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

/* ---- Messages ---- */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 0.75rem;
  color: var(--muted);
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.4;
}

.empty-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.empty-desc {
  font-size: 0.9rem;
  margin: 0;
}

.message-row {
  display: flex;
  gap: 0.75rem;
  max-width: 50rem;
  width: 100%;
  margin: 0 auto;
}

.message-row.user {
  justify-content: flex-end;
}

.message-row.assistant {
  justify-content: flex-start;
}

.avatar {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1.15rem;
}

.avatar-ai {
  background: linear-gradient(135deg, #0b63ff, #6366f1);
  color: #fff;
  box-shadow: 0 4px 12px rgba(11, 99, 255, 0.2);
}

.avatar-user {
  background: color-mix(in srgb, var(--muted) 15%, var(--surface));
  color: var(--muted);
  border: 1px solid var(--border);
}

.message-bubble {
  max-width: 78%;
  padding: 0.72rem 1rem;
  border-radius: 1rem;
  line-height: 1.6;
  font-size: 0.92rem;
}

.message-bubble.user {
  background: #0b63ff;
  color: #fff;
  border-top-right-radius: 0.2rem;
  box-shadow: 0 2px 8px rgba(11, 99, 255, 0.2);
}

.message-bubble.assistant {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-top-left-radius: 0.2rem;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
  width: min(44rem, calc(100vw - 8rem));
  max-width: min(44rem, calc(100vw - 8rem));
  flex: 0 0 min(44rem, calc(100vw - 8rem));
}

.message-bubble.loading {
  padding: 1rem 1.5rem;
}

.message-bubble.streaming {
  padding-right: 1.1rem;
}

.cursor-blink {
  display: inline;
  color: #0b63ff;
  animation: blink-cursor 0.8s infinite;
  font-weight: 200;
}

@keyframes blink-cursor {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.loading-dots {
  display: flex;
  gap: 0.35rem;
  align-items: center;
}

.loading-dots span {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
  background: #0b63ff;
  animation: bounce-dot 1.2s infinite;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.15s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes bounce-dot {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40% { transform: translateY(-6px); opacity: 1; }
}

.message-text {
  white-space: normal;
  word-break: break-word;
}

.message-text :deep(.md-heading) {
  margin: 0 0 0.85rem;
  font-weight: 800;
  line-height: 1.25;
  color: var(--text);
}

.message-text :deep(.md-heading-1) {
  font-size: 1.35rem;
}

.message-text :deep(.md-heading-2) {
  font-size: 1.18rem;
}

.message-text :deep(.md-heading-3) {
  font-size: 1.02rem;
}

.message-text :deep(.md-heading-4) {
  font-size: 1rem;
  font-weight: 700;
  margin: 0.8rem 0 0.5rem;
  color: var(--text);
}

.message-text :deep(.md-list-item) {
  display: flex;
  align-items: flex-start;
  gap: 0.38rem;
  margin: 0.25rem 0;
}

.pending-bubble {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  background:
    linear-gradient(180deg, color-mix(in srgb, #0b63ff 4%, var(--surface)) 0%, var(--surface) 100%);
}

.pending-text {
  padding-top: 0.1rem;
}

.chat-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #e44;
  font-size: 0.88rem;
  padding: 0.75rem 1rem;
  background: color-mix(in srgb, #e44 8%, var(--surface));
  border: 1px solid color-mix(in srgb, #e44 20%, var(--border));
  border-radius: 0.75rem;
  max-width: 50rem;
  margin: 0 auto;
  width: 100%;
}

/* ---- Input ---- */
.chat-input-area {
  padding: 1rem 2rem 1.5rem;
  flex-shrink: 0;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 1rem;
  padding: 0.4rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  max-width: 50rem;
  margin: 0 auto;
}

.chat-textarea {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 0.92rem;
  line-height: 1.5;
  padding: 0.5rem 0.75rem;
  resize: none;
  min-height: 2.5rem;
  max-height: 12rem;
  outline: none;
  font-family: inherit;
}

.chat-textarea::placeholder {
  color: color-mix(in srgb, var(--muted) 50%, transparent);
}

.chat-textarea:disabled {
  opacity: 0.5;
}

.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  border: none;
  background: linear-gradient(135deg, #0b63ff, #4f8eff);
  color: #fff;
  cursor: pointer;
  flex-shrink: 0;
  font-size: 1.1rem;
  transition: transform 0.12s, opacity 0.15s;
  box-shadow: 0 2px 8px rgba(11, 99, 255, 0.25);
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.stop-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  flex-shrink: 0;
  font-size: 0.85rem;
  transition: transform 0.12s, background 0.15s;
}

.stop-btn:hover {
  background: color-mix(in srgb, #e44 10%, var(--surface));
  border-color: color-mix(in srgb, #e44 30%, var(--border));
  transform: scale(1.05);
}

/* ---- Hot Topics ---- */
.hot-topics {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
  max-width: 50rem;
  margin-left: auto;
  margin-right: auto;
}

.hot-topic-chip {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface) 80%, transparent);
  color: var(--text);
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.hot-topic-chip span:first-child {
  color: #f59e0b;
  font-size: 0.95rem;
}

.hot-topic-chip:hover {
  background: color-mix(in srgb, #f59e0b 8%, var(--surface));
  border-color: color-mix(in srgb, #f59e0b 30%, var(--border));
}

/* ---- Status ---- */
.status-line {
  display: flex;
  align-items: center;
  min-height: 2rem;
  padding: 0.38rem 0.7rem;
  border-radius: 0.72rem;
  font-size: 0.79rem;
  line-height: 1.45;
  background: color-mix(in srgb, var(--surface) 80%, transparent);
}

.status-line-text {
  color: var(--text);
  opacity: 0.82;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-start {
  border: 1px solid color-mix(in srgb, #0b63ff 16%, var(--border));
}

.status-start,
.status-ready {
  color: #0b63ff;
}

.status-success {
  border: 1px solid color-mix(in srgb, #22c55e 20%, var(--border));
  background: color-mix(in srgb, #22c55e 6%, var(--surface));
  color: #22c55e;
}

.status-skipped,
.status-empty {
  border: 1px solid color-mix(in srgb, #f59e0b 22%, var(--border));
  background: color-mix(in srgb, #f59e0b 7%, var(--surface));
  color: #d97706;
}

.status-failed {
  border: 1px solid color-mix(in srgb, #ef4444 20%, var(--border));
  background: color-mix(in srgb, #ef4444 7%, var(--surface));
  color: #ef4444;
}

.thinking-panel {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.68rem 0.78rem;
  border-radius: 0.82rem;
  background: linear-gradient(135deg, rgba(11, 99, 255, 0.08), rgba(99, 102, 241, 0.06));
  border: 1px solid color-mix(in srgb, #0b63ff 18%, var(--border));
  text-align: left;
  cursor: pointer;
}

.thinking-label {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.73rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, #0b63ff 72%, var(--text));
}

.thinking-toggle {
  margin-left: auto;
  font-size: 0.72rem;
  text-transform: none;
  letter-spacing: 0;
  opacity: 0.72;
}

.thinking-dots {
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
}

.thinking-dots span {
  width: 0.24rem;
  height: 0.24rem;
  border-radius: 999px;
  background: #0b63ff;
  animation: thinking-bounce 1.2s infinite;
}

.thinking-dots span:nth-child(2) {
  animation-delay: 0.12s;
}

.thinking-dots span:nth-child(3) {
  animation-delay: 0.24s;
}

@keyframes thinking-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
  40% { transform: translateY(-3px); opacity: 1; }
}

.thinking-text {
  font-size: 0.82rem;
  line-height: 1.55;
  color: color-mix(in srgb, var(--text) 88%, #0b63ff 12%);
  white-space: pre-wrap;
  word-break: break-word;
}

.thinking-preview {
  font-size: 0.8rem;
  line-height: 1.4;
  color: color-mix(in srgb, var(--text) 88%, #0b63ff 12%);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---- News Card (Light/Dark Theme) ---- */
.message-text :deep(.news-row) {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin: 0.6rem 0;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: transform 0.12s ease, opacity 0.12s ease;
}

.message-text :deep(.news-row:hover) {
  transform: translateX(2px);
  opacity: 0.96;
}

.message-text :deep(.news-row-index) {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 0.4rem;
  background: #eef2f6;
  color: #1e3a8a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
  flex-shrink: 0;
}

.message-text :deep(.news-row-body) {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.1rem;
}

.message-text :deep(.news-row-title) {
  font-weight: 700;
  font-size: 1.05rem;
  color: #0f172a;
  line-height: 1.3;
}

.message-text :deep(.news-row-desc) {
  font-size: 0.9rem;
  color: #475569;
  line-height: 1.5;
}

.message-text :deep(.news-row-source) {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 600;
  color: #0b63ff;
  background: color-mix(in srgb, #0b63ff 10%, transparent);
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
  margin-left: 0.4rem;
  vertical-align: middle;
}

.message-text :deep(.md-link) {
  color: #0b63ff;
  text-decoration: none;
}

.message-text :deep(.md-link:hover) {
  text-decoration: underline;
}

.message-text :deep(.list-num) {
  color: #0b63ff;
  font-weight: 700;
}

.message-text :deep(.list-bullet) {
  color: #0b63ff;
  font-weight: bold;
  margin-right: 0.5rem;
}

.message-text :deep(strong) {
  font-weight: 700;
}

/* Dark theme overrides for news cards */
.theme-dark .message-text :deep(.news-row-index) {
  background: #1e293b;
  color: #93c5fd;
}

.theme-dark .message-text :deep(.news-row-title) {
  color: #f1f5f9;
}

.theme-dark .message-text :deep(.news-row-desc) {
  color: #94a3b8;
}

.theme-dark .message-text :deep(.news-row-source) {
  color: #60a5fa;
  background: color-mix(in srgb, #3b82f6 15%, transparent);
}

.theme-dark .message-text :deep(.md-heading) {
  color: var(--text);
}

.theme-dark .message-text :deep(.md-link) {
  color: #60a5fa;
}

/* ---- Responsive ---- */
@media (max-width: 768px) {
  .chat-sidebar {
    display: none;
  }

  .chat-messages {
    padding: 1rem;
  }

  .message-bubble {
    max-width: calc(100% - 3rem);
  }

  .message-bubble.assistant {
    width: calc(100vw - 4.5rem);
    max-width: calc(100vw - 4.5rem);
    flex-basis: calc(100vw - 4.5rem);
  }

  .chat-input-area {
    padding: 0.75rem 1rem 1rem;
  }
}
</style>