export type ProposalStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'

export interface ProposalLineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  subtotal: number
  position: number
  createdAt: string
}

export interface Proposal {
  id: string
  tenantId: string
  clientId: string
  clientName?: string | null
  clientEmail?: string | null
  number: string
  title: string
  description?: string | null
  status: ProposalStatus
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  currency: string
  validityDate?: string | null
  notes?: string | null
  terms?: string | null
  sentAt?: string | null
  viewedAt?: string | null
  acceptedAt?: string | null
  rejectedAt?: string | null
  sentById?: string | null
  emailViewedAt?: string | null
  lineItems: ProposalLineItem[]
  createdAt: string
  updatedAt: string
}

export interface ProposalLineItemRequest {
  description: string
  quantity: number
  unitPrice: number
  position?: number
}

export interface ProposalRequest {
  clientId: string
  title: string
  description?: string
  validityDate?: string
  currency?: string
  taxRate?: number
  notes?: string
  terms?: string
  lineItems: ProposalLineItemRequest[]
}

export interface ProposalFilters {
  status?: ProposalStatus
  clientId?: string
  from?: string
  to?: string
  page?: number
  size?: number
}
