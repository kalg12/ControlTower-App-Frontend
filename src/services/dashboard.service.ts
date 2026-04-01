import api from '@/services/api'
import type { Ticket } from '@/types/ticket'
import type { HealthCheck } from '@/types/health'

export interface DashboardStats {
  totalClients: number
  openTickets: number
  healthyBranches: number
  totalBranches: number
  activeLicenses: number
  criticalAlerts: number
}

export interface DashboardData {
  stats: DashboardStats
  recentTickets: Ticket[]
  healthOverview: HealthCheck[]
}

export const dashboardService = {
  async getDashboard(): Promise<DashboardData> {
    const res = await api.get<DashboardData>('/dashboard')
    return res.data
  },

  async getStats(): Promise<DashboardStats> {
    const res = await api.get<DashboardStats>('/dashboard/stats')
    return res.data
  }
}
