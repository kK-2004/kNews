const json = (payload) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})

export function useUserActionsApi() {
  const bookmark = (articleId, active) => fetch('/api/user/bookmark', json({ articleId, active }))
  const like = (articleId, active) => fetch('/api/user/like', json({ articleId, active }))
  const share = (articleId, channel) => fetch('/api/user/share', json({ articleId, channel }))

  return {
    bookmark,
    like,
    share
  }
}
