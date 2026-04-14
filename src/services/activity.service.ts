import api from '@/services/api'
import type { PaginatedResponse } from '@/types/api'

export interface UserActivity {
  id: string
  userId: string
  userName: string
  userEmail: string
  routePath: string
  pageTitle?: string
  durationSeconds?: number
  fullUrl?: string
  sessionId?: string
  ipAddress?: string
  visitedAt: string
}

export interface TrackActivityRequest {
  routePath: string
  pageTitle?: string
  durationSeconds?: number
  fullUrl?: string
  sessionId?: string
  visitedAt?: string
}

export const activityService = {
  async track(data: TrackActivityRequest): Promise<void> {
    await api.post('/activity/track', data)
  },

  async query(params?: {
    userId?: string
    from?: string
    to?: string
    page?: number
    size?: number
  }): Promise<PaginatedResponse<UserActivity>> {
    const res = await api.get<PaginatedResponse<UserActivity>>('/activity', { params })
    return res.data
  },

  async myActivity(params?: {
    page?: number
    size?: number
  }): Promise<PaginatedResponse<UserActivity>> {
    const res = await api.get<PaginatedResponse<UserActivity>>('/activity/me', { params })
    return res.data
  },

  async activeUsers(): Promise<number> {
    const res = await api.get<number>('/activity/active-users')
    return res.data
  },
}
