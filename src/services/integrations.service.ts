import api from '@/services/api'
import type { Integration, CreateIntegrationRequest } from '@/types/integration'
import type { PaginatedResponse } from '@/types/api'

export const integrationsService = {
  async list(page = 0, size = 20, type?: string): Promise<PaginatedResponse<Integration>> {
    const res = await api.get<PaginatedResponse<Integration>>('/integrations', {
      params: { page, size, ...(type ? { type } : {}) }
    })
    return res.data
  },

  async create(data: CreateIntegrationRequest): Promise<Integration> {
    const res = await api.post<Integration>('/integrations', data)
    return res.data
  },

  async activate(id: string): Promise<Integration> {
    const res = await api.patch<Integration>(`/integrations/${id}/activate`)
    return res.data
  },

  async deactivate(id: string): Promise<void> {
    await api.patch(`/integrations/${id}/deactivate`)
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/integrations/${id}`)
  },

  async checkNow(id: string): Promise<void> {
    await api.post(`/integrations/${id}/check-now`)
  }
}
