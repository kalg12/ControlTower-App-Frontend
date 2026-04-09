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
  source?: TicketSource
  sourceRefId?: string
  posContext?: PosContext
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

export interface TicketCommentResponse {
  id: string
  authorId: string | null
  content: string
  internal: boolean
  senderType: 'OPERATOR' | 'POS_USER'
  createdAt: string
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
