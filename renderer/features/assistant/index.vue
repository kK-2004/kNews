<template>
  <div class="assistant-page">
    <aside class="chat-sidebar">
      <div class="sidebar-cta">
        <button class="new-chat-btn" type="button" @click="onNewChat">
          <span class="i-tabler-plus" aria-hidden="true"></span>
          新建会话
        </button>
      </div>
      <div class="session-section">
        <div class="session-label">最近会话</div>
        <button
          v-for="s in chatStore.sessions"
          :key="s.id"
          :class="['session-item', { active: s.id === chatStore.currentSessionId }]"
          type="button"
          @click="chatStore.selectSession(s.id)"
        >
          <span class="session-title">{{ s.title || '新对话' }}</span>
          <span class="i-tabler-x session-delete" @click.stop="onDelete(s.id)"></span>
        </button>
        <div v-if="chatStore.sessions.length === 0" class="session-empty">暂无对话</div>
      </div>
      <div class="sidebar-footer">
        <RouterLink class="sidebar-nav-item" to="/">
          <span class="i-tabler-arrow-left" aria-hidden="true"></span>
          <span>返回首页</span>
        </RouterLink>
      </div>
    </aside>

    <main class="chat-main">
      <div ref="messagesRef" class="chat-messages" @scroll="onMessagesScroll">
        <div v-if="chatStore.messages.length === 0 && !chatStore.isCurrentSessionStreaming" class="empty-state">
          <h3 class="empty-title">我可以如何协助你的研究？</h3>
          <p class="empty-desc">这里可以进行热点解读、信息整合、实时追踪与问题分析。</p>
        </div>

        <div
          v-for="(msg, idx) in chatStore.messages"
          :key="idx"
          :class="['message-row', msg.role]"
        >
          <div v-if="msg.role === 'assistant'" class="avatar avatar-ai">
            <span class="i-tabler-robot" aria-hidden="true"></span>
          </div>
          <div :class="['message-stack', msg.role]">
            <div :class="['message-bubble', msg.role]">
              <template v-if="msg.role === 'assistant'">
                <div v-if="hasHotTopics(msg.hotTopics)" class="hot-topics-card">
                  <div class="hot-topics-card-header">
                    <span class="hot-topics-card-title">热点速览</span>
                    <span class="hot-topics-card-meta">{{ formatHotTopicsMeta(msg.hotTopics) }}</span>
                  </div>
                  <div class="hot-topics-sections">
                    <section v-for="section in msg.hotTopics.sections" :key="section.sourceId" class="hot-topics-section">
                      <div class="hot-topics-section-title">{{ section.sourceName }}</div>
                      <div
                        v-for="(item, itemIndex) in section.items"
                        :key="item.id"
                        class="news-row hot-topics-news-row"
                        role="button"
                        tabindex="0"
                        @click="openUrl(item.url)"
                        @keydown.enter.prevent="openUrl(item.url)"
                        @keydown.space.prevent="openUrl(item.url)"
                      >
                        <div class="news-row-index" :style="getNewsIndexStyle(section.sourceId)">{{ itemIndex + 1 }}</div>
                        <div class="news-row-body">
                          <div class="news-row-title">
                            {{ item.title }}
                            <!-- <span v-if="item.sourceName" class="news-row-source">{{ item.sourceName }}</span> -->
                          </div>
                          <div v-if="item.summary" class="news-row-desc hot-topic-item-summary">{{ item.summary }}</div>
                          <div v-else-if="item.summaryStatus === 'loading'" class="news-row-desc hot-topic-item-summary loading" aria-hidden="true">
                            <span></span><span></span><span></span>
                          </div>
                          <div v-else-if="item.summaryStatus === 'empty'" class="news-row-desc hot-topic-item-summary placeholder">暂无摘要</div>
                          <div v-else-if="item.summaryStatus === 'error'" class="news-row-desc hot-topic-item-summary placeholder error">摘要加载失败</div>
                          <div v-else-if="item.summaryStatus === 'aborted'" class="news-row-desc hot-topic-item-summary placeholder">摘要已取消</div>
                          <div class="hot-topic-item-meta">
                            <span v-if="item.publishedAt">{{ item.publishedAt }}</span>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
                <div v-if="msg.content" class="message-text" v-html="renderMarkdown(msg.content)"></div>
              </template>
              <div v-else class="message-text">{{ msg.content }}</div>
            </div>
            <div v-if="msg.timestamp" class="message-time">{{ formatMessageTime(msg.timestamp) }}</div>
          </div>
          <div v-if="msg.role === 'user'" class="avatar avatar-user">
            <span class="i-tabler-user" aria-hidden="true"></span>
          </div>
        </div>

        <div
          v-if="chatStore.isCurrentSessionStreaming || chatStore.statusEvents.length > 0 || chatStore.streamingThinking || chatStore.streamingContent !== null"
          class="message-row assistant"
        >
          <div class="avatar avatar-ai">
            <span class="i-tabler-robot" aria-hidden="true"></span>
          </div>
          <div class="message-bubble assistant streaming pending-bubble">
            <div v-if="hasHotTopics(chatStore.pendingHotTopics)" class="hot-topics-card pending-hot-topics-card">
              <div class="hot-topics-card-header">
                <span class="hot-topics-card-title">热点速览</span>
                <span class="hot-topics-card-meta">{{ formatHotTopicsMeta(chatStore.pendingHotTopics) }}</span>
              </div>
              <div class="hot-topics-sections">
                <section
                  v-for="section in chatStore.pendingHotTopics.sections"
                  :key="section.sourceId"
                  class="hot-topics-section"
                >
                  <div class="hot-topics-section-title">{{ section.sourceName }}</div>
                  <div
                    v-for="(item, itemIndex) in section.items"
                    :key="item.id"
                    class="news-row hot-topics-news-row"
                    role="button"
                    tabindex="0"
                    @click="openUrl(item.url)"
                    @keydown.enter.prevent="openUrl(item.url)"
                    @keydown.space.prevent="openUrl(item.url)"
                  >
                    <div class="news-row-index" :style="getNewsIndexStyle(section.sourceId)">{{ itemIndex + 1 }}</div>
                    <div class="news-row-body">
                      <div class="news-row-title">
                        {{ item.title }}
                        <!-- <span v-if="item.sourceName" class="news-row-source">{{ item.sourceName }}</span> -->
                      </div>
                      <div v-if="item.summary" class="news-row-desc hot-topic-item-summary">{{ item.summary }}</div>
                      <div v-else-if="item.summaryStatus === 'loading'" class="news-row-desc hot-topic-item-summary loading" aria-hidden="true">
                        <span></span><span></span><span></span>
                      </div>
                      <div v-else-if="item.summaryStatus === 'empty'" class="news-row-desc hot-topic-item-summary placeholder">暂无摘要</div>
                      <div v-else-if="item.summaryStatus === 'error'" class="news-row-desc hot-topic-item-summary placeholder error">摘要加载失败</div>
                      <div v-else-if="item.summaryStatus === 'aborted'" class="news-row-desc hot-topic-item-summary placeholder">摘要已取消</div>
                      <div class="hot-topic-item-meta">
                        <span v-if="item.publishedAt">{{ item.publishedAt }}</span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>

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

      <button
        v-if="showScrollToBottom"
        class="scroll-to-bottom-btn"
        type="button"
        aria-label="滚动到底部"
        title="滚动到底部"
        @click="scrollToLatest"
      >
        <span class="i-tabler-chevron-down scroll-to-bottom-icon" aria-hidden="true"></span>
      </button>

      <div class="chat-input-area">
        <div class="input-container">
          <div v-if="hotTopics.length > 0 && chatStore.messages.length === 0" class="action-chips">
            <button
              v-for="topic in hotTopics"
              class="action-chip"
              type="button"
              @click="onHotTopic(topic)"
            >
              <span class="i-tabler-trending-up" aria-hidden="true"></span>
              {{ topic.query }}
            </button>
          </div>
          <div class="input-wrapper">
            <textarea
              ref="inputRef"
              v-model="inputText"
              class="chat-textarea"
              placeholder="问 K-Ai 任何问题..."
              rows="1"
              :disabled="chatStore.isCurrentSessionStreaming"
              @keydown.enter.exact.prevent="onSend"
              @input="autoResize"
            ></textarea>
            <button
              v-if="chatStore.isCurrentSessionStreaming"
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
          <div class="input-footer">
            人工智能模型可能会生成不准确的内容。重要信息请务必核实。
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import { useChatStore } from '@/stores/use-chat-store'
import sourcesMap from '@/shared/data/newsnow-sources.json'

