export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED'
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface Ticket {
  id: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  tenantId: string
  clientId?: string
  clientName?: string
  assigneeId?: string
  assigneeName?: string
  labels?: string[]
  commentsCount?: number
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  slaDeadline?: string
}

export interface CreateTicketRequest {
  title: string
  description: string
  priority: TicketPriority
  clientId?: string
  assigneeId?: string
  tags?: string[]
}

export interface UpdateTicketRequest {
  title?: string
  description?: string
  status?: TicketStatus
  priority?: TicketPriority
  assigneeId?: string
  tags?: string[]
}

export interface TicketComment {
  id: string
  ticketId: string
  userId?: string
  userName?: string
  body: string
  createdAt: string
}

export interface TicketFilters {
  status?: TicketStatus
  priority?: TicketPriority
  clientId?: string
  assigneeId?: string
  search?: string
  page?: number
  size?: number
}
