import api from '@/services/api'

export interface NotificationPreferences {
  emailAlerts: boolean
  ticketUpdates: boolean
  healthAlerts: boolean
  licenseAlerts: boolean
  weeklyDigest: boolean
}

const defaultPrefs: NotificationPreferences = {
  emailAlerts: true,
  ticketUpdates: true,
  healthAlerts: true,
  licenseAlerts: true,
  weeklyDigest: false
}

export const settingsService = {
  async getNotificationPreferences(): Promise<NotificationPreferences> {
    // validateStatus prevents 403/404 from throwing — endpoint may not exist yet
    const res = await api.get<NotificationPreferences>('/settings/notifications', {
      validateStatus: s => s < 500
    })
    if (!res.data || res.status !== 200) return { ...defaultPrefs }
    return res.data
  },

  async saveNotificationPreferences(prefs: NotificationPreferences): Promise<void> {
    await api.put('/settings/notifications', prefs)
  }
}
