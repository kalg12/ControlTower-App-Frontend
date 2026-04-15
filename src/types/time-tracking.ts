export type TimeEntityType = 'TICKET' | 'CARD'

export interface TimeEntry {
  id: string
  userId: string
  entityType: TimeEntityType
  entityId: string
  startedAt: string
  endedAt: string | null
  minutes: number | null
  note: string | null
  active: boolean
  createdAt: string
}

export interface TimeSummary {
  entityId: string
  entityType: TimeEntityType
  /** Estimated minutes set on the ticket or card. Null when not defined. */
  estimatedMinutes: number | null
  /** Sum of all stopped time entries (minutes). */
  loggedMinutes: number
  entries: TimeEntry[]
}

export interface SlaConfig {
  low: number
  medium: number
  high: number
  critical: number
}

export interface StartTimerRequest {
  entityType: TimeEntityType
  entityId: string
}

export interface LogTimeRequest {
  entityType: TimeEntityType
  entityId: string
  minutes: number
  note?: string
}

export interface UpdateSlaConfigRequest {
  low?: number
  medium?: number
  high?: number
  critical?: number
}

export interface TimeAnalytics {
  avgResolutionMinutes: number
  slaComplianceRate: number
  totalEntries: number
  totalLoggedMinutes: number
  topUsers: Array<{ userId: string; totalMinutes: number }>
}

/** Formats minutes as "Xh Ym" (e.g. "1h 30m" or "45m"). */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

/** Formats elapsed seconds as "HH:MM:SS". */
export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}
