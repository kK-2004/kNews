export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  return {
    success: true,
    action: 'share',
    articleId: body?.articleId || null,
    channel: body?.channel || 'copy-link'
  }
})