const chatStore = useChatStore()
const inputText = ref('')
const inputRef = ref(null)
const messagesRef = ref(null)
const autoStickToBottom = ref(true)
const showScrollToBottom = ref(false)
const scrollBottomThreshold = 48

const hotTopics = ref([
  {
    'query':'今天有什么热点新闻？',
    'isHotTopic':true
  },
  {
    'query':'给我讲个故事',
    'isHotTopic':false
  },
  {
    'query':'帮我总结一下今日时事',
    'isHotTopic':true
  },
])

const sourceColorMap = {
  red: '#d45555',
  blue: '#4d6bfe',
  green: '#2f9f70',
  gray: '#5c6475',
  orange: '#c58b2a',
  indigo: '#5564d6',
  emerald: '#198f6c',
  teal: '#1f8d8d',
  slate: '#5b6780'
}

function resolveSourceAccent(sourceId) {
  const source = sourcesMap?.[sourceId] || {}
  const color = source.color
  if (!color) return '#4d6bfe'
  if (String(color).startsWith('#') || String(color).startsWith('rgb') || String(color).startsWith('hsl')) {
    return color
  }
  return sourceColorMap[color] || '#4d6bfe'
}

function getContrastTextColor(color) {
  const hex = String(color || '').replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return '#ffffff'
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  const luminance = (0.299 * r) + (0.587 * g) + (0.114 * b)
  return luminance > 170 ? '#111111' : '#ffffff'
}

