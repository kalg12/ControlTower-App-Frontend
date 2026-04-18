import api from '@/services/api'
import type { Notification, NotificationFilters } from '@/types/notification'
import type { PaginatedResponse } from '@/types/api'

export const notificationsService = {
  async list(filters?: NotificationFilters): Promise<PaginatedResponse<Notification>> {
    const res = await api.get<PaginatedResponse<Notification>>('/notifications', { params: filters })
    return res.data
  },

  async markRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`)
  },

  async markAllRead(): Promise<void> {
    await api.patch('/notifications/read-all')
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`)
  },

  async removeAll(): Promise<void> {
    await api.delete('/notifications')
  },

  async getPreferences(): Promise<Array<{ id: string; userId: string; notificationType: string; enabled: boolean }>> {
    const res = await api.get('/notifications/preferences')
    return res.data
  },

  async setPreference(type: string, enabled: boolean): Promise<void> {
    await api.put(`/notifications/preferences/${type}`, null, { params: { enabled } })
  }
}
