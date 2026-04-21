import api from '@/services/api'

export interface GoogleCalendarStatus {
  connected: boolean
  email?: string
  lastSyncedAt?: string
}

export interface GoogleCalendarSettings {
  getStatus(): Promise<GoogleCalendarStatus>
  connect(authCode: string): Promise<void>
  disconnect(): Promise<void>
  syncNow(): Promise<void>
}

export const calendarSettingsService: GoogleCalendarSettings = {
  async getStatus() {
    const { data } = await api.get<GoogleCalendarStatus>('/api/v1/calendar/google/status')
    return data
  },

  async connect(authCode: string) {
    await api.post('/api/v1/calendar/google/connect', { authCode })
  },

  async disconnect() {
    await api.post('/api/v1/calendar/google/disconnect')
  },

  async syncNow() {
    await api.post('/api/v1/calendar/google/sync')
  },
}