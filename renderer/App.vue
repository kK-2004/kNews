<template>
  <div class="app-shell">
    <a href="#main-content" class="skip-link">Skip to main content</a>
    <toast-container :toasts="toasts" @dismiss="dismiss" />
    <header class="app-header">
      <button
        class="menu-toggle"
        type="button"
        aria-label="Toggle navigation menu"
        @click="mobileMenuOpen = !mobileMenuOpen"
      >
        ≡
      </button>
      <RouterLink class="header-brand" to="/">
        <img src="/logo.png" alt="logo" class="brand-logo">
        <span class="brand-text">News</span>
      </RouterLink>
      <nav v-if="isHomeRoute" class="home-tabs">
        <button type="button" :class="{ active: homeTab === 'hottest' }" @click="setHomeTab('hottest')">热点</button>
        <button type="button" :class="{ active: homeTab === 'realtime' }" @click="setHomeTab('realtime')">时事</button>
        <button type="button" :class="{ active: homeTab === 'focus' }" @click="setHomeTab('focus')">关注</button>
        <button type="button" :class="{ active: homeTab === 'china' }" @click="setHomeTab('china')">更多</button>        
      </nav>
      <nav class="desktop-nav">
        <button
          class="theme-toggle"
          type="button"
          :aria-label="`切换到${nextThemeLabel}主题`"
          :title="`当前：${currentThemeLabel}，点击切换到${nextThemeLabel}`"
          @click="toggleTheme"
        >
          <span v-if="uiStore.theme === 'dark'" class="i-tabler-moon" aria-hidden="true"></span>
          <span v-else-if="uiStore.theme === 'light'" class="i-tabler-sun" aria-hidden="true"></span>
          <span v-else class="i-tabler-device-desktop" aria-hidden="true"></span>
        </button>
        <button v-if="isHomeRoute" class="refresh-btn" type="button" @click="onRefresh">一键刷新</button>
      </nav>
      <div
        ref="userMenuRef"
        class="user-menu"
        @mouseenter="openUserMenu"
        @mouseleave="scheduleCloseUserMenu"
      >
        <!-- Not logged in: show "登录" text button -->
        <button v-if="!isLoggedIn" class="login-trigger" type="button" @click="loginModalVisible = true">
          登录
        </button>
        <!-- Logged in: show avatar -->
        <button v-else class="user-trigger" type="button" aria-label="Open account menu" @click="userMenuOpen = !userMenuOpen">
          <img v-if="userStore.profile?.avatar" :src="userStore.profile.avatar" alt="avatar" class="avatar" />
          <span v-else-if="userStore.loginType === 'magic-link'" class="avatar-fallback i-tabler-user" aria-hidden="true" />
          <span v-else class="avatar-fallback i-tabler-brand-github-filled" aria-hidden="true" />
        </button>
        <div
          v-if="userMenuOpen"
          class="user-popover"
          @mouseenter="openUserMenu"
          @mouseleave="scheduleCloseUserMenu"
        >
          <template v-if="isLoggedIn">
            <p class="user-name">{{ userStore.profile?.name || 'GitHub User' }}</p>
            <RouterLink class="menu-link" to="/settings" @click="userMenuOpen = false">设置</RouterLink>
            <button class="menu-link danger" type="button" @click="logout">退出</button>
          </template>
          <template v-else>
            <p class="menu-hint">Login not available</p>
          </template>
        </div>
      </div>
    </header>

    <aside class="mobile-drawer" :class="{ open: mobileMenuOpen }" aria-label="Mobile navigation drawer">
      <RouterLink to="/" @click="mobileMenuOpen = false">Home</RouterLink>
      <RouterLink v-if="isLoggedIn" to="/settings" @click="mobileMenuOpen = false">设置</RouterLink>
    </aside>

    <main id="main-content" class="app-main" tabindex="-1" v-motion :initial="{ opacity: 0, y: 6 }" :enter="{ opacity: 1, y: 0 }">
      <command-palette
        :open="paletteOpen"
        :commands="commands"
        :query="query"
        @close="paletteOpen = false"
        @run="runCommand"
        @query-change="query = $event"
      />
      <RouterView v-slot="{ Component, route }">
        <Transition :name="route.meta.transition || 'fade'" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <nav class="mobile-bottom-nav" aria-label="Mobile bottom navigation">
      <RouterLink to="/" aria-label="Home">Home</RouterLink>
      <RouterLink v-if="isLoggedIn" to="/settings" aria-label="Settings">Settings</RouterLink>
    </nav>

    <login-modal
      :visible="loginModalVisible"
      @close="loginModalVisible = false"
      @github-login="onModalGithubLogin"
      @login-success="onMagicLinkLoginSuccess"
    />

    <github-device-dialog
      :visible="githubDialogVisible"
      :user-code="githubUserCode"
      :polling="githubPolling"
      :error="githubError"
      @cancel="onGithubDialogCancel"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CommandPalette from '@/shared/components/command-palette.vue'
