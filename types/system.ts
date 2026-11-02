import type { CpuSnapshot, CpuHistorySample } from './cpu'

export interface MemorySnapshot {
  sampledAt: string | null
  status: 'pending' | 'available' | 'unavailable'
  totalBytes: number | null
  usedBytes: number | null
  availableBytes: number | null
  freeBytes: number | null
  usedPercent: number | null
  reason: string | null
}

export interface NetworkInterfaceSnapshot {
  id: string
  name: string
  state: 'up' | 'down' | 'unknown'
  default: boolean
  virtual: boolean
  ipv4: string[]
  ipv6: string[]
  speedMbps: number | null
  receivedBytes: number | null
  transmittedBytes: number | null
  receiveBytesPerSecond: number | null
  transmitBytesPerSecond: number | null
}

export interface NetworkSnapshot {
  sampledAt: string | null
  status: 'pending' | 'available' | 'unavailable'
  interfaces: NetworkInterfaceSnapshot[]
  reason: string | null
}

export interface SystemSnapshot extends CpuSnapshot {
  memory: MemorySnapshot
  network: NetworkSnapshot
}

export interface SystemHistorySample extends CpuHistorySample {
  network: NetworkSnapshot | null
}

export interface NetworkHistorySample {
  sampledAt: string
  receiveBytesPerSecond: number | null
  transmitBytesPerSecond: number | null
}
