import api from '@/services/api'
import type {
  TimeEntry,
  TimeSummary,
  SlaConfig,
  TimeAnalytics,
  StartTimerRequest,
  LogTimeRequest,
  TimeEntityType,
  UpdateSlaConfigRequest,
} from '@/types/time-tracking'

export const timeTrackingService = {
  // ── Timer control ──────────────────────────────────────────────────

  async startTimer(request: StartTimerRequest): Promise<TimeEntry> {
    const res = await api.post<TimeEntry>('/time-entries/start', request)
    return res.data
  },

  async stopTimer(id: string): Promise<TimeEntry> {
    const res = await api.patch<TimeEntry>(`/time-entries/${id}/stop`)
    return res.data
  },

  async getActiveTimer(): Promise<TimeEntry | null> {
    const res = await api.get<TimeEntry | null>('/time-entries/active')
    return res.data
  },

  // ── Manual log ────────────────────────────────────────────────────

  async logManual(request: LogTimeRequest): Promise<TimeEntry> {
    const res = await api.post<TimeEntry>('/time-entries/log', request)
    return res.data
  },

  // ── List & summary ────────────────────────────────────────────────

  async listEntries(entityType: TimeEntityType, entityId: string): Promise<TimeEntry[]> {
    const res = await api.get<TimeEntry[]>('/time-entries', {
      params: { entityType, entityId },
    })
    return res.data
  },

  async getSummary(entityType: TimeEntityType, entityId: string): Promise<TimeSummary> {
    const res = await api.get<TimeSummary>('/time-entries/summary', {
      params: { entityType, entityId },
    })
    return res.data
  },

  // ── Delete ────────────────────────────────────────────────────────

  async deleteEntry(id: string): Promise<void> {
    await api.delete(`/time-entries/${id}`)
  },

  // ── SLA Config ────────────────────────────────────────────────────

  async getSlaConfig(): Promise<SlaConfig> {
    const res = await api.get<SlaConfig>('/sla-config')
    return res.data
  },

  async updateSlaConfig(updates: UpdateSlaConfigRequest): Promise<SlaConfig> {
    const res = await api.put<SlaConfig>('/sla-config', updates)
    return res.data
  },

  // ── Analytics ────────────────────────────────────────────────────

  async getAnalytics(from?: string, to?: string): Promise<TimeAnalytics> {
    const res = await api.get<TimeAnalytics>('/analytics/time', {
      params: { from, to },
    })
    return res.data
  },
}
