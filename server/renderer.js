import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import process from 'node:process'

const indexHtmlPath = join(process.cwd(), 'index.html')
let renderFn

function withPreloadLinks(html) {
  return html.replace(
    '</head>',
    '  <link rel="prefetch" href="/settings" as="document" />\n</head>'
  )
}

export async function renderPage(url, context = {}) {
  if (!renderFn) {
    const entryServerPath = join(process.cwd(), 'src/entry-server.js')
    const mod = await import(pathToFileURL(entryServerPath).href)
    renderFn = mod.render
  }

  const template = await readFile(indexHtmlPath, 'utf8')
  const { html, state, status, serializedState } = await renderFn(url, context)

  const page = withPreloadLinks(template)
    .replace('<div id="app"></div>', `<div id="app">${html}</div>`)
    .replace(
      '</body>',
      `<script>window.__INITIAL_STATE__=${serializedState};</script>\n</body>`
    )

  return {
    html: page,
    status,
    state
  }
}
