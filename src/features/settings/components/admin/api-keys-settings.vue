<template>
  <section v-if="!isAdmin" class="admin-apikeys">
    <p class="access-denied">仅管理员可访问 API Key 管理</p>
  </section>
  <section v-else class="admin-apikeys">
    <header class="section-header">
      <h3>API Key 管理</h3>
      <p>查看和管理所有用户的 API Key 使用情况</p>
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
      <base-button @click="loadAnalytics">刷新</base-button>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <p class="stat-label">总 API Keys</p>
        <p class="stat-value">{{ apikeys.length }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">总调用次数</p>
        <p class="stat-value">{{ totalCalls }}</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">活跃 Keys</p>
        <p class="stat-value">{{ activeKeys }}</p>
      </div>
    </div>

    <div class="hourly-section">
      <h4>每小时调用趋势</h4>
      <div v-if="hourlySeries.length === 0" class="empty-state">
        <p>暂无数据</p>
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

    <div v-if="leaderboard.length > 0" class="leaderboard-section">
      <h4>每小时调用榜单（{{ formattedLeaderboardHour || '-' }}）</h4>
      <div class="leaderboard-list">
        <div v-for="(item, index) in leaderboard" :key="item.id" class="leaderboard-item">
          <span :class="['rank-badge', index < 3 ? 'top' : '']">{{ index + 1 }}</span>
          <div class="leaderboard-main">
            <p class="leaderboard-name">{{ item.apiKeyName || '未命名' }}</p>
            <p class="leaderboard-user">{{ item.username }}</p>
          </div>
          <p class="leaderboard-calls">{{ item.calls || 0 }} 次</p>
        </div>
      </div>
    </div>

    <div class="keys-section">
      <h4>API Key 列表</h4>
      <div v-if="filteredApiKeys.length === 0" class="empty-state">
        <p>暂无 API Key</p>
      </div>
      <div v-else class="keys-list">
        <div v-for="key in filteredApiKeys" :key="key.id" class="key-card">
          <div class="key-main">
            <p class="key-name">{{ key.name || '未命名 Key' }}</p>
            <p class="key-user">用户：{{ key.username || '未知' }}</p>
            <p class="key-code">{{ key.key }}</p>
            <div class="key-stats">
              <span class="key-stat">限流: {{ key.rateLimitRph || '-' }}/h</span>
              <span class="key-stat">最后: {{ formatLastCall(key.lastCallTime) }}</span>
            </div>
          </div>
          <div class="key-actions">
            <base-button size="sm" @click="editRateLimit(key)">限流</base-button>
            <base-button size="sm" variant="danger" @click="deleteAPIKey(key)">删除</base-button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import * as echarts from 'echarts'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseButton from '@/shared/components/base-button.vue'
import { useAdminMode } from '@/shared/composables/useAdminMode'
import { useAdminApi } from '@/shared/composables/useAdminApi'

defineOptions({
  name: 'AdminApiKeysSettings'
})

const { isAdmin } = useAdminMode()
const adminApi = useAdminApi()

const dateRange = ref('7days')
const selectedKey = ref('')
const apikeys = ref([])
const hourlySeries = ref([])
const leaderboard = ref([])
const leaderboardHour = ref('')
const chartEl = ref(null)
let usageChart = null

const filteredApiKeys = computed(() => {
  if (!selectedKey.value) return apikeys.value
  return apikeys.value.filter((item) => item.id === selectedKey.value)
})

const totalCalls = computed(() => {
  return hourlySeries.value.reduce((sum, item) => sum + (item.calls || 0), 0)
})

const activeKeys = computed(() => {
  const now = Date.now()
  const dayAgo = now - 24 * 60 * 60 * 1000
  return apikeys.value.filter((key) => {
    const lastCall = key.lastCallTime ? new Date(key.lastCallTime).getTime() : 0
    return lastCall > dayAgo
  }).length
})

const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local'

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
  const days = dateRange.value === '30days' ? 30 : 7
  return {
    start: Date.now() - days * 24 * 60 * 60 * 1000,
    end: Date.now()
  }
}