import { useCommands } from '@/shared/composables/useCommands'
import { useAuthApi } from '@/shared/composables/useAuthApi'
import LoginModal from '@/shared/components/login-modal.vue'
import GithubDeviceDialog from '@/shared/components/github-device-dialog.vue'
import ToastContainer from '@/shared/components/toast-container.vue'
import { useToast } from '@/shared/composables/useToast'
import { useUiStore } from '@/stores/use-ui-store'
import { useUserStore } from '@/stores/use-user-store'

const paletteOpen = ref(false)
const mobileMenuOpen = ref(false)
const userMenuOpen = ref(false)
const userMenuRef = ref(null)
let userMenuCloseTimer = null
const loginEnabled = ref(false)
const loginModalVisible = ref(false)
const githubDialogVisible = ref(false)
const onRefresh = () => window.dispatchEvent(new CustomEvent('knews:refresh-feed'))
const { commands, query } = useCommands({ onRefresh })
const { toasts, dismiss, success } = useToast()
const authApi = useAuthApi()
const uiStore = useUiStore()
const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null
const isHomeRoute = computed(() => route.path === '/')
const isLoggedIn = computed(() => Boolean(userStore.authToken || userStore.profile))
const currentThemeLabel = computed(() => {
  if (uiStore.theme === 'dark') return '暗色'
  if (uiStore.theme === 'light') return '亮色'
  return '跟随系统'
})
const nextThemeLabel = computed(() => {
  if (uiStore.theme === 'dark') return '亮色'
  if (uiStore.theme === 'light') return '系统'
  return '暗色'
})
const validTabs = ['china', 'focus', 'hottest', 'realtime']
const homeTab = computed(() => {
  const tab = String(route.query.tab || 'hottest')
  return validTabs.includes(tab) ? tab : 'hottest'
})

const setHomeTab = async (tab) => {
  if (!validTabs.includes(tab)) return
  if (homeTab.value === tab) return
  const query = { ...route.query, tab }
  await router.replace({ path: route.path, query })
}

const toggleTheme = () => {
  const themes = ['system', 'light', 'dark']
  const currentIndex = themes.indexOf(uiStore.theme)
  const nextTheme = themes[(currentIndex + 1) % themes.length]
  uiStore.setTheme(nextTheme)
}

const runCommand = async (command) => {
  await command.handler?.()
  success(`Executed: ${command.label}`)
}

