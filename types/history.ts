import type { MemorySnapshot, SystemSnapshot } from './system'

export interface HistorySample {
  id: string
  recordedAt: string
  cpu: { usagePercent: number | null; temperatureCelsius: number | null; reportedFrequencyMhz: number | null }
  memory: MemorySnapshot
  network: { status: string; interfaces: { id: string; name: string; default: boolean; state: string; receiveBytesPerSecond: number | null; transmitBytesPerSecond: number | null }[] }
}
export interface HistoryDay { from: string; to: string; intervalMs: number; samples: HistorySample[] }
export interface HistoryDetail { id: string; recordedAt: string; snapshot: SystemSnapshot }
