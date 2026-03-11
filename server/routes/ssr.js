import { eventHandler, getRequestURL, setResponseStatus } from 'h3'
import { renderPage } from '../renderer'

export default eventHandler(async (event) => {
  const url = getRequestURL(event)
  const rendered = await renderPage(url.pathname + url.search, { origin: url.origin })
  event.node.res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')

  if (rendered.status === 404) {
    setResponseStatus(event, 404)
  }

  return rendered.html
})
