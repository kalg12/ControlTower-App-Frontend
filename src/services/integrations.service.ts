import api from '@/services/api'
import type { Integration, CreateIntegrationRequest } from '@/types/integration'

export const integrationsService = {
  async list(): Promise<Integration[]> {
    const res = await api.get<Integration[]>('/integrations')
    return res.data
  },

  async create(data: CreateIntegrationRequest): Promise<Integration> {
    const res = await api.post<Integration>('/integrations', data)
    return res.data
  },

  async activate(id: string): Promise<Integration> {
    const res = await api.post<Integration>(`/integrations/${id}/activate`)
    return res.data
  },

  async deactivate(id: string): Promise<Integration> {
    const res = await api.post<Integration>(`/integrations/${id}/deactivate`)
    return res.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/integrations/${id}`)
  },

  async testWebhook(id: string): Promise<void> {
    await api.post(`/integrations/${id}/test`)
  }
}
