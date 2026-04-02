import api from '@/services/api'
import type { License, LicenseFilters } from '@/types/license'
import type { PaginatedResponse } from '@/types/api'

export const licensesService = {
  async list(filters?: LicenseFilters): Promise<PaginatedResponse<License>> {
    const res = await api.get<PaginatedResponse<License>>('/licenses', { params: filters })
    return res.data
  },

  async getById(id: string): Promise<License> {
    const res = await api.get<License>(`/licenses/${id}`)
    return res.data
  },

  async getByClient(clientId: string): Promise<License[]> {
    const res = await api.get<License[]>(`/licenses/clients/${clientId}`)
    return res.data
  },

  async suspend(id: string, reason?: string): Promise<License> {
    const res = await api.post<License>(`/licenses/${id}/suspend`, { reason })
    return res.data
  },

  async reactivate(id: string): Promise<License> {
    const res = await api.post<License>(`/licenses/${id}/reactivate`)
    return res.data
  },

  async cancel(id: string): Promise<License> {
    const res = await api.post<License>(`/licenses/${id}/cancel`)
    return res.data
  }
}
