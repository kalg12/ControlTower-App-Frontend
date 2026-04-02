import api from '@/services/api'
import type { Campaign } from '@/types/campaign'

interface PageResult<T> {
  content: T[]
  totalElements: number
  totalPages: number
}

export const campaignsService = {
  async list(params: { page?: number; size?: number; search?: string }): Promise<PageResult<Campaign>> {
    const res = await api.get<PageResult<Campaign>>('/campaigns', { params })
    return res.data
  },

  async create(data: {
    name: string
    type: string
    subject?: string
    body: string
    targetAudience?: string
    scheduledAt?: string
  }): Promise<Campaign> {
    const res = await api.post<Campaign>('/campaigns', data)
    return res.data
  },

  async update(id: string, data: Partial<{
    name: string
    subject: string
    body: string
    targetAudience: string
    scheduledAt: string
  }>): Promise<Campaign> {
    const res = await api.patch<Campaign>(`/campaigns/${id}`, data)
    return res.data
  },

  async send(id: string): Promise<void> {
    await api.post(`/campaigns/${id}/send`)
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/campaigns/${id}`)
  }
}
