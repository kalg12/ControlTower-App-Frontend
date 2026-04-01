export type HealthStatus = 'UP' | 'DOWN' | 'DEGRADED' | 'HEALTHY' | 'UNKNOWN'

// Backend response from GET /api/v1/health/clients (array, not paginated)
export interface HealthCheck {
  branchId: string
  status: HealthStatus
  latencyMs?: number
  version?: string
  lastCheckedAt: string
  openIncidents: number
  // Legacy fields for UI compatibility
  id?: string
  branchName?: string
  clientName?: string
  clientId?: string
  checkedAt?: string
  message?: string
}

export interface HealthSummary {
  total: number
  healthy: number
  degraded: number
  down: number
  unknown: number
}

// Backend response from GET /api/v1/health/incidents (paginated)
export interface HealthIncident {
  branchId: string
  severity: string
  description: string
  openedAt: string
  resolvedAt?: string
  open: boolean
  autoCreated: boolean
  // Legacy fields
  id?: string
  branchName?: string
  clientName?: string
  startedAt?: string
}
