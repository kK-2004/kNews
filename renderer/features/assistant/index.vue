<template>
  <div class="assistant-page">
    <!-- Sidebar -->
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

    <!-- Main area -->
    <main class="chat-main">
      <!-- Top bar -->
      <header class="chat-topbar">
        <h2 class="topbar-title">K-Ai</h2>
        <div class="topbar-status">
          <span class="status-dot"></span>
          <span class="status-text">AI 对话助手</span>
        </div>
      </header>

      <!-- Messages -->
      <div ref="messagesRef" class="chat-messages">
        <!-- Empty state -->
        <div v-if="chatStore.messages.length === 0 && !chatStore.sending" class="empty-state">
          <div class="empty-icon">
            <span class="i-tabler-robot" aria-hidden="true"></span>
          </div>
          <h3 class="empty-title">开始和 K-Ai 对话</h3>
          <p class="empty-desc">你可以问我任何关于新闻的问题，或点击下方热点快捷入口</p>
        </div>

        <!-- Message list -->
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

        <!-- Agent status -->
        <div v-if="chatStore.agentStatus" class="message-row assistant agent-status-row">
          <div class="avatar avatar-ai">
            <span class="i-tabler-robot" aria-hidden="true"></span>
          </div>
          <div class="agent-status-bubble">
            <span class="status-spinner"></span>
            <span class="status-label">{{ chatStore.agentStatus }}</span>
          </div>
        </div>

        <!-- Streaming message -->
        <div v-if="chatStore.streamingContent !== null" class="message-row assistant">
          <div class="avatar avatar-ai">
            <span class="i-tabler-robot" aria-hidden="true"></span>
          </div>
          <div class="message-bubble assistant streaming">
            <div class="message-text" v-html="renderMarkdown(chatStore.streamingContent)"></div>
            <span class="cursor-blink">|</span>
          </div>
        </div>

        <!-- Loading (shown only when no streaming content and no agent status) -->
        <div v-if="chatStore.sending && !chatStore.streamingContent && !chatStore.agentStatus" class="message-row assistant">
          <div class="avatar avatar-ai">
            <span class="i-tabler-robot" aria-hidden="true"></span>
          </div>
          <div class="message-bubble assistant loading">
            <div class="loading-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <!-- Error -->
        <div v-if="chatStore.error" class="chat-error">
          <span class="i-tabler-alert-circle" aria-hidden="true"></span>
          {{ chatStore.error }}
        </div>
      </div>

      <!-- Input -->
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

        <!-- Hot topics -->
        <div v-if="hotTopics.length > 0 && chatStore.messages.length === 0" class="hot-topics">
          <button
            v-for="(topic, idx) in hotTopics"
            :key="idx"
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
  // loadSessions already handles 5-min auto-select logic
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
  () => chatStore.agentStatus,
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

/**
 * Render assistant markdown content into HTML with clickable news cards.
 */
function renderMarkdown(text) {
  if (!text) return ''
  let html = escapeHtml(text)

  // Convert markdown links [text](url) into clickable news cards
  html = html.replace(
    /\*\*([^*]+)\*\*\s*[-—]\s*([^[]*?)\s*\[([^\]]*)\]\(([^)]+)\)/g,
    (_, title, desc, linkText, url) => {
      return `<div class="news-card" onclick="window._openNewsUrl('${escapeAttr(url)}')">
        <div class="news-card-title">${title}</div>
        <div class="news-card-desc">${desc.trim()}</div>
        <div class="news-card-link">${linkText || '查看原文'} →</div>
      </div>`
    },
  )

  // Convert remaining markdown links
  html = html.replace(
    /\[([^\]]*)\]\(([^)]+)\)/g,
    '<a class="md-link" href="#" onclick="event.preventDefault();window._openNewsUrl(\'$2\')">$1</a>',
  )

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // Numbered list items
  html = html.replace(/^(\d+)\.\s/gm, '<span class="list-num">$1.</span> ')
  // Line breaks
  html = html.replace(/\n/g, '<br>')

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

// Expose openUrl for onclick handlers in rendered HTML
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
  max-width: 80%;
  padding: 0.75rem 1.15rem;
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
}

.message-bubble.loading {
  padding: 1rem 1.5rem;
}

.message-bubble.streaming {
  padding-right: 1.5rem;
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
  white-space: pre-wrap;
  word-break: break-word;
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

/* ---- Agent Status ---- */
.agent-status-row {
  max-width: 50rem;
  width: 100%;
  margin: 0 auto;
}

.agent-status-bubble {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  background: color-mix(in srgb, #0b63ff 8%, var(--surface));
  border: 1px solid color-mix(in srgb, #0b63ff 20%, var(--border));
  border-radius: 0.75rem;
  border-top-left-radius: 0.2rem;
}

.status-spinner {
  width: 0.85rem;
  height: 0.85rem;
  border: 2px solid color-mix(in srgb, #0b63ff 30%, transparent);
  border-top-color: #0b63ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.status-label {
  font-size: 0.84rem;
  color: var(--text);
  opacity: 0.8;
}

/* ---- News Card ---- */
.message-text :deep(.news-card) {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin: 0.6rem 0;
  padding: 0.85rem 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.6rem;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
  position: relative;
  overflow: hidden;
}

.message-text :deep(.news-card::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #0b63ff;
  border-radius: 0 2px 2px 0;
}

.message-text :deep(.news-card:hover) {
  border-color: color-mix(in srgb, #0b63ff 40%, var(--border));
  box-shadow: 0 2px 12px rgba(11, 99, 255, 0.08);
}

.message-text :deep(.news-card-title) {
  font-weight: 600;
  font-size: 0.88rem;
  color: var(--text);
  line-height: 1.4;
}

.message-text :deep(.news-card-desc) {
  font-size: 0.8rem;
  color: var(--muted);
  line-height: 1.5;
}

.message-text :deep(.news-card-link) {
  font-size: 0.75rem;
  color: #0b63ff;
  opacity: 0.8;
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

.message-text :deep(strong) {
  font-weight: 700;
}

/* ---- Responsive ---- */
@media (max-width: 768px) {
  .chat-sidebar {
    display: none;
  }

  .chat-messages {
    padding: 1rem;
  }

  .chat-input-area {
    padding: 0.75rem 1rem 1rem;
  }
}
</style>
