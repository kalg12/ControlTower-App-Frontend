import api from '@/services/api'
import type { AuditLog, AuditFilters } from '@/types/audit'
import type { PaginatedResponse } from '@/types/api'

export const auditService = {
  async list(filters?: AuditFilters): Promise<PaginatedResponse<AuditLog>> {
    const res = await api.get<PaginatedResponse<AuditLog>>('/audit', { params: filters })
    return res.data
  }
}
