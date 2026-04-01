export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN'

export interface HealthCheck {
  id: string
  branchId: string
  branchName: string
  clientName: string
  clientId: string
  status: HealthStatus
  latencyMs?: number
  checkedAt: string
  message?: string
}

export interface HealthSummary {
  total: number
  healthy: number
  degraded: number
  down: number
  unknown: number
}

export interface HealthIncident {
  id: string
  branchId: string
  branchName: string
  clientName: string
  status: HealthStatus
  startedAt: string
  resolvedAt?: string
  duration?: number
  message?: string
}
