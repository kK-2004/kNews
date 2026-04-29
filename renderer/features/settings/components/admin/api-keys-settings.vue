<template>
  <section v-if="!isAdmin" class="admin-apikeys">
    <p class="access-denied">仅管理员可访问 API Key 管理</p>
  </section>
  <section v-else class="admin-apikeys">
    <header class="page-header">
      <div>
        <h3 class="page-title">API 分析</h3>
        <p class="page-subtitle">监控系统调用趋势、Key 活跃情况与整体访问负载。</p>
      </div>
      <div class="page-actions">
        <span class="system-status">
          <span class="status-pulse"></span>
          系统正常
        </span>
        <base-button @click="loadAnalytics">
          <span class="i-tabler-refresh" style="font-size:0.9rem" aria-hidden="true"></span>
          刷新
        </base-button>
      </div>
    </header>

    <div class="filter-bar">
      <div class="filter-inputs">
        <el-select
          v-model="dateRange"
          class="date-select"
          placeholder="选择时间范围"
        >
          <el-option label="最近 7 天" value="7days" />
          <el-option label="最近 30 天" value="30days" />
        </el-select>
        <el-select
          v-model="selectedKey"
          class="key-select"
          placeholder="全部 API Key"
        >
          <el-option label="全部 API Key" value="" />
          <el-option
            v-for="key in apikeys"
            :key="key.id"
            :label="`${key.name || '未命名'} (${key.username || '未知'})`"
            :value="key.id"
          />
        </el-select>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-top">
          <p class="stat-label">API Key 总数</p>
          <span class="i-tabler-key stat-icon" aria-hidden="true"></span>
        </div>
        <p class="stat-value">{{ apikeys.length }}</p>
      </div>
      <div class="stat-card">
        <div class="stat-top">
          <p class="stat-label">总调用次数</p>
          <span class="i-tabler-activity stat-icon" aria-hidden="true"></span>
        </div>
        <p class="stat-value">{{ totalCalls }}</p>
      </div>
      <div class="stat-card">
        <div class="stat-top">
          <p class="stat-label">活跃 Key</p>
          <span class="i-tabler-wifi stat-icon" aria-hidden="true"></span>
        </div>
        <p class="stat-value">{{ activeKeys }}</p>
      </div>
    </div>

    <div class="mid-row">
      <div class="hourly-section">
        <div class="section-header-row">
          <h4>每小时调用趋势</h4>
          <div class="time-tabs">
            <button
              v-for="opt in dateOptions"
              :key="opt.value"
              :class="['time-tab', dateRange === opt.value ? 'active' : '']"
              @click="dateRange = opt.value"
            >{{ opt.label }}</button>
          </div>
        </div>
        <div v-if="hourlySeries.length === 0" class="empty-state">
          <p>暂无小时级日志</p>
        </div>
        <div v-else class="line-chart-card">
          <div class="chart-hint">
            <span>单位：调用次数</span>
            <span>时区：{{ localTimeZone }}</span>
          </div>
          <div class="line-chart-wrap">
            <div ref="chartEl" class="line-chart" role="img" aria-label="API 每小时调用趋势图" />
          </div>
        </div>
      </div>

      <div class="ranking-section">
        <h4 class="ranking-title">
          <span class="i-tabler-flame ranking-icon" aria-hidden="true"></span>
          热门 Key 排行
        </h4>
        <div v-if="leaderboard.length > 0" class="ranking-list">
          <template v-for="(item, index) in leaderboard" :key="item.id">
            <div class="ranking-item">
              <div class="ranking-info">
                <span class="ranking-name">{{ item.apiKeyName || '未命名' }}</span>
                <span class="ranking-meta">{{ formatNumber(item.calls || 0) }} 次调用</span>
              </div>
              <div class="ranking-bar-track">
                <div class="ranking-bar-fill" :style="{ width: getBarWidth(item.calls) }"></div>
              </div>
            </div>
            <div v-if="index < leaderboard.length - 1" class="ranking-divider"></div>
          </template>
        </div>
        <div v-else class="ranking-empty">
          <span class="i-tabler-chart-bar-off ranking-empty-icon" aria-hidden="true"></span>
          <p>{{ loading ? '正在加载排行数据…' : '暂无热门 Key 数据' }}</p>
        </div>
      </div>
    </div>

    <div class="table-section">
      <div class="table-header">
        <h4>活跃客户端 Key</h4>
        <div class="table-search">
          <span class="i-tabler-search table-search-icon" aria-hidden="true"></span>
          <input
            v-model="searchQuery"
            class="table-search-input"
            placeholder="搜索 Key 名称或用户"
            type="text"
          />
        </div>
      </div>
      <div v-if="loading" class="empty-state">
        <span class="loading-spinner" />
        <p>加载中…</p>
      </div>
      <div v-else-if="filteredApiKeys.length === 0" class="empty-state">
        <p>暂无 API Key</p>
      </div>
      <template v-else>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Key 名称</th>
                <th>状态</th>
                <th class="text-right">调用次数</th>
                <th class="text-right">额度</th>
                <th class="text-right">最近使用</th>
                <th class="text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="key in filteredApiKeys" :key="key.id">
                <td>
                  <div class="key-cell">
                    <div class="key-avatar">{{ (key.name || 'K')[0].toUpperCase() }}</div>
                    <div>
                      <div class="key-cell-name">
                        {{ key.name || '未命名 Key' }}
                        <span v-if="key.is_default" class="badge-default">内置</span>
                      </div>
                      <div class="key-cell-code">{{ key.username || '未知' }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span :class="['status-badge', getKeyStatus(key) === 'active' ? 'active' : 'inactive']">
                    <span class="status-dot"></span>
                    {{ getKeyStatus(key) === 'active' ? '活跃' : '空闲' }}
                  </span>
                </td>
                <td class="text-right font-mono">{{ formatNumber(Number(key.callCount || key.call_count || 0)) }}</td>
                <td class="text-right">
                  <div class="quota-cell">
                    <span>{{ formatQuotaLabel(key) }}</span>
                    <div class="quota-bar-track">
                      <div class="quota-bar-fill" :style="{ width: getQuotaPercent(key) + '%', background: getQuotaColor(key) }"></div>
                    </div>
                  </div>
                </td>
                <td class="text-right font-mono text-xs">{{ formatLastCall(key.lastCallTime) }}</td>
                <td class="text-center">
                  <div class="row-actions">
                    <button class="row-action-btn" title="限流" @click="editRateLimit(key)">
                      <span class="i-tabler-adjustments" aria-hidden="true"></span>
                    </button>
                    <button v-if="!key.is_default" class="row-action-btn danger" title="删除" @click="deleteAPIKey(key)">
                      <span class="i-tabler-trash" aria-hidden="true"></span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="table-footer">
          <span class="table-footer-info">当前显示 {{ filteredApiKeys.length }} / {{ apikeys.length }} 个 Key</span>
        </div>
      </template>
    </div>

    <base-modal :open="showRateLimitModal" @close="closeRateLimitModal">
      <template #title>
        <h3 class="modal-title">设置限流</h3>
      </template>
      <div class="rate-limit-modal">
        <p class="rate-limit-desc">
          为 <strong>{{ editingKey?.name || '未命名 Key' }}</strong> 设置每小时请求上限。
        </p>
        <label class="rate-limit-field">
          <span>请求/小时</span>
          <input v-model.number="editingRateLimit" type="number" min="-1" step="1">
          <small>-1 表示不限</small>
        </label>
        <div class="modal-actions">
          <base-button variant="secondary" @click="closeRateLimitModal">取消</base-button>
          <base-button @click="saveRateLimit">保存</base-button>
        </div>
      </div>
    </base-modal>
  </section>
</template>

<script setup>
import * as echarts from 'echarts'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseButton from '@/shared/components/base-button.vue'
import BaseModal from '@/shared/components/base-modal.vue'
import { useAdminMode } from '@/shared/composables/useAdminMode'
import { useAdminApi } from '@/shared/composables/useAdminApi'

defineOptions({
  name: 'AdminApiKeysSettings'
})

const { isAdmin } = useAdminMode()
const adminApi = useAdminApi()

const dateRange = ref('7days')
const selectedKey = ref('')
const searchQuery = ref('')
const apikeys = ref([])
const loading = ref(true)
const hourlySeries = ref([])
const leaderboard = ref([])
const leaderboardHour = ref('')
const chartEl = ref(null)
let usageChart = null
const showRateLimitModal = ref(false)
const editingKey = ref(null)
const editingRateLimit = ref(100)

const dateOptions = [
  { label: '24H', value: '1day' },
  { label: '7D', value: '7days' },
  { label: '30D', value: '30days' }
]

const filteredApiKeys = computed(() => {
  let list = apikeys.value
  if (selectedKey.value) {
    list = list.filter((item) => item.id === selectedKey.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((k) =>
      (k.name || '').toLowerCase().includes(q) ||
      (k.username || '').toLowerCase().includes(q)
    )
  }
  return list
})

const totalCalls = computed(() => {
  return apikeys.value.reduce((sum, item) => sum + Number(item.callCount || item.call_count || 0), 0)
})

const activeKeys = computed(() => {
  const now = Date.now()
  const dayAgo = now - 24 * 60 * 60 * 1000
  return apikeys.value.filter((key) => {
    const lastCall = key.lastCallTime ? new Date(key.lastCallTime).getTime() : 0
    return lastCall > dayAgo
  }).length
})

  const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '本地时区'

const parseUtcHourString = (value) => {
  const text = String(value || '').trim()
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2})$/)
  if (!match) return null
  const [, y, m, d, h] = match
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(h), 0, 0))
}

