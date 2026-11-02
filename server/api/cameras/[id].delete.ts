import { callAtlas, cameraId } from '../../utils/atlas'

export default defineEventHandler(async (event) => {
  await callAtlas(event, `cameras/${cameraId(event)}`, { method: 'DELETE' })
  setResponseStatus(event, 204)
  return null
})
