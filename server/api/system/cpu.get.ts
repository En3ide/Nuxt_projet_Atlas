import type { CpuSnapshot } from '~/types/cpu'
import { callAtlas } from '../../utils/atlas'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return callAtlas<CpuSnapshot>(event, 'system/cpu')
})