function getNewsIndexStyle(sourceId) {
  const accent = resolveSourceAccent(sourceId)
  return {
    backgroundColor: accent,
    color: getContrastTextColor(accent)
  }
}

onMounted(async () => {
  await chatStore.loadSessions()
  nextTick(() => scrollToBottom(true))
})

watch(
  () => chatStore.messages.length,
  () => syncScrollAfterUpdate(),
)
watch(
  () => chatStore.sending,
  (v) => {
    if (v) {
      autoStickToBottom.value = true
      showScrollToBottom.value = false
      syncScrollAfterUpdate(true)
    }
  },
)
watch(
  () => chatStore.streamingContent,
  () => syncScrollAfterUpdate(),
)
watch(
  () => chatStore.statusEvents.length,
  () => syncScrollAfterUpdate(),
)
watch(
  () => chatStore.streamingThinking,
  () => syncScrollAfterUpdate(),
)

onBeforeUnmount(() => {
  autoStickToBottom.value = true
  showScrollToBottom.value = false
})

function getDistanceFromBottom() {
  const el = messagesRef.value
  if (!el) return 0
  return Math.max(0, el.scrollHeight - el.scrollTop - el.clientHeight)
}

function syncScrollState() {
  const distance = getDistanceFromBottom()
  const isNearBottom = distance <= scrollBottomThreshold
  autoStickToBottom.value = isNearBottom
  showScrollToBottom.value = !isNearBottom
}

function onMessagesScroll() {
  syncScrollState()
}

function scrollToBottom(force = false) {
  const el = messagesRef.value
  if (!el || (!force && !autoStickToBottom.value)) return
  el.scrollTop = el.scrollHeight
  autoStickToBottom.value = true
  showScrollToBottom.value = false
}

function syncScrollAfterUpdate(force = false) {
  nextTick(() => scrollToBottom(force))
}