const loadApiKeys = async () => {
  const res = await adminApi.listApiKeys({ keyId: selectedKey.value })
  apikeys.value = Array.isArray(res?.keys) ? res.keys : []
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
  const currentLimit = key.rateLimitRph || 100
  const input = prompt(`设置限流（请求/小时）：\n当前：${currentLimit}`, String(currentLimit))

  if (input === null) return

  const newLimit = Math.max(1, Number(input) || 100)
  try {
    await adminApi.updateApiKeyRateLimit(key.id, newLimit)
    key.rateLimitRph = newLimit
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
  gap: 1.2rem;
}

.section-header h3 {
  font-size: 1.15rem;
  margin: 0;
}

.section-header p {
  color: var(--muted);
  font-size: 0.85rem;
  margin: 0.3rem 0 0;
}

.access-denied {
  color: var(--muted);
  margin: 0;
}

.filter-bar {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  justify-content: space-between;
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
  gap: 0.8rem;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}

.stat-card {
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 0.9rem;
  text-align: center;
}

.stat-label {
  color: var(--muted);
  font-size: 0.8rem;
  margin: 0 0 0.3rem;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.hourly-section {
  display: grid;
  gap: 0.6rem;
}

.hourly-section h4 {
  font-size: 1rem;
  margin: 0;
}

.empty-state {
  color: var(--muted);
  padding: 2rem 0;
  text-align: center;
}

.empty-state p {
  margin: 0;
}

.line-chart-card {
  border: 1px solid var(--border);
  border-radius: 0.9rem;
  padding: 0.8rem 0.9rem 0.6rem;
  background:
    radial-gradient(120% 90% at 50% -10%, color-mix(in srgb, #80a5ff 16%, transparent), transparent 70%),
    linear-gradient(180deg, color-mix(in srgb, var(--surface) 92%, #eef3ff), var(--surface));
}

.chart-hint {
  color: var(--muted);
  display: flex;
  flex-wrap: wrap;
  font-size: 0.74rem;
  justify-content: space-between;
  margin-bottom: 0.45rem;
}

.line-chart-wrap {
  height: 260px;
  width: 100%;
}

.line-chart {
  display: block;
  height: 100%;
  width: 100%;
  min-height: 240px;
}

.leaderboard-section {
  display: grid;
  gap: 0.6rem;
}

.leaderboard-section h4 {
  font-size: 1rem;
  margin: 0;
}

.leaderboard-list {
  display: grid;
  gap: 0.5rem;
}

.leaderboard-item {
  align-items: center;
  border: 1px solid var(--border);
  border-radius: 0.6rem;
  display: grid;
  gap: 0.6rem;
  grid-template-columns: auto 1fr auto;
  padding: 0.6rem 0.8rem;
}

.rank-badge {
  align-items: center;
  background: color-mix(in srgb, var(--muted) 20%, transparent);
  border-radius: 999px;
  color: var(--muted);
  display: inline-flex;
  font-size: 0.75rem;
  font-weight: 700;
  height: 24px;
  justify-content: center;
  width: 24px;
}

.rank-badge.top {
  background: color-mix(in srgb, #f59e0b 30%, transparent);
  color: #f59e0b;
}

.leaderboard-main {
  min-width: 0;
}

.leaderboard-name {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
}

.leaderboard-user {
  color: var(--muted);
  font-size: 0.75rem;
  margin: 0.1rem 0 0;
}

.leaderboard-calls {
  font-size: 0.85rem;
  font-weight: 600;
}

.keys-section {
  display: grid;
  gap: 0.6rem;
}

.keys-section h4 {
  font-size: 1rem;
  margin: 0;
}

.keys-list {
  display: grid;
  gap: 0.6rem;
}

.key-card {
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  display: grid;
  gap: 0.7rem;
  grid-template-columns: 1fr auto;
  padding: 0.8rem;
}

.key-name {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0;
}

.key-user {
  color: var(--muted);
  font-size: 0.8rem;
  margin: 0.2rem 0;
}

.key-code {
  background: color-mix(in srgb, var(--muted) 10%, transparent);
  border-radius: 0.4rem;
  font-family: monospace;
  font-size: 0.75rem;
  margin: 0.3rem 0;
  overflow: hidden;
  padding: 0.3rem 0.5rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.key-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.key-stat {
  color: var(--muted);
  font-size: 0.75rem;
}

.key-actions {
  display: flex;
  gap: 0.4rem;
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

  .key-card {
    grid-template-columns: 1fr;
  }

  .key-actions {
    width: 100%;
  }

  .key-actions > * {
    flex: 1;
  }

  .leaderboard-item {
    grid-template-columns: auto 1fr;
  }

  .leaderboard-calls {
    grid-column: 2;
    text-align: right;
  }
}
</style>