const formatLocalHour = (value) => {
  const date = parseUtcHourString(value)
  if (!date) return String(value || '-')
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

const formattedLeaderboardHour = computed(() => formatLocalHour(leaderboardHour.value))

const chartSeries = computed(() => {
  return hourlySeries.value
    .map((item) => {
      const date = parseUtcHourString(item.hour)
      return {
        hour: String(item.hour || ''),
        calls: Number(item.calls || 0),
        ts: date ? date.getTime() : NaN
      }
    })
    .filter((item) => Number.isFinite(item.ts))
    .sort((a, b) => a.ts - b.ts)
    .map((item) => ({
      ...item,
      label: formatLocalHour(item.hour)
    }))
})

const initChart = () => {
  if (!chartEl.value || usageChart) return
  usageChart = echarts.init(chartEl.value, null, { renderer: 'canvas' })
}

const renderChart = () => {
  initChart()
  if (!usageChart) return

  const labels = chartSeries.value.map((item) => item.label)
  const values = chartSeries.value.map((item) => item.calls)
  const maxCalls = Math.max(5, ...values)
  const yMax = Math.ceil(maxCalls / 5) * 5

  usageChart.setOption({
    animationDuration: 450,
    grid: { top: 20, right: 18, bottom: 42, left: 46 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(20, 24, 35, 0.92)',
      borderWidth: 0,
      padding: [8, 10],
      textStyle: { color: '#e6ebf5', fontSize: 12 },
      formatter: (params) => {
        const point = params?.[0]
        if (!point) return ''
        return `${point.axisValue}<br/>${point.value} 次调用`
      }
    },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: false,
      axisLine: { lineStyle: { color: 'rgba(151, 161, 184, 0.6)' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#8b94a7',
        fontSize: 11,
        hideOverlap: true
      }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: yMax,
      splitNumber: 5,
      axisLabel: { color: '#8b94a7', fontSize: 11 },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: 'rgba(160, 172, 195, 0.28)' } }
    },
    series: [{
      type: 'line',
      smooth: true,
      data: values,
      symbol: values.length <= 40 ? 'circle' : 'none',
      symbolSize: 6,
      lineStyle: { width: 3, color: '#4f7cff' },
      itemStyle: { color: '#4f7cff', borderColor: '#ffffff', borderWidth: 1.5 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(79,124,255,0.24)' },
          { offset: 1, color: 'rgba(79,124,255,0.02)' }
        ])
      }
    }]
  }, true)
}