function scrollToLatest() {
  scrollToBottom(true)
}

function autoResize(e) {
  const ta = e.target
  ta.style.height = 'auto'
  ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
}

async function onNewChat() {
  await chatStore.createSession()
  autoStickToBottom.value = true
  showScrollToBottom.value = false
  syncScrollAfterUpdate(true)
  nextTick(() => inputRef.value?.focus())
}

async function onSend() {
  const text = inputText.value.trim()
  if (!text || chatStore.sending) return
  inputText.value = ''
  if (inputRef.value) {
    inputRef.value.style.height = 'auto'
  }
  autoStickToBottom.value = true
  showScrollToBottom.value = false
  await chatStore.sendMessage(text)
  nextTick(() => inputRef.value?.focus())
}

async function onDelete(sessionId) {
  const session = chatStore.sessions.find((item) => item.id === sessionId)
  const sessionTitle = session?.title || '新对话'
  if (!confirm(`确定要删除会话“${sessionTitle}”吗？此操作不可撤销。`)) {
    return
  }
  await chatStore.deleteSession(sessionId)
}

async function onHotTopic(topic) {
  inputText.value = ''
  await chatStore.sendMessage(topic?.query || '', { isHotTopic: Boolean(topic?.isHotTopic) })
}

function openUrl(url) {
  if (!url) return
  window.open(url, '_blank')
}

function statusClass(status) {
  return `status-${status || 'info'}`
}

