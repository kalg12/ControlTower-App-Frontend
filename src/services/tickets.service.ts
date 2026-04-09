import api from '@/services/api'
import type { Ticket, TicketCommentResponse, CreateTicketRequest, TicketFilters, TicketStatus } from '@/types/ticket'
import type { PaginatedResponse } from '@/types/api'

/** Aligned with backend TicketController (/api/v1/tickets) */
export const ticketsService = {
  async list(filters?: TicketFilters & { slaAtRisk?: boolean; slaWindowHours?: number }): Promise<PaginatedResponse<Ticket>> {
    const res = await api.get<PaginatedResponse<Ticket>>('/tickets', {
      params: {
        status: filters?.status,
        priority: filters?.priority,
        source: filters?.source,
        clientId: filters?.clientId,
        assigneeId: filters?.assigneeId,
        page: filters?.page,
        size: filters?.size
      }
    })
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

  async updateStatus(id: string, status: TicketStatus): Promise<Ticket> {
    const res = await api.patch<Ticket>(`/tickets/${id}/status`, null, { params: { status } })
    return res.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/tickets/${id}`)
  },

  async bulkUpdateStatus(ticketIds: string[], status: TicketStatus): Promise<Ticket[]> {
    const res = await api.post<Ticket[]>('/tickets/bulk/status', { ticketIds, status })
    return res.data
  },

  async bulkAssign(ticketIds: string[], assigneeId: string): Promise<Ticket[]> {
    const res = await api.post<Ticket[]>('/tickets/bulk/assign', { ticketIds, assigneeId })
    return res.data
  },

  async assign(id: string, assigneeId: string): Promise<Ticket> {
    const res = await api.post<Ticket>(`/tickets/${id}/assign`, null, { params: { assigneeId } })
    return res.data
  },

  async escalate(id: string): Promise<Ticket> {
    const res = await api.post<Ticket>(`/tickets/${id}/escalate`)
    return res.data
  },

  async getComments(id: string): Promise<TicketCommentResponse[]> {
    const res = await api.get<TicketCommentResponse[]>(`/tickets/${id}/comments`)
    return res.data
  },

  async addComment(id: string, content: string, internal = false): Promise<Ticket> {
    const res = await api.post<Ticket>(`/tickets/${id}/comments`, { content, internal })
    return res.data
  },

  async exportCsv(filters?: Pick<TicketFilters, 'status' | 'priority'>): Promise<Blob> {
    const res = await api.get('/tickets/export', {
      params: filters,
      responseType: 'blob',
      transformResponse: [(data) => data]
    })
    return res.data as Blob
  }
}
