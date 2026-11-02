import type { CameraProfile } from '~/types/camera'
import { callAtlas, cameraId } from '../../utils/atlas'

export default defineEventHandler(event => callAtlas<CameraProfile>(event, `cameras/${cameraId(event)}`))
