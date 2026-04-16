import api from '@/services/api'
import type { AgentPerformanceRow, SlaTrendPoint, TicketTrendPoint, TopClientRow } from '@/types/reports'

export interface ReportParams {
  from?: string // ISO instant e.g. 2025-01-01T00:00:00Z
  to?: string
}

export const reportsService = {
  async getTicketsTrend(params?: ReportParams): Promise<TicketTrendPoint[]> {
    const res = await api.get<TicketTrendPoint[]>('/reports/tickets-trend', { params })
    return res.data
  },

  async getAgentPerformance(params?: ReportParams): Promise<AgentPerformanceRow[]> {
    const res = await api.get<AgentPerformanceRow[]>('/reports/agent-performance', { params })
    return res.data
  },

  async getTopClients(params?: ReportParams & { limit?: number }): Promise<TopClientRow[]> {
    const res = await api.get<TopClientRow[]>('/reports/top-clients', { params })
    return res.data
  },

  async getSlaTrend(params?: ReportParams): Promise<SlaTrendPoint[]> {
    const res = await api.get<SlaTrendPoint[]>('/reports/sla-trend', { params })
    return res.data
  }
}
