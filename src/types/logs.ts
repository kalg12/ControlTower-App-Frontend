export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL'

export interface RemoteLog {
  id: string
  tenantId: string
  endpointId?: string
  level: LogLevel
  serviceName?: string
  message: string
  stackTrace?: string
  businessName?: string
  source?: string
  metadata?: Record<string, unknown>
  receivedAt: string
}

export interface LogsFilters {
  page?: number
  size?: number
  level?: string
  service?: string
  businessName?: string
  from?: string
  to?: string
}
