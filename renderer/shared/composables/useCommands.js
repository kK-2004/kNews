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
    { id: 'nav-home', label: 'Go to Home', shortcut: 'G H', keywords: ['home', 'feed'], handler: () => router.push('/') },
    { id: 'nav-settings', label: 'Go to Settings', shortcut: 'G T', keywords: ['settings'], handler: () => router.push('/settings') },
    { id: 'action-refresh', label: 'Refresh Feed', shortcut: 'R', keywords: ['refresh', 'reload'], handler: () => onRefresh?.() },
    {
      id: 'action-theme',
      label: 'Toggle Theme',
      shortcut: 'T',
      keywords: ['theme', 'dark', 'light'],
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
