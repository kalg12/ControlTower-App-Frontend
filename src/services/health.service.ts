import api from '@/services/api'
import type { HealthCheck, HealthSummary, HealthIncident } from '@/types/health'
import type { PaginatedResponse } from '@/types/api'

export const healthService = {
  async getChecks(params?: { page?: number; size?: number; clientId?: string }): Promise<PaginatedResponse<HealthCheck>> {
    const res = await api.get<PaginatedResponse<HealthCheck>>('/health/checks', { params })
    return res.data
  },

  async getSummary(): Promise<HealthSummary> {
    const res = await api.get<HealthSummary>('/health/summary')
    return res.data
  },

  async getIncidents(params?: { page?: number; size?: number }): Promise<PaginatedResponse<HealthIncident>> {
    const res = await api.get<PaginatedResponse<HealthIncident>>('/health/incidents', { params })
    return res.data
  },

  async getBranchHealth(branchId: string): Promise<HealthCheck> {
    const res = await api.get<HealthCheck>(`/health/branches/${branchId}`)
    return res.data
  },

  async triggerCheck(branchId: string): Promise<HealthCheck> {
    const res = await api.post<HealthCheck>(`/health/branches/${branchId}/check`)
    return res.data
  }
}
