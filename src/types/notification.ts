export type NotificationCategory = 'ALL' | 'TICKETS' | 'KANBAN' | 'FINANCE' | 'SYSTEM'

export interface Notification {
  id: string
  type: string
  title: string
  body: string
  severity: string
  metadata?: Record<string, unknown>
  read: boolean
  readAt?: string
  createdAt: string
}

export interface NotificationFilters {
  unread?: boolean
  type?: string
  page?: number
  size?: number
}

export const CATEGORY_MAP: Record<string, NotificationCategory> = {
  TICKET_ASSIGNED: 'TICKETS',
  TICKET_ESCALATED: 'TICKETS',
  TICKET_SLA_BREACHED: 'TICKETS',
  TICKET_STATUS_CHANGED: 'TICKETS',
  SLA_WARNING: 'TICKETS',
  CSAT_RESPONSE_RECEIVED: 'TICKETS',
  CSAT_LOW_SCORE: 'TICKETS',
  POS_TICKET: 'TICKETS',
  POS_CHAT: 'TICKETS',
  CARD_DUE_SOON: 'KANBAN',
  CARD_OVERDUE: 'KANBAN',
  ESTIMATE_EXCEEDED: 'KANBAN',
  INVOICE_DUE_SOON: 'FINANCE',
  INVOICE_OVERDUE: 'FINANCE',
  HEALTH_INCIDENT: 'SYSTEM',
  LICENSE_EXPIRING_SOON: 'SYSTEM',
  WEBHOOK_FAILED: 'SYSTEM',
}

export function getCategory(type: string): NotificationCategory {
  return CATEGORY_MAP[type] ?? 'SYSTEM'
}

export function getEntityLink(notif: Notification): string | null {
  const meta = notif.metadata ?? {}
  const ticketId = meta.ticketId as string | undefined
  const cardId = meta.cardId as string | undefined
  const invoiceId = meta.invoiceId as string | undefined

  if (ticketId) return `/tickets/${ticketId}`
  if (cardId) return `/kanban`
  if (invoiceId) return `/finance`
  return null
}
