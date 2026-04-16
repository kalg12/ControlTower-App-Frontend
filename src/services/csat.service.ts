import api from '@/services/api'
import axios from 'axios'
import type { CsatSurvey, CsatSubmitRequest } from '@/types/csat'
import type { PaginatedResponse } from '@/types/api'

// Base URL for public endpoints (no auth interceptor)
const publicApi = axios.create({ baseURL: api.defaults.baseURL })

export const csatService = {
  async createOrGet(ticketId: string): Promise<CsatSurvey> {
    const res = await api.post<CsatSurvey>(`/tickets/${ticketId}/csat`)
    return res.data
  },

  async listByTicket(ticketId: string): Promise<CsatSurvey[]> {
    const res = await api.get<CsatSurvey[]>(`/tickets/${ticketId}/csat`)
    return res.data
  },

  async list(page = 0, size = 20): Promise<PaginatedResponse<CsatSurvey>> {
    const res = await api.get<PaginatedResponse<CsatSurvey>>('/csat', { params: { page, size } })
    return res.data
  },

  // Public endpoints — no auth token
  async getByToken(token: string): Promise<CsatSurvey> {
    const res = await publicApi.get<{ data: CsatSurvey }>(`/api/v1/survey/${token}`)
    return res.data.data
  },

  async submit(token: string, data: CsatSubmitRequest): Promise<CsatSurvey> {
    const res = await publicApi.post<{ data: CsatSurvey }>(`/api/v1/survey/${token}`, data)
    return res.data.data
  }
}
