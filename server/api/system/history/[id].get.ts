import type { HistoryDetail } from '~/types/history'
import { callAtlas } from '../../../utils/atlas'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const id = getRouterParam(event, 'id') || ''
  if (!/^[1-9]\d{0,18}$/.test(id)) throw createError({ statusCode: 400, message: 'Relevé invalide.' })
  return callAtlas<HistoryDetail>(event, `system/history/${id}`)
})
