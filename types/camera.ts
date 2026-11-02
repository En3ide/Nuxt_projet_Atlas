export type CameraProtocol = 'hls' | 'rtsp' | 'mjpeg'

export interface CameraProfile {
  id: string
  label: string
  location: string
  streamUrl: string
  protocol: CameraProtocol
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export type CameraInput = Pick<CameraProfile, 'label' | 'location' | 'streamUrl' | 'protocol' | 'enabled'>