const resizeChart = () => {
  if (usageChart) usageChart.resize()
}

const getRangeTs = () => {
  const days = dateRange.value === '30days' ? 30 : dateRange.value === '1day' ? 1 : 7
  return {
    start: Date.now() - days * 24 * 60 * 60 * 1000,
    end: Date.now()
  }
}

const formatNumber = (n) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k'
  return String(n)
}

const getBarWidth = (calls) => {
  const maxCalls = Math.max(1, ...leaderboard.value.map((i) => i.calls || 0))
  return Math.round(((calls || 0) / maxCalls) * 100) + '%'
}

const getKeyStatus = (key) => {
  if (!key.lastCallTime) return 'inactive'
  const diff = Date.now() - new Date(key.lastCallTime).getTime()
  return diff < 24 * 60 * 60 * 1000 ? 'active' : 'inactive'
}

const getQuotaPercent = (key) => {
  const limit = Number(key.rateLimitRph ?? key.rate_limit ?? 0)
  const used = Number(key.callCount || key.call_count || 0)
  if (limit < 0) return 100
  if (!Number.isFinite(limit) || limit <= 0) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

const formatQuotaLabel = (key) => {
  const limit = Number(key.rateLimitRph ?? key.rate_limit ?? 0)
  if (limit < 0) return '不限'
  return `${getQuotaPercent(key)}%`
}

const getQuotaColor = (key) => {
  const limit = Number(key.rateLimitRph ?? key.rate_limit ?? 0)
  if (limit < 0) return 'var(--outline-variant)'
  const pct = getQuotaPercent(key)
  if (pct >= 90) return 'var(--error)'
  if (pct >= 70) return 'var(--tertiary)'
  return 'var(--primary)'
}

const loadApiKeys = async () => {
  loading.value = true
  try {
    const res = await adminApi.listApiKeys({ all: true, keyId: selectedKey.value })
    apikeys.value = Array.isArray(res?.keys) ? res.keys : []
  } finally {
    loading.value = false
  }
}

const loadAnalytics = async () => {
  const range = getRangeTs()
  const res = await adminApi.getAnalytics({
    start: range.start,
    end: range.end,
    keyId: selectedKey.value
  })
  hourlySeries.value = Array.isArray(res?.hourly) ? res.hourly : []
  leaderboard.value = Array.isArray(res?.leaderboard?.items) ? res.leaderboard.items : []
  leaderboardHour.value = String(res?.leaderboard?.hour || '')
}


const formatLastCall = (value) => {
  if (!value) return '从未'
  const date = new Date(value)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`
  return date.toLocaleDateString('zh-CN')
}

const formatRateLimit = (value) => {
  const rate = Number(value)
  if (!Number.isFinite(rate) || rate < 0) return '不限'
  return `${rate}/h`
}

const deleteAPIKey = async (key) => {
  if (!confirm(`确定要删除 API Key "${key.name || '未命名'}" 吗？`)) {
    return
  }

  try {
    await adminApi.deleteApiKey(key.id)
    if (selectedKey.value === key.id) selectedKey.value = ''
    await loadApiKeys()
    await loadAnalytics()
  } catch (err) {
    console.error('删除 API Key 失败:', err)
    alert('删除失败，请稍后重试')
  }
}

const editRateLimit = async (key) => {
  editingKey.value = key
  const currentLimit = Number(key.rateLimitRph ?? key.rate_limit ?? 100)
  editingRateLimit.value = currentLimit < 0 ? -1 : Math.max(1, currentLimit || 100)
  showRateLimitModal.value = true
}

const closeRateLimitModal = () => {
  showRateLimitModal.value = false
  editingKey.value = null
  editingRateLimit.value = 100
}

const saveRateLimit = async () => {
  if (!editingKey.value) return
  const rawLimit = Number(editingRateLimit.value)
  const newLimit = rawLimit < 0 ? -1 : Math.max(1, rawLimit || 100)
  try {
    await adminApi.updateApiKeyRateLimit(editingKey.value.id, newLimit)
    editingKey.value.rateLimitRph = newLimit
    closeRateLimitModal()
    await loadApiKeys()
  } catch (err) {
    console.error('更新限流失败:', err)
    alert('更新失败，请稍后重试')
  }
}

watch(selectedKey, async () => {
  await loadApiKeys()
  await loadAnalytics()
})

watch(dateRange, async () => {
  await loadAnalytics()
})

watch(chartSeries, () => {
  renderChart()
}, { deep: true })

watch(isAdmin, (admin) => {
  if (admin) {
    renderChart()
  } else if (usageChart) {
    usageChart.dispose()
    usageChart = null
  }
})

onMounted(async () => {
  await loadApiKeys()
  await loadAnalytics()
  renderChart()
  window.addEventListener('resize', resizeChart)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  if (usageChart) {
    usageChart.dispose()
    usageChart = null
  }
})
</script>

<style scoped>
.admin-apikeys {
  display: grid;
  gap: 1.5rem;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0;
  color: var(--text);
}

.page-subtitle {
  color: var(--on-surface-variant);
  font-size: 0.85rem;
  margin: 0.3rem 0 0;
}

.page-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.system-status {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--on-surface-variant);
  background: var(--surface-container);
  border: 1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent);
  padding: 0.3rem 0.65rem;
  border-radius: var(--radius);
}

.status-pulse {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 999px;
  background: var(--tertiary);
  animation: pulse-dot 2s infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.filter-bar {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
}

.filter-inputs {
  display: flex;
  gap: 0.6rem;
}

.date-select,
.key-select {
  flex: 0 0 12rem;
  min-width: 10rem;
}

.stats-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(3, 1fr);
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  background: var(--surface-container-high);
  border: 1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  transition: background 0.3s;
}

.stat-card:hover {
  background: color-mix(in srgb, var(--primary-container) 8%, var(--surface-container-high));
}

.stat-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.stat-icon {
  color: color-mix(in srgb, var(--primary) 50%, transparent);
  font-size: 1.25rem;
}

.stat-label {
  color: var(--on-surface-variant);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  margin: 0 0 0.5rem;
  text-transform: uppercase;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0;
  color: var(--text);
}

/* ---- Mid row: chart + ranking side by side ---- */
.mid-row {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 2fr 1fr;
}

.hourly-section {
  background: var(--surface-container-low);
  border: 1px solid color-mix(in srgb, var(--outline-variant) 15%, transparent);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header-row h4 {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
}

.time-tabs {
  display: flex;
  gap: 0.25rem;
}

.time-tab {
  background: transparent;
  border: none;
  border-radius: var(--radius);
  color: var(--on-surface-variant);
  cursor: pointer;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  transition: background 0.15s, color 0.15s;
}

.time-tab.active {
  background: var(--surface-container-high);
  color: var(--text);
}

.time-tab:hover:not(.active) {
  color: var(--text);
}

.empty-state {
  color: var(--on-surface-variant);
  padding: 2rem 0;
  text-align: center;
}

.empty-state p {
  margin: 0;
  font-size: 0.85rem;
}

.line-chart-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chart-hint {
  color: var(--on-surface-variant);
  display: flex;
  flex-wrap: wrap;
  font-size: 0.7rem;
  justify-content: space-between;
  margin-bottom: 0.45rem;
  opacity: 0.7;
}

.line-chart-wrap {
  flex: 1;
  min-height: 200px;
}

.line-chart {
  display: block;
  height: 100%;
  width: 100%;
  min-height: 200px;
}

/* ---- Ranking section ---- */
.ranking-section {
  background: var(--surface-container-low);
  border: 1px solid color-mix(in srgb, var(--outline-variant) 15%, transparent);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
}

.ranking-title {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0 0 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.ranking-icon {
  color: var(--primary);
  font-size: 1.1rem;
}

.ranking-list {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.ranking-empty {
  min-height: 12rem;
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.55rem;
  color: var(--on-surface-variant);
  text-align: center;
}

.ranking-empty p {
  margin: 0;
  font-size: 0.82rem;
}

.ranking-empty-icon {
  font-size: 1.4rem;
  opacity: 0.72;
}

.ranking-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0.5rem;
  border-radius: var(--radius);
  transition: background 0.15s;
  cursor: default;
}

.ranking-item:hover {
  background: color-mix(in srgb, var(--surface-container) 50%, transparent);
}

.ranking-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ranking-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text);
}

.ranking-meta {
  font-size: 0.72rem;
  color: var(--on-surface-variant);
}

.ranking-bar-track {
  width: 4rem;
  height: 4px;
  background: var(--surface-container-highest);
  border-radius: 999px;
  overflow: hidden;
  flex-shrink: 0;
}

.ranking-bar-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 999px;
  transition: width 0.3s;
}

.ranking-divider {
  height: 1px;
  background: color-mix(in srgb, var(--outline-variant) 10%, transparent);
}

/* ---- Table section ---- */
.table-section {
  background: var(--surface-container-low);
  border: 1px solid color-mix(in srgb, var(--outline-variant) 15%, transparent);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid color-mix(in srgb, var(--outline-variant) 10%, transparent);
}

.table-header h4 {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
}

.table-search {
  position: relative;
}

.table-search-icon {
  position: absolute;
  left: 0.65rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--on-surface-variant);
  font-size: 0.9rem;
}

.table-search-input {
  background: var(--surface-container);
  border: none;
  border-radius: var(--radius);
  color: var(--text);
  font-size: 0.82rem;
  padding: 0.4rem 0.7rem 0.4rem 2rem;
  width: 12rem;
  transition: box-shadow 0.15s;
}

.table-search-input:focus {
  outline: none;
  box-shadow: 0 0 0 1px var(--primary);
}

.table-scroll {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  text-align: left;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.data-table thead tr {
  background: color-mix(in srgb, var(--surface-container) 30%, transparent);
}

.data-table th {
  padding: 0.65rem 1rem;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--on-surface-variant);
  white-space: nowrap;
}

.data-table td {
  padding: 0.6rem 1rem;
  border-bottom: 1px solid color-mix(in srgb, var(--outline-variant) 5%, transparent);
  vertical-align: middle;
}

.data-table tbody tr {
  transition: background 0.15s;
}

.data-table tbody tr:hover {
  background: color-mix(in srgb, var(--surface-container) 20%, transparent);
}

.data-table .text-right { text-align: right; }
.data-table .text-center { text-align: center; }
.data-table .font-mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.8rem; }
.data-table .text-xs { font-size: 0.75rem; }

.key-cell {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.key-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  background: var(--surface-container-highest);
  border: 1px solid color-mix(in srgb, var(--outline-variant) 15%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 600;
  flex-shrink: 0;
}

.key-cell-name {
  font-weight: 500;
  white-space: nowrap;
}

.key-cell-code {
  font-size: 0.72rem;
  color: var(--on-surface-variant);
  margin-top: 0.1rem;
}

.badge-default {
  display: inline-block;
  font-size: 0.6rem;
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
  vertical-align: middle;
  margin-left: 0.3rem;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius);
}

.status-badge.active {
  background: color-mix(in srgb, var(--tertiary-container) 30%, transparent);
  color: var(--tertiary);
  border: 1px solid color-mix(in srgb, var(--tertiary) 20%, transparent);
}

.status-badge.inactive {
  background: color-mix(in srgb, var(--error-container, var(--surface-container-highest)) 20%, transparent);
  color: var(--on-surface-variant);
  border: 1px solid color-mix(in srgb, var(--outline-variant) 20%, transparent);
}

.status-dot {
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: currentColor;
}

.quota-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  font-size: 0.75rem;
}

.quota-bar-track {
  width: 3rem;
  height: 4px;
  background: var(--surface-container-highest);
  border-radius: 999px;
  overflow: hidden;
}

.quota-bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s;
}

.row-actions {
  display: flex;
  gap: 0.2rem;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s;
}

.data-table tbody tr:hover .row-actions {
  opacity: 1;
}

.row-action-btn {
  background: none;
  border: none;
  color: var(--on-surface-variant);
  cursor: pointer;
  padding: 0.3rem;
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
}

.row-action-btn:hover {
  color: var(--text);
  background: var(--surface-container);
}

.row-action-btn.danger:hover {
  color: var(--error);
}

.table-footer {
  padding: 0.7rem 1.5rem;
  border-top: 1px solid color-mix(in srgb, var(--outline-variant) 10%, transparent);
  background: color-mix(in srgb, var(--surface-container) 20%, transparent);
}

.table-footer-info {
  font-size: 0.72rem;
  color: var(--on-surface-variant);
}

/* ---- Modal ---- */
.modal-title {
  margin: 0;
}

.rate-limit-modal {
  display: grid;
  gap: 0.9rem;
  min-width: min(28rem, 80vw);
}

.rate-limit-desc {
  color: var(--on-surface-variant);
  line-height: 1.6;
  margin: 0;
}

.rate-limit-field {
  display: grid;
  gap: 0.4rem;
}

.rate-limit-field span {
  color: var(--on-surface-variant);
  font-size: 0.82rem;
}

.rate-limit-field input {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.65rem;
  color: var(--text);
  font-size: 0.95rem;
  padding: 0.7rem 0.8rem;
}

.modal-actions {
  display: flex;
  gap: 0.6rem;
  justify-content: flex-end;
}

/* ---- Responsive ---- */
@media (max-width: 1024px) {
  .mid-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-inputs {
    flex-direction: column;
  }

  .date-select,
  .key-select {
    flex: 1 1 auto;
    min-width: 0;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .table-header {
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .table-search-input {
    width: 100%;
  }
}

.loading-spinner {
  animation: spin 0.8s linear infinite;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  display: inline-block;
  height: 16px;
  width: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