function formatLatestStatus(event) {
  if (event?.status === 'ready' || event?.status === 'failed' || event?.status === 'empty') {
    return event?.detail || ''
  }

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

function hasHotTopics(payload) {
  return Array.isArray(payload?.sections) && payload.sections.some((section) => Array.isArray(section?.items) && section.items.length > 0)
}

function formatHotTopicsMeta(payload) {
  const totalSources = Number(payload?.totalSources || 0)
  const totalItems = Number(payload?.totalItems || 0)
  return `${totalSources} 个来源 · ${totalItems} 条热点`
}

function formatMessageTime(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const isSameYear = date.getFullYear() === now.getFullYear()
  const isSameDay = isSameYear
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()

  if (isSameDay) {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isSameYear) {
    const datePart = `${date.getMonth() + 1}月${date.getDate()}日`
    const timePart = date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return `${datePart} ${timePart}`
  }

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

/**
 * Render assistant markdown content into HTML with clickable news cards.
 */
function renderMarkdown(text) {
  if (!text) return ''
  const normalized = String(text)
    .replace(/\r/g, '')
    .trim()
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

  // 插入新闻卡片 HTML 节点，并在换行转换前清理块级元素周围的结构性换行
  newsTokens.forEach((item, idx) => {
    const token = `@@NEWS_${idx}@@`
    const sourceTag = item.source ? `<span class="news-row-source">${escapeHtml(item.source)}</span>` : ''
    html = html.replace(
      token,
      `<div class="news-row" onclick="window._openNewsUrl('${escapeAttr(item.url)}')"><div class="news-row-index">${escapeHtml(item.order)}</div><div class="news-row-body"><div class="news-row-title">${escapeHtml(item.title)}${sourceTag}</div><div class="news-row-desc">${escapeHtml(item.desc.trim())}</div></div></div>`
    )
  })

  html = html.replace(/\n+(?=<div class="(?:md-heading|md-list-item|news-row)\b)/g, '')
  html = html.replace(/(<\/div>)\n+(?=(?:<div class="(?:md-heading|md-list-item|news-row)\b)|$)/g, '$1')

  html = html.replace(/\n{3,}/g, '<br><br>')
  html = html.replace(/\n{2}/g, '<br><br>')
  html = html.replace(/\n/g, '<br>')

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
  height: calc(100dvh - 4rem);
  margin: -1.5rem -2rem -2rem;
  overflow: hidden;
  background: var(--bg);
}

/* ---- Sidebar ---- */
.chat-sidebar {
  width: 16rem;
  background: color-mix(in srgb, var(--surface-container-low) 40%, var(--surface));
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 1.5rem 0 1rem;
  flex-shrink: 0;
  overflow: hidden;
}

.sidebar-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0 1.25rem;
  margin-bottom: 1.5rem;
}

.sidebar-logo {
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius);
  background: var(--primary-container);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.sidebar-brand {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
}

.sidebar-version {
  font-size: 0.6rem;
  color: var(--on-surface-variant);
  opacity: 0.6;
}

.sidebar-cta {
  padding: 0 0.75rem;
  margin-bottom: 0.75rem;
}

.new-chat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.55rem;
  border-radius: var(--radius);
  border: none;
  background: var(--primary);
  color: var(--on-primary);
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.15s;
}

.new-chat-btn:hover {
  background: var(--primary-dim);
}

.new-chat-btn span:first-child {
  font-size: 1.1rem;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0 0.5rem;
  margin-bottom: 0.5rem;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.75rem;
  border-radius: var(--radius);
  color: var(--on-surface-variant);
  font-size: 0.85rem;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
  border-right: 2px solid transparent;
  cursor: pointer;
}

.sidebar-nav-item:hover {
  background: color-mix(in srgb, var(--surface-container) 80%, transparent);
  color: var(--text);
}

.sidebar-nav-item.active {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
  border-right-color: var(--primary);
  font-weight: 600;
}

.sidebar-nav-item span:first-child {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.session-section {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0 0.5rem;
  margin-top: 0.75rem;
}

.session-label {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--on-surface-variant);
  padding: 0 0.75rem;
  margin-bottom: 0.4rem;
  opacity: 0.7;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.35rem 0.6rem;
  border-radius: var(--radius);
  border: none;
  background: transparent;
  color: var(--on-surface-variant);
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  text-align: left;
}

.session-item:hover {
  background: var(--surface-container);
  color: var(--primary);
}

.session-item.active {
  color: var(--primary);
  font-weight: 600;
}

.session-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-delete {
  opacity: 0;
  font-size: 0.8rem;
  width: 1.5rem;
  height: 1.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: var(--radius);
  color: var(--on-surface-variant);
  transition: opacity 0.15s, background 0.15s, color 0.15s;
  flex-shrink: 0;
}

.session-item:hover .session-delete {
  opacity: 0.55;
}

.session-delete:hover {
  opacity: 1 !important;
  background: #d92d20;
  color: #ffffff;
  box-shadow: 0 0 0 1px rgba(217, 45, 32, 0.22);
}

.session-empty {
  color: var(--on-surface-variant);
  font-size: 0.78rem;
  text-align: center;
  padding: 1.5rem 0;
  opacity: 0.6;
}

.sidebar-footer {
  margin-top: auto;
  padding: 0.75rem 0.5rem 0;
  border-top: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

/* ---- Main ---- */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--bg);
  position: relative;
}

/* ---- Messages ---- */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 2rem 2rem 3.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: relative;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 0.5rem;
  color: var(--on-surface-variant);
  text-align: center;
  max-width: 42rem;
  margin: 3rem auto 0;
  width: 100%;
}

.empty-title {
  font-size: 2rem;
  font-weight: 800;
  color: var(--text);
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.empty-desc {
  font-size: 0.88rem;
  margin: 0;
  opacity: 0.7;
}

.message-row {
  display: flex;
  gap: 0.75rem;
  max-width: 48rem;
  width: 100%;
  margin: 0 auto;
}

.message-row.user {
  justify-content: flex-end;
  width: 100%;
  max-width: 100%;
}

.message-row.assistant {
  justify-content: flex-start;
}

.message-stack {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.message-stack.user {
  align-items: flex-end;
}

.message-stack.assistant {
  align-items: flex-start;
}

.avatar {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1.15rem;
}

.avatar-ai {
  background: var(--primary);
  color: var(--on-primary);
}

.avatar-user {
  background: var(--surface-container-high);
  color: var(--on-surface-variant);
  border: 1px solid var(--border);
}

.message-bubble {
  max-width: 78%;
  padding: 0.85rem 1.1rem;
  border-radius: var(--radius-xl);
  line-height: 1.6;
  font-size: 0.9rem;
}

.message-bubble.user {
  width: fit-content;
  max-width: 100%;
  min-width: 2.5em;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
  background: var(--primary-container);
  color: var(--on-primary-container);
  border-top-right-radius: 2px;
}

.message-bubble.assistant {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-top-left-radius: 2px;
  box-shadow: var(--shadow-sm);
  width: fit-content;
  max-width: min(44rem, calc(100vw - 8rem));
  flex: 0 1 auto;
  border-left: 3px solid var(--primary);
  padding-left: 1rem;
}

.message-bubble.loading {
  padding: 1rem 1.5rem;
}

.message-bubble.streaming {
  padding-right: 1.1rem;
}

.message-time {
  color: var(--on-surface-variant);
  font-size: 0.7rem;
  line-height: 1;
  padding: 0 0.2rem;
  opacity: 0.6;
  transition: opacity 0.15s ease;
}

.message-stack:hover .message-time {
  opacity: 1;
}

.cursor-blink {
  display: inline;
  color: var(--primary);
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
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 999px;
  background: var(--primary);
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

.message-text :deep(br + .md-heading),
.message-text :deep(div + br) {
  display: none;
}

.hot-topics-card + .message-text {
  margin-top: 0.9rem;
}

.message-text :deep(.md-heading) {
  margin: 1rem 0 0.5rem;
  font-weight: 800;
  line-height: 1.25;
  color: var(--text);
}

.message-text :deep(.md-heading:first-child) {
  margin-top: 0;
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
  margin: 0 0 0.2rem;
}

.pending-bubble {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--primary) 3%, var(--surface)) 0%, var(--surface) 100%);
}

.hot-topics-card {
  background: var(--surface-container-low);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  display: grid;
  gap: 0.9rem;
  padding: 1rem;
  position: relative;
}

.pending-hot-topics-card {
  padding-top: 0;
}

.hot-topics-card-header {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem 0.7rem;
  justify-content: space-between;
}

.hot-topics-card-title {
  color: var(--text);
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.hot-topics-card-meta {
  color: var(--muted);
  font-size: 0.76rem;
}

.hot-topics-sections {
  display: grid;
  gap: 0.75rem;
}

.hot-topics-section {
  display: grid;
  gap: 0.5rem;
}

.hot-topics-section-title {
  color: var(--primary);
  font-size: 0.8rem;
  font-weight: 700;
}

.hot-topics-news-row {
  align-items: flex-start;
  cursor: pointer;
  display: flex;
  gap: 1rem;
  margin: 0.2rem 0;
  padding: 0;
  transition: transform 0.12s ease, opacity 0.12s ease;
}

.hot-topics-news-row:hover {
  transform: translateX(2px);
  opacity: 0.96;
}

.hot-topics-news-row .news-row-index {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: var(--radius-lg);
  background: var(--primary-container);
  color: var(--on-primary-container);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
  flex-shrink: 0;
}

.hot-topics-news-row .news-row-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.1rem;
}

.hot-topics-news-row .news-row-title {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--text);
  line-height: 1.3;
}

.hot-topics-news-row .news-row-desc {
  font-size: 0.9rem;
  color: var(--on-surface-variant);
  line-height: 1.5;
}

.hot-topics-news-row .news-row-source {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius);
  margin-left: 0.4rem;
  vertical-align: middle;
}

.hot-topic-item-summary {
  min-height: 1.35rem;
}

.hot-topic-item-summary.placeholder {
  align-items: center;
  display: inline-flex;
  opacity: 0.82;
}

.hot-topic-item-summary.placeholder.error {
  color: var(--error);
}

.hot-topic-item-summary.loading {
  align-items: center;
  display: inline-flex;
  gap: 0.28rem;
}

.hot-topic-item-summary.loading span {
  animation: hot-topic-summary-bounce 1.1s infinite;
  background: color-mix(in srgb, var(--primary) 72%, var(--muted));
  border-radius: 999px;
  height: 0.28rem;
  width: 0.28rem;
}

.hot-topic-item-summary.loading span:nth-child(2) {
  animation-delay: 0.14s;
}

.hot-topic-item-summary.loading span:nth-child(3) {
  animation-delay: 0.28s;
}

@keyframes hot-topic-summary-bounce {
  0%, 80%, 100% {
    opacity: 0.35;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-0.12rem);
  }
}

