export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  return {
    success: true,
    action: 'bookmark',
    articleId: body?.articleId || null,
    active: Boolean(body?.active)
  }
})
