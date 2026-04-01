export type InvoiceStatus = 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' | 'UNCOLLECTIBLE'

export interface Invoice {
  id: string
  tenantId: string
  stripeInvoiceId?: string
  amount: number
  currency: string
  status: InvoiceStatus
  description?: string
  dueDate?: string
  paidAt?: string
  createdAt: string
}

export interface Subscription {
  id: string
  tenantId: string
  stripeSubscriptionId?: string
  plan: string
  status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING' | 'INCOMPLETE'
  currentPeriodStart?: string
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  createdAt: string
}

export interface BillingOverview {
  subscription?: Subscription
  invoices: Invoice[]
  totalPaid: number
  totalDue: number
  currency: string
}
