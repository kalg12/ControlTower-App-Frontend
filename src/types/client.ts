export interface Client {
  id: string
  tenantId: string
  name: string
  legalName?: string
  taxId?: string
  country?: string
  status?: string
  notes?: string
  website?: string
  industry?: string
  segment?: 'SMB' | 'MID_MARKET' | 'ENTERPRISE'
  accountOwnerId?: string
  accountOwnerName?: string
  healthScore?: number
  totalRevenue?: number
  contactCount?: number
  branchCount?: number
  createdAt: string
  branches?: ClientBranch[]
}

export interface ClientContact {
  id: string
  clientId: string
  fullName: string
  email?: string
  phone?: string
  role: 'OWNER' | 'TECHNICAL' | 'BILLING' | 'SUPPORT'
  primary: boolean
  notes?: string
  createdAt: string
}

export interface ClientBranch {
  id: string
  name: string
  slug: string
  clientId: string
  address?: string
  city?: string
  state?: string
  country?: string
  timezone?: string
  isActive: boolean
}

export interface CreateClientRequest {
  name: string
  legalName?: string
  taxId?: string
  country?: string
  notes?: string
  website?: string
  industry?: string
  segment?: string
}

export interface UpdateClientRequest {
  name: string
  legalName?: string
  taxId?: string
  country?: string
  notes?: string
  website?: string
  industry?: string
  segment?: string
  accountOwnerId?: string
}

export interface CreateContactRequest {
  fullName: string
  email?: string
  phone?: string
  role?: string
  primary?: boolean
  notes?: string
}

export interface CreateBranchRequest {
  name: string
  address?: string
  city?: string
  country?: string
  timezone?: string
}

export interface ClientFilters {
  search?: string
  page?: number
  size?: number
}

// ── CRM: Interactions ──────────────────────────────────────────────────

export interface ClientInteraction {
  id: string
  clientId: string
  branchId?: string
  branchName?: string
  userId: string
  userName: string
  interactionType: InteractionType
  title: string
  description?: string
  occurredAt: string
  ticketId?: string
  outcome?: string
  durationMinutes?: number
  createdAt: string
}

export type InteractionType =
  | 'CALL'
  | 'MEETING'
  | 'EMAIL'
  | 'MESSAGE'
  | 'SITE_VISIT'
  | 'DEMO'
  | 'SUPPORT'
  | 'FOLLOW_UP'
  | 'OTHER'

export interface CreateInteractionRequest {
  title: string
  description?: string
  interactionType: InteractionType
  branchId?: string
  occurredAt?: string
  ticketId?: string
  outcome?: string
  durationMinutes?: number
}

// ── CRM: Opportunities ─────────────────────────────────────────────────

export interface ClientOpportunity {
  id: string
  clientId: string
  clientName: string
  branchId?: string
  title: string
  description?: string
  value?: number
  currency: string
  stage: OpportunityStage
  probability: number
  ownerId?: string
  ownerName?: string
  expectedCloseDate?: string
  closedDate?: string
  lossReason?: string
  source?: OpportunitySource
  createdAt: string
}

export type OpportunityStage =
  | 'PROSPECTING'
  | 'QUALIFIED'
  | 'DEMO_SCHEDULED'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATION'
  | 'VERBAL_COMMIT'
  | 'CLOSED_WON'
  | 'CLOSED_LOST'

export type OpportunitySource =
  | 'INBOUND'
  | 'OUTBOUND'
  | 'REFERRAL'
  | 'WEBSITE'
  | 'EXISTING_CLIENT'
  | 'DEMO_REQUEST'
  | 'SUPPORT_ESCALATION'
  | 'OTHER'

export interface CreateOpportunityRequest {
  title: string
  description?: string
  value?: number
  currency?: string
  stage: OpportunityStage
  probability?: number
  ownerId?: string
  expectedCloseDate?: string
  source?: OpportunitySource
  lossReason?: string
}

export interface UpdateOpportunityRequest {
  title?: string
  description?: string
  value?: number
  currency?: string
  stage?: OpportunityStage
  probability?: number
  ownerId?: string
  expectedCloseDate?: string
  lossReason?: string
}
