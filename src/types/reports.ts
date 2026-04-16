export interface TicketTrendPoint {
  date: string // yyyy-MM-dd
  count: number
}

export interface AgentPerformanceRow {
  agentId: string
  agentName: string
  assigned: number
  resolved: number
  avgMinutes: number | null
  slaRate: number | null
}

export interface TopClientRow {
  clientId: string
  clientName: string
  ticketCount: number
}

export interface SlaTrendPoint {
  date: string // yyyy-MM-dd
  ok: number
  breached: number
}