.hot-topic-item-meta {
  color: var(--muted);
  display: flex;
  flex-wrap: wrap;
  font-size: 0.74rem;
  gap: 0.35rem 0.55rem;
}

.theme-dark .hot-topics-news-row .news-row-index {
  background: color-mix(in srgb, var(--primary) 25%, var(--surface));
  color: var(--primary-container);
}

.theme-dark .hot-topics-news-row .news-row-title {
  color: var(--text);
}

.theme-dark .hot-topics-news-row .news-row-desc {
  color: var(--muted);
}

.theme-dark .hot-topics-news-row .news-row-source {
  color: var(--primary-container);
  background: color-mix(in srgb, var(--primary) 18%, transparent);
}

.pending-text {
  padding-top: 0.1rem;
}

.chat-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--error);
  font-size: 0.88rem;
  padding: 0.75rem 1rem;
  background: color-mix(in srgb, var(--error) 8%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--error) 20%, var(--border));
  border-radius: var(--radius-lg);
  max-width: 50rem;
  margin: 0 auto;
  width: 100%;
}

.scroll-to-bottom-btn {
  position: fixed;
  right: 2rem;
  bottom: 6.25rem;
  width: 3rem;
  height: 3rem;
  border: 1px solid color-mix(in srgb, var(--text) 8%, var(--border));
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface) 94%, white);
  color: var(--text);
  box-shadow: 0 10px 40px rgba(27, 27, 27, 0.1);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    background 0.25s ease,
    border-color 0.25s ease;
  z-index: 60;
  backdrop-filter: blur(12px);
}

