import api from '@/services/api'
import type { Tenant } from '@/types/tenant'
import type { PaginatedResponse } from '@/types/api'

export const tenantsService = {
  async list(params?: { page?: number; size?: number }): Promise<PaginatedResponse<Tenant>> {
    const res = await api.get<PaginatedResponse<Tenant>>('/tenants', { params })
    return res.data
  },

  async getById(id: string): Promise<Tenant> {
    const res = await api.get<Tenant>(`/tenants/${id}`)
    return res.data
  },

  async suspend(id: string): Promise<void> {
    await api.post(`/tenants/${id}/suspend`)
  },

  async reactivate(id: string): Promise<void> {
    await api.post(`/tenants/${id}/reactivate`)
  }
}
