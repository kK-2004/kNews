import { userActionsApi } from '@/shared/utils/ipc-api'

export function useUserActionsApi() {
  const bookmark = (articleId, active) => userActionsApi.bookmark(articleId, active)
  const like = (articleId, active) => userActionsApi.like(articleId, active)
  const share = (articleId, channel) => userActionsApi.share(articleId, channel)

  return {
    bookmark,
    like,
    share
  }
}
