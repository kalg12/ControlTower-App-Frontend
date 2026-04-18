export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED'
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type TicketSource = 'MANUAL' | 'HEALTH_ALERT' | 'WEBHOOK' | 'EMAIL' | 'POS'

export interface PosContext {
  posTicketId?: string
  submittedBy?: string
  submitterEmail?: string
  branchId?: string
  branchName?: string
  category?: string
  priority?: string
}

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
  estimatedMinutes?: number | null
  source?: TicketSource
  sourceRefId?: string
  posContext?: PosContext
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  /** @deprecated use slaDueAt. Kept for backward compat. */
  slaDeadline?: string
  slaDueAt?: string | null
  slaBreached?: boolean | null
  escalatedAt?: string | null
}

export interface CreateTicketRequest {
  title: string
  description: string
  priority: TicketPriority
  clientId?: string
  assigneeId?: string
  tags?: string[]
  estimatedMinutes?: number | null
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

export interface TicketCommentResponse {
  id: string
  authorId: string | null
  authorName: string | null
  content: string
  internal: boolean
  senderType: 'OPERATOR' | 'POS_USER'
  createdAt: string
}

export interface TicketStatsResponse {
  total: number
  byStatus: Record<string, number>
}

export interface TicketFilters {
  status?: TicketStatus
  priority?: TicketPriority
  source?: TicketSource
  clientId?: string
  assigneeId?: string
  search?: string
  page?: number
  size?: number
}
