import api from '@/services/api'
import type { DashboardStats } from '@/types/dashboard'

export const dashboardService = {
  async getDashboard(): Promise<DashboardStats> {
    const res = await api.get<DashboardStats>('/dashboard')
    return res.data
  }
}