const onKeydown = (event) => {
  const isMetaK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'
  if (!isMetaK) return
  event.preventDefault()
  paletteOpen.value = !paletteOpen.value
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
const onSchemeChange = () => uiStore.theme === 'system' && uiStore.initTheme()

const syncAuthToken = () => {
  if (typeof localStorage === 'undefined') return
  if (userStore.authToken) localStorage.setItem('auth_token', userStore.authToken)
  else localStorage.removeItem('auth_token')
}

const syncProfile = async () => {
  if (!userStore.authToken) return
  try {
    const profile = await authApi.getProfile()
    if (!profile?.user && !profile?.login && !profile?.id) return
    userStore.setAuth({
      token: userStore.authToken,
      type: userStore.loginType || profile.type || 'github',
      profile: {
        ...(userStore.profile || {}),
        name: userStore.profile?.name || profile.nickname || profile.login || '',
        login: profile.nickname || userStore.profile?.login || '',
        userId: profile.id || userStore.profile?.userId,
        level: profile.level ?? userStore.profile?.level ?? 0,
      }
    })
  } catch {
    // ignore profile refresh failures to avoid blocking app boot
  }
}

const githubUserCode = ref('')
const githubPolling = ref(false)
const githubError = ref('')

const loginWithGithub = async () => {
  userMenuOpen.value = false
  githubError.value = ''
  githubUserCode.value = ''
  githubPolling.value = false

  try {
    const initiated = await window.api.auth.initiateGithub()
    if (initiated?.error) {
      githubError.value = initiated.error
      return
    }
    githubUserCode.value = initiated.user_code

    // auto-copy happens inside github-device-dialog via watch on userCode prop
    githubPolling.value = true

    // Wait 5s, then open browser for user to authorize
    await new Promise((r) => setTimeout(r, 5000))
    await window.api.auth.openGithubBrowser()

    // Poll for completion
    const session = await window.api.auth.completeGithub()
    githubPolling.value = false

    if (session?.error) {
      githubError.value = session.error
      return
    }
    if (session) {
      userStore.setAuth({
        token: session.userId ? `github-${session.userId}` : 'github',
        type: session.provider || 'github',
        profile: {
          name: session.nickname || '',
          login: session.nickname || '',
          userId: session.userId,
          level: session.level ?? 0,
          avatar: `https://avatars.githubusercontent.com/` + session.nickname
        }
      })
      syncAuthToken()
      success('登录成功')
      githubDialogVisible.value = false
    }
  } catch (err) {
    githubPolling.value = false
    githubError.value = err?.message || 'Login failed'
  }
}

const cancelGithubLogin = async () => {
  try { await window.api.auth.cancelGithub() } catch {}
  githubPolling.value = false
  githubError.value = ''
  githubUserCode.value = ''
  githubDialogVisible.value = false
}

const onGithubDialogCancel = () => {
  cancelGithubLogin()
}

const onModalGithubLogin = () => {
  loginModalVisible.value = false
  githubDialogVisible.value = true
  loginWithGithub()
}

const onMagicLinkLoginSuccess = (session) => {
  if (session && !session.error) {
    userStore.setAuth({
      token: '',
      type: session.provider || 'magic-link',
      profile: {
        name: session.nickname || '',
        login: session.nickname || '',
        userId: session.userId,
        level: session.level ?? 0,
      }
    })
    syncAuthToken()
    success('登录成功')
    loginModalVisible.value = false
  }
}

const logout = async () => {
  try {
    await window.api?.auth?.logout?.()
  } catch {
    // main-process logout best-effort; still clear local state
  }
  userStore.clearAuth()
  syncAuthToken()
  userMenuOpen.value = false
  if (route.path !== '/') {
    router.push('/')
  }
}

const openUserMenu = () => {
  if (userMenuCloseTimer) {
    clearTimeout(userMenuCloseTimer)
    userMenuCloseTimer = null
  }
  userMenuOpen.value = true
}

const closeUserMenu = () => {
  if (userMenuCloseTimer) {
    clearTimeout(userMenuCloseTimer)
    userMenuCloseTimer = null
  }
  userMenuOpen.value = false
}

const scheduleCloseUserMenu = () => {
  if (userMenuCloseTimer) clearTimeout(userMenuCloseTimer)
  userMenuCloseTimer = setTimeout(() => {
    userMenuOpen.value = false
    userMenuCloseTimer = null
  }, 180)
}

const onDocumentClick = (event) => {
  if (!userMenuOpen.value) return
  if (userMenuRef.value?.contains(event.target)) return
  userMenuOpen.value = false
}

const consumeOauthCallback = async () => {
  // In Electron mode, OAuth is handled via IPC — no URL callback params needed.
  // Keep this for web-mode compatibility where query params are still used.
  if (route.query.login !== 'github' || typeof route.query.jwt !== 'string') return

  let profile = null
  if (typeof route.query.user === 'string') {
    try {
      profile = JSON.parse(route.query.user)
    } catch {
      profile = null
    }
  }

  userStore.setAuth({
    token: route.query.jwt,
    type: 'github',
    profile
  })
  syncAuthToken()
  success('GitHub login successful')

  const query = { ...route.query }
  delete query.login
  delete query.jwt
  delete query.user
  await router.replace({ query })
}

onMounted(() => {
  uiStore.initTheme()
  authApi.getLoginStatus().then((status) => {
    loginEnabled.value = Boolean(status?.enable)
  }).catch(() => {
    loginEnabled.value = false
  })
  consumeOauthCallback()
  syncProfile()
  syncAuthToken()
  document.addEventListener('click', onDocumentClick)
  media?.addEventListener('change', onSchemeChange)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  media?.removeEventListener('change', onSchemeChange)
  if (userMenuCloseTimer) {
    clearTimeout(userMenuCloseTimer)
    userMenuCloseTimer = null
  }
})
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
}

