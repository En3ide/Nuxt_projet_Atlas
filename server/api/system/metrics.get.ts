import type { SystemSnapshot } from '~/types/system'
import { callAtlas } from '../../utils/atlas'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return callAtlas<SystemSnapshot>(event, 'system/metrics')
})
