import type { CameraProfile } from '~/types/camera'
import { callAtlas } from '../../utils/atlas'

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  const camera = await callAtlas<CameraProfile>(event, 'cameras', { method: 'POST', body })
  setResponseStatus(event, 201)
  return camera
})
