export interface BillingEvent {
  id: string
  tenantId: string
  clientId?: string
  eventType: string
  amount?: number
  currency?: string
  stripeEventId?: string
  metadata?: Record<string, unknown>
  createdAt: string
}
