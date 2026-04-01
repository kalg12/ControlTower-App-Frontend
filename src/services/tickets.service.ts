import api from '@/services/api'
import type { Ticket, CreateTicketRequest, UpdateTicketRequest, TicketFilters } from '@/types/ticket'
import type { PaginatedResponse } from '@/types/api'

export const ticketsService = {
  async list(filters?: TicketFilters): Promise<PaginatedResponse<Ticket>> {
    const res = await api.get<PaginatedResponse<Ticket>>('/tickets', { params: filters })
    return res.data
  },

  async getById(id: string): Promise<Ticket> {
    const res = await api.get<Ticket>(`/tickets/${id}`)
    return res.data
  },

  async create(data: CreateTicketRequest): Promise<Ticket> {
    const res = await api.post<Ticket>('/tickets', data)
    return res.data
  },

  async update(id: string, data: UpdateTicketRequest): Promise<Ticket> {
    const res = await api.patch<Ticket>(`/tickets/${id}`, data)
    return res.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/tickets/${id}`)
  },

  async bulkUpdateStatus(ids: string[], status: string): Promise<void> {
    await api.post('/tickets/bulk/status', { ids, status })
  },

  async bulkDelete(ids: string[]): Promise<void> {
    await api.post('/tickets/bulk/delete', { ids })
  },

  async assign(id: string, assigneeId: string): Promise<Ticket> {
    const res = await api.post<Ticket>(`/tickets/${id}/assign`, { assigneeId })
    return res.data
  },

  async addComment(id: string, comment: string): Promise<void> {
    await api.post(`/tickets/${id}/comments`, { comment })
  },

  async exportCsv(filters?: Pick<TicketFilters, 'status' | 'priority' | 'search'>): Promise<Blob> {
    const res = await api.get('/tickets/export', {
      params: filters,
      responseType: 'blob',
      // bypass the ApiResponse interceptor for blob responses
      transformResponse: [(data) => data]
    })
    return res.data as Blob
  }
}
