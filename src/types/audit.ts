export interface AuditLog {
  id: string
  tenantId: string
  userId?: string
  userName?: string
  userEmail?: string
  action: string
  resourceType?: string
  resourceId?: string
  result?: string
  oldValue?: string
  newValue?: string
  ipAddress?: string
  userAgent?: string
  correlationId?: string
  createdAt: string
}

export interface AuditFilters {
  userId?: string
  action?: string
  resourceType?: string
  from?: string
  to?: string
  page?: number
  size?: number
}
