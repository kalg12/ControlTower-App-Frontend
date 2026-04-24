import api from '@/services/api'
import type {
  Integration,
  IntegrationCreateResponse,
  IntegrationEvent,
  WebhookDelivery,
  CreateIntegrationRequest,
  UpdateIntegrationRequest,
} from '@/types/integration'
import type { PaginatedResponse } from '@/types/api'

export const integrationsService = {
  async list(page = 0, size = 20, type?: string): Promise<PaginatedResponse<Integration>> {
    const res = await api.get<PaginatedResponse<Integration>>('/integrations', {
      params: { page, size, ...(type ? { type } : {}) }
    })
    return res.data
  },

  async create(data: CreateIntegrationRequest): Promise<IntegrationCreateResponse> {
    const res = await api.post<IntegrationCreateResponse>('/integrations', data)
    return res.data
  },

  async update(id: string, data: UpdateIntegrationRequest): Promise<Integration> {
    const res = await api.put<Integration>(`/integrations/${id}`, data)
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
  },

  async getEvents(id: string, page = 0, size = 20): Promise<PaginatedResponse<IntegrationEvent>> {
    const res = await api.get<PaginatedResponse<IntegrationEvent>>(`/integrations/${id}/events`, {
      params: { page, size }
    })
    return res.data
  },

  async getWebhooks(id: string, page = 0, size = 20): Promise<PaginatedResponse<WebhookDelivery>> {
    const res = await api.get<PaginatedResponse<WebhookDelivery>>(`/integrations/${id}/webhooks`, {
      params: { page, size }
    })
    return res.data
  },

  async regenerateApiKey(id: string): Promise<string> {
    const res = await api.post<string>(`/integrations/${id}/regenerate-key`)
    return res.data
  },
}
