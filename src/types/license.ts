export type LicenseStatus = 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED'

export interface License {
  id: string
  tenantId: string
  clientId?: string
  planId?: string
  planName?: string
  status: LicenseStatus
  currentPeriodStart?: string
  currentPeriodEnd?: string
  gracePeriodEnd?: string
  stripeSubscriptionId?: string
  createdAt?: string
  // Legacy fields for backward compat
  clientName?: string
  plan?: {
    id: string
    name: string
    maxBranches: number
    features: string[]
  }
  cancelAtPeriodEnd?: boolean
}

export interface LicenseFilters {
  status?: LicenseStatus
  clientId?: string
  page?: number
  size?: number
}