.scroll-to-bottom-btn:hover {
  transform: translateY(-1px);
  background: color-mix(in srgb, var(--surface) 98%, white);
  border-color: color-mix(in srgb, var(--text) 14%, var(--border));
  box-shadow: 0 15px 50px rgba(27, 27, 27, 0.15);
}

.scroll-to-bottom-btn:active {
  transform: scale(0.95);
}

.scroll-to-bottom-icon {
  font-size: 1.35rem;
  transition: transform 0.25s ease;
}

.scroll-to-bottom-btn:hover .scroll-to-bottom-icon {
  transform: translateY(2px);
}

.theme-dark .scroll-to-bottom-btn {
  background: color-mix(in srgb, var(--surface) 92%, black);
  border-color: color-mix(in srgb, var(--outline-variant) 60%, var(--border));
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.32);
}

.theme-dark .scroll-to-bottom-btn:hover {
  background: color-mix(in srgb, var(--surface) 96%, black);
  border-color: color-mix(in srgb, var(--outline) 50%, var(--border));
  box-shadow: 0 18px 56px rgba(0, 0, 0, 0.4);
}

/* ---- Input ---- */
.chat-input-area {
  padding: 1rem 2rem 1.5rem;
  flex-shrink: 0;
}

.input-container {
  max-width: 48rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.action-chips {
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
  scrollbar-width: none;
}

.action-chips::-webkit-scrollbar {
  display: none;
}

.action-chip {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent);
  background: var(--surface-container-low);
  color: var(--on-surface-variant);
  font-size: 0.78rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.action-chip span:first-child {
  font-size: 0.85rem;
}

.action-chip:hover {
  background: var(--surface-container);
  border-color: var(--outline-variant);
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 0.25rem;
  background: var(--surface-container-highest);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 0.4rem;
  box-shadow: var(--shadow-md);
}

.attach-btn {
  align-items: center;
  background: transparent;
  border: none;
  color: var(--on-surface-variant);
  cursor: default;
  display: inline-flex;
  font-size: 1.1rem;
  height: 2.5rem;
  justify-content: center;
  min-height: 2.5rem;
  padding: 0;
  width: 2.5rem;
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
  border-radius: var(--radius-lg);
  border: none;
  background: var(--primary);
  color: var(--on-primary);
  cursor: pointer;
  flex-shrink: 0;
  font-size: 1.1rem;
  transition: transform 0.12s, opacity 0.15s;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--primary) 25%, transparent);
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
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  flex-shrink: 0;
  font-size: 0.85rem;
  transition: transform 0.12s, background 0.15s;
}