.app-header {
  align-items: center;
  border-bottom: 1px solid var(--border);
  display: flex;
  gap: 1rem;
  justify-content: flex-start;
  padding: 0.75rem 1rem;
  position: relative;
}

.desktop-nav {
  align-items: center;
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}

.theme-toggle {
  align-items: center;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 0.6rem;
  color: var(--muted);
  cursor: pointer;
  display: inline-flex;
  height: 2.15rem;
  justify-content: center;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease;
  width: 2.15rem;
}

.theme-toggle:hover {
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  border-color: color-mix(in srgb, #0b63ff 38%, var(--border));
  color: color-mix(in srgb, #0b63ff 72%, var(--text));
}

.theme-toggle:active {
  transform: translateY(1px);
}

.theme-toggle span {
  font-size: 1.2rem;
}

.header-brand {
  align-items: center;
  color: inherit;
  display: inline-flex;
  gap: 0.5rem;
  text-decoration: none;
}

.brand-logo {
  width: 2.2rem;
  height: 2.2rem;
  object-fit: contain;
  transform: translate(10px, 1.5px);
}

.brand-text {
  display: flex;
  align-items: center;
  font-size: 2rem;
  font-weight: 800;
  line-height: 1;
}

.menu-toggle {
  align-items: center;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  display: none;
  height: 44px;
  justify-content: center;
  width: 44px;
}

.home-tabs {
  background: color-mix(in srgb, var(--surface) 80%, transparent);
  border: 1px solid var(--border);
  border-radius: 999px;
  display: inline-flex;
  left: 50%;
  padding: 0.15rem;
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
}

.home-tabs button {
  background: transparent;
  border: 0;
  border-radius: 999px;
  color: var(--muted);
  cursor: pointer;
  min-height: 2rem;
  padding: 0.2rem 0.75rem;
}

.home-tabs .active {
  background: color-mix(in srgb, #ff756a 22%, transparent);
  color: #f44d47;
}

.header-link,
.refresh-btn {
  align-items: center;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  border: 1px solid color-mix(in srgb, #b7c2d7 55%, var(--border));
  border-radius: 0.6rem;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  font-weight: 600;
  justify-content: center;
  min-height: 2.15rem;
  padding: 0 0.9rem;
  text-decoration: none;
  transition: background-color 0.16s ease, border-color 0.16s ease, transform 0.14s ease;
}

.header-link:hover,
.refresh-btn:hover {
  background: color-mix(in srgb, #0b63ff 10%, var(--surface));
  border-color: color-mix(in srgb, #0b63ff 38%, var(--border));
}

.header-link:active,
.refresh-btn:active {
  transform: translateY(1px);
}

.header-link.router-link-active {
  background: color-mix(in srgb, #0b63ff 16%, var(--surface));
  border-color: color-mix(in srgb, #0b63ff 44%, var(--border));
  color: #0b63ff;
}

.user-menu {
  position: relative;
}

.user-trigger {
  align-items: center;
  background: color-mix(in srgb, var(--surface) 84%, transparent);
  border: 1px solid var(--border);
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  height: 2.1rem;
  justify-content: center;
  min-height: 2.1rem;
  transition: background-color 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease, transform 0.14s ease;
  width: 2.1rem;
}

.user-trigger:hover {
  background: color-mix(in srgb, #0b63ff 10%, var(--surface));
  border-color: color-mix(in srgb, #0b63ff 38%, var(--border));
  box-shadow: 0 0 0 2px color-mix(in srgb, #0b63ff 16%, transparent);
}

.user-trigger:active {
  transform: translateY(1px);
}

.avatar,
.avatar-fallback {
  border-radius: 999px;
  display: inline-flex;
  height: 1.65rem;
  width: 1.65rem;
}

.avatar {
  object-fit: cover;
}

.avatar-fallback {
  align-items: center;
  color: color-mix(in srgb, #0b63ff 72%, var(--text));
  font-size: 1.3rem;
  font-weight: 400;
  justify-content: center;
  line-height: 1;
}

.user-popover {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.18);
  display: grid;
  gap: 0.35rem;
  padding: 0.55rem;
  position: absolute;
  right: 0;
  top: calc(100% + 0.45rem);
  width: 13rem;
  z-index: 1200;
}

.user-name {
  font-size: 0.86rem;
  font-weight: 600;
  margin: 0 0 0.2rem;
  padding: 0 0.25rem;
}

.menu-link {
  align-items: center;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  border: 1px solid var(--border);
  border-radius: 0.55rem;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  justify-content: center;
  min-height: 2rem;
  padding: 0 0.65rem;
  text-decoration: none;
}

.menu-link.danger {
  color: #d14343;
}

.menu-hint {
  color: var(--muted);
  font-size: 0.82rem;
  margin: 0;
  padding: 0.25rem;
}

.login-trigger {
  align-items: center;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  border: 1px solid color-mix(in srgb, #b7c2d7 55%, var(--border));
  border-radius: 0.6rem;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  font-weight: 600;
  justify-content: center;
  min-height: 2.15rem;
  padding: 0 0.9rem;
  text-decoration: none;
  transition: background-color 0.16s ease, border-color 0.16s ease, transform 0.14s ease;
}

.login-trigger:hover {
  background: color-mix(in srgb, #0b63ff 10%, var(--surface));
  border-color: color-mix(in srgb, #0b63ff 38%, var(--border));
}

.login-trigger:active {
  transform: translateY(1px);
}

.app-main {
  flex: 1 1 auto;
  min-height: 0;
  margin: 0;
  max-width: 100%;
  overflow: auto;
  padding: 1.1rem 1.2rem 2rem;
  -ms-overflow-style: none;
  scrollbar-width: none;
  width: 100%;
}

.app-main::-webkit-scrollbar {
  display: none;
}

.skip-link {
  background: var(--surface);
  color: var(--text);
  left: -9999px;
  padding: 0.5rem;
  position: absolute;
  top: 0;
}

.skip-link:focus {
  left: 0.5rem;
  z-index: 1000;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.mobile-drawer {
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: none;
  gap: 0.8rem;
  inset: 3.25rem auto 0 0;
  padding: 1rem;
  position: fixed;
  transform: translateX(-100%);
  transition: transform 0.2s ease;
  width: min(80vw, 18rem);
  z-index: 1100;
}

.mobile-drawer.open {
  transform: translateX(0);
}

.mobile-bottom-nav {
  align-items: center;
  background: var(--surface);
  border-top: 1px solid var(--border);
  bottom: 0;
  display: none;
  grid-auto-columns: 1fr;
  grid-auto-flow: column;
  left: 0;
  padding: 0.25rem;
  position: fixed;
  right: 0;
  z-index: 1000;
}

.mobile-bottom-nav a {
  align-items: center;
  display: flex;
  height: 44px;
  justify-content: center;
}

@media (max-width: 768px) {
  .menu-toggle,
  .mobile-bottom-nav,
  .mobile-drawer {
    display: grid;
  }

  .desktop-nav,
  .header-brand,
  .home-tabs {
    display: none;
  }

  .user-popover {
    right: auto;
    width: 12rem;
  }
}
</style>
