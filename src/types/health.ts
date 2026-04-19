export type HealthStatus = 'UP' | 'DOWN' | 'DEGRADED' | 'HEALTHY' | 'UNKNOWN'

// Backend response from GET /api/v1/health/clients (array, not paginated)
export interface HealthCheck {
  branchId: string
  branchName?: string
  clientName?: string
  status: HealthStatus
  latencyMs?: number
  version?: string
  lastCheckedAt: string
  openIncidents: number
  errorMessage?: string
  // Legacy fields for UI compatibility
  id?: string
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
  id?: string
  branchId: string
  branchName?: string
  severity: string
  description: string
  openedAt: string
  resolvedAt?: string
  resolvedBy?: string
  resolvedByUserName?: string
  resolutionNote?: string
  open: boolean
  autoCreated: boolean
  autoResolved: boolean
  durationSeconds: number
  // Legacy fields
  clientName?: string
  startedAt?: string
}
