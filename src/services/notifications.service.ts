import api from '@/services/api'
import type { Notification, NotificationFilters } from '@/types/notification'
import type { PaginatedResponse } from '@/types/api'

export const notificationsService = {
  async list(filters?: NotificationFilters): Promise<PaginatedResponse<Notification>> {
    const res = await api.get<PaginatedResponse<Notification>>('/notifications', { params: filters })
    return res.data
  },

  async getUnreadCount(): Promise<{ count: number }> {
    const res = await api.get<{ count: number }>('/notifications/unread-count')
    return res.data
  },

  async markRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`)
  },

  async markAllRead(): Promise<void> {
    await api.patch('/notifications/read-all')
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`)
  }
}
