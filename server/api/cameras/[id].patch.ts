import type { CameraProfile } from '~/types/camera'
import { callAtlas, cameraId } from '../../utils/atlas'

export default defineEventHandler(async (event) => {
  const id = cameraId(event)
  const body = await readBody<Record<string, unknown>>(event)
  return callAtlas<CameraProfile>(event, `cameras/${id}`, { method: 'PATCH', body })
})
