import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/use-ui-store'

function fuzzyMatch(text, query) {
  const t = text.toLowerCase()
  const q = query.toLowerCase().trim()
  if (!q) return true

  let i = 0
  for (const char of t) {
    if (char === q[i]) i += 1
    if (i === q.length) return true
  }
  return false
}

/**
 * Central registry for command palette actions and fuzzy query matching.
 */
export function useCommands({ onRefresh } = {}) {
  const router = useRouter()
  const ui = useUiStore()
  const query = ref('')

  const registry = ref([
    { id: 'nav-home', label: '前往首页', shortcut: 'G H', keywords: ['首页', '热点', 'home', 'feed'], handler: () => router.push('/') },
    { id: 'nav-settings', label: '前往设置', shortcut: 'G T', keywords: ['设置', 'settings'], handler: () => router.push('/settings') },
    { id: 'action-refresh', label: '刷新首页内容', shortcut: 'R', keywords: ['刷新', 'reload', 'refresh'], handler: () => onRefresh?.() },
    {
      id: 'action-theme',
      label: '切换主题',
      shortcut: 'T',
      keywords: ['主题', '深色', '浅色', 'theme', 'dark', 'light'],
      handler: () => ui.setTheme(ui.theme === 'dark' ? 'light' : 'dark')
    }
  ])

  const commands = computed(() => registry.value.filter((item) => fuzzyMatch(`${item.label} ${(item.keywords || []).join(' ')}`, query.value)))

  return {
    query,
    commands,
    registry,
    fuzzyMatch
  }
}
