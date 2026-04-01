export interface AuditLog {
  id: string
  tenantId: string
  userId?: string
  userName?: string
  action: string
  resourceType: string
  resourceId?: string
  details?: string
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

export interface AuditFilters {
  userId?: string
  action?: string
  resourceType?: string
  page?: number
  size?: number
}
