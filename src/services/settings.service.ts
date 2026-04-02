import api from '@/services/api'

export interface NotificationPreferences {
  emailAlerts: boolean
  ticketUpdates: boolean
  healthAlerts: boolean
  licenseAlerts: boolean
  weeklyDigest: boolean
}

export const settingsService = {
  async getNotificationPreferences(): Promise<NotificationPreferences> {
    const res = await api.get<NotificationPreferences>('/settings/notifications')
    return res.data
  },

  async saveNotificationPreferences(prefs: NotificationPreferences): Promise<void> {
    await api.put('/settings/notifications', prefs)
  }
}
