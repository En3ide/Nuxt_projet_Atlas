import type { CameraProfile } from '~/types/camera'
import { callAtlas } from '../../utils/atlas'

export default defineEventHandler(event => callAtlas<CameraProfile[]>(event, 'cameras'))
