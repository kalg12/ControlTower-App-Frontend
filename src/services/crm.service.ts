import api from '@/services/api'
import type {
  ClientInteraction,
  CreateInteractionRequest,
  ClientOpportunity,
  CreateOpportunityRequest,
  UpdateOpportunityRequest,
} from '@/types/client'
import type { PaginatedResponse } from '@/types/api'

export const crmService = {
  // ── Interactions ──────────────────────────────────────────────────

  async getInteractions(
    clientId: string,
    params?: { page?: number; size?: number }
  ): Promise<PaginatedResponse<ClientInteraction>> {
    const res = await api.get<PaginatedResponse<ClientInteraction>>(
      `/clients/${clientId}/interactions`,
      { params }
    )
    return res.data
  },

  async logInteraction(
    clientId: string,
    data: CreateInteractionRequest
  ): Promise<ClientInteraction> {
    const res = await api.post<ClientInteraction>(`/clients/${clientId}/interactions`, data)
    return res.data
  },

  async deleteInteraction(interactionId: string): Promise<void> {
    await api.delete(`/clients/interactions/${interactionId}`)
  },

  // ── Opportunities ─────────────────────────────────────────────────

  async getOpportunities(
    clientId: string,
    params?: { page?: number; size?: number }
  ): Promise<PaginatedResponse<ClientOpportunity>> {
    const res = await api.get<PaginatedResponse<ClientOpportunity>>(
      `/clients/${clientId}/opportunities`,
      { params }
    )
    return res.data
  },

  async getAllOpportunities(
    params?: { page?: number; size?: number }
  ): Promise<PaginatedResponse<ClientOpportunity>> {
    const res = await api.get<PaginatedResponse<ClientOpportunity>>(
      '/clients/opportunities',
      { params }
    )
    return res.data
  },

  async getActivePipeline(): Promise<ClientOpportunity[]> {
    const res = await api.get<{ success: boolean; data: ClientOpportunity[] }>(
      '/clients/opportunities/pipeline'
    )
    return res.data
  },

  async createOpportunity(
    clientId: string,
    data: CreateOpportunityRequest
  ): Promise<ClientOpportunity> {
    const res = await api.post<ClientOpportunity>(`/clients/${clientId}/opportunities`, data)
    return res.data
  },

  async updateOpportunity(
    oppId: string,
    data: UpdateOpportunityRequest
  ): Promise<ClientOpportunity> {
    const res = await api.put<ClientOpportunity>(`/clients/opportunities/${oppId}`, data)
    return res.data
  },

  async deleteOpportunity(oppId: string): Promise<void> {
    await api.delete(`/clients/opportunities/${oppId}`)
  },
}
