import api from '@/services/api'
import type { PaginatedResponse } from '@/types/api'
import type { Proposal, ProposalRequest, ProposalFilters } from '@/types/proposal'

export const proposalsService = {
  async list(filters?: ProposalFilters): Promise<PaginatedResponse<Proposal>> {
    const res = await api.get<PaginatedResponse<Proposal>>('/proposals', { params: filters })
    return res.data
  },

  async get(id: string): Promise<Proposal> {
    const res = await api.get<Proposal>(`/proposals/${id}`)
    return res.data
  },

  async create(data: ProposalRequest): Promise<Proposal> {
    const res = await api.post<Proposal>('/proposals', data)
    return res.data
  },

  async update(id: string, data: ProposalRequest): Promise<Proposal> {
    const res = await api.put<Proposal>(`/proposals/${id}`, data)
    return res.data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/proposals/${id}`)
  },

  async send(id: string): Promise<Proposal> {
    const res = await api.post<Proposal>(`/proposals/${id}/send`)
    return res.data
  },

  async accept(id: string): Promise<Proposal> {
    const res = await api.post<Proposal>(`/proposals/${id}/accept`)
    return res.data
  },

  async reject(id: string): Promise<Proposal> {
    const res = await api.post<Proposal>(`/proposals/${id}/reject`)
    return res.data
  },

  async markViewed(id: string): Promise<Proposal> {
    const res = await api.post<Proposal>(`/proposals/${id}/mark-viewed`)
    return res.data
  },

  async listByClient(clientId: string, filters?: { status?: string; page?: number; size?: number }): Promise<PaginatedResponse<Proposal>> {
    const res = await api.get<PaginatedResponse<Proposal>>(`/clients/${clientId}/proposals`, { params: filters })
    return res.data
  }
}
