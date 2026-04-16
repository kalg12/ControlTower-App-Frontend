import api from '@/services/api'
import type { ResponseTemplate, ResponseTemplateRequest, ResponseTemplateFilters } from '@/types/templates'
import type { PaginatedResponse } from '@/types/api'

export const templatesService = {
  async list(filters?: ResponseTemplateFilters): Promise<PaginatedResponse<ResponseTemplate>> {
    const res = await api.get<PaginatedResponse<ResponseTemplate>>('/templates', { params: filters })
    return res.data
  },

  async create(data: ResponseTemplateRequest): Promise<ResponseTemplate> {
    const res = await api.post<ResponseTemplate>('/templates', data)
    return res.data
  },

  async update(id: string, data: ResponseTemplateRequest): Promise<ResponseTemplate> {
    const res = await api.put<ResponseTemplate>(`/templates/${id}`, data)
    return res.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/templates/${id}`)
  }
}
