export interface CpuSnapshot {
  sampledAt: string
  samplingIntervalMs: number
  server: { hostname: string; platform: string; release: string; arch: string; uptimeSeconds: number }
  cpu: {
    model: string | null
    manufacturer: string | null
    physicalCores: number | null
    logicalCores: number
    usagePercent: number | null
    reportedFrequencyMhz: number | null
    cores: { index: number; usagePercent: number | null }[]
    temperature: {
      celsius: number | null
      source: string | null
      status: 'pending' | 'available' | 'unavailable'
      checkedAt: string | null
      reason: string | null
    }
  }
}

export interface CpuHistorySample {
  sampledAt: string
  usagePercent: number | null
  temperatureCelsius: number | null
}