.stop-btn:hover {
  background: color-mix(in srgb, var(--error) 10%, var(--surface));
  border-color: color-mix(in srgb, var(--error) 30%, var(--border));
  transform: scale(1.05);
}

.input-footer {
  text-align: center;
  font-size: 0.6rem;
  color: var(--on-surface-variant);
  opacity: 0.4;
  padding-top: 0.15rem;
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
  border: 1px solid color-mix(in srgb, var(--primary) 16%, var(--border));
}

.status-start,
.status-ready {
  color: var(--primary);
}

.status-success {
  border: 1px solid color-mix(in srgb, #2a8f55 20%, var(--border));
  background: color-mix(in srgb, #2a8f55 6%, var(--surface));
  color: #2a8f55;
}

.status-skipped,
.status-empty {
  border: 1px solid color-mix(in srgb, var(--tertiary) 22%, var(--border));
  background: color-mix(in srgb, var(--tertiary) 7%, var(--surface));
  color: var(--tertiary);
}

.status-failed {
  border: 1px solid color-mix(in srgb, var(--error) 20%, var(--border));
  background: color-mix(in srgb, var(--error) 7%, var(--surface));
  color: var(--error);
}

.thinking-panel {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.68rem 0.78rem;
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--primary-container) 20%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--primary) 18%, var(--border));
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
  color: var(--primary-dim);
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
  background: var(--primary);
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
  color: var(--on-surface-variant);
  white-space: pre-wrap;
  word-break: break-word;
}

.thinking-preview {
  font-size: 0.8rem;
  line-height: 1.4;
  color: var(--on-surface-variant);
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
  border-radius: var(--radius-lg);
  background: var(--primary-container);
  color: var(--on-primary-container);
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
  color: var(--text);
  line-height: 1.3;
}

.message-text :deep(.news-row-desc) {
  font-size: 0.9rem;
  color: var(--on-surface-variant);
  line-height: 1.5;
}

.message-text :deep(.news-row-source) {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius);
  margin-left: 0.4rem;
  vertical-align: middle;
}

.message-text :deep(.md-link) {
  color: var(--primary);
  text-decoration: none;
}

.message-text :deep(.md-link:hover) {
  text-decoration: underline;
}

.message-text :deep(.list-num) {
  color: var(--primary);
  font-weight: 700;
}

.message-text :deep(.list-bullet) {
  color: var(--primary);
  font-weight: bold;
  margin-right: 0.5rem;
}

.message-text :deep(strong) {
  font-weight: 700;
}

/* Dark theme overrides for news cards */
.theme-dark .message-text :deep(.news-row-index) {
  background: color-mix(in srgb, var(--primary) 25%, var(--surface));
  color: var(--primary-container);
}

.theme-dark .message-text :deep(.news-row-title) {
  color: var(--text);
}

.theme-dark .message-text :deep(.news-row-desc) {
  color: var(--muted);
}

.theme-dark .message-text :deep(.news-row-source) {
  color: var(--primary-container);
  background: color-mix(in srgb, var(--primary) 18%, transparent);
}

.theme-dark .message-text :deep(.md-heading) {
  color: var(--text);
}

.theme-dark .message-text :deep(.md-link) {
  color: var(--primary-container);
}

/* ---- Responsive ---- */
@media (max-width: 768px) {
  .chat-sidebar {
    display: none;
  }

  .chat-messages {
    padding: 1rem 1rem 2rem;
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
