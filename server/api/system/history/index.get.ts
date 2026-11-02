import type { HistoryDay } from '~/types/history'
import { callAtlas } from '../../../utils/atlas'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const { from, to } = getQuery(event)
  if (typeof from !== 'string' || typeof to !== 'string') throw createError({ statusCode: 400, message: 'Période manquante.' })
  const query = new URLSearchParams({ from, to })
  return callAtlas<HistoryDay>(event, `system/history?${query}`)
})
