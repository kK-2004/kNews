import { renderToString } from '@vue/server-renderer'
import { createKNewsApp } from './app'

function serializeState(state) {
  return JSON.stringify(state)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

export async function render(url, context = {}) {
  const { app, router, pinia } = createKNewsApp({ ssr: true, ssrOrigin: context.origin || '' })

  await router.push(url)
  await router.isReady()

  const matched = router.currentRoute.value.matched
  const status = matched.length ? 200 : 404

  const html = await renderToString(app)
  const state = { pinia: pinia.state.value }

  return {
    html,
    status,
    state,
    serializedState: serializeState(state)
  }
}
