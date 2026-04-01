import api from '@/services/api'
import type { HealthCheck, HealthIncident } from '@/types/health'
import type { PaginatedResponse } from '@/types/api'

export const healthService = {
  // GET /health/clients → array (not paginated)
  async getClients(): Promise<HealthCheck[]> {
    const res = await api.get<HealthCheck[]>('/health/clients')
    return res.data
  },

  // GET /health/incidents → paginated
  async getIncidents(params?: { page?: number; size?: number; branchId?: string }): Promise<PaginatedResponse<HealthIncident>> {
    const res = await api.get<PaginatedResponse<HealthIncident>>('/health/incidents', { params })
    return res.data
  },

  // POST /health/incidents/{id}/resolve
  async resolveIncident(id: string): Promise<void> {
    await api.post(`/health/incidents/${id}/resolve`)
  }
}
