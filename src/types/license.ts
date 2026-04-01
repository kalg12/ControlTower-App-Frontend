export type LicenseStatus = 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED'

export interface License {
  id: string
  tenantId: string
  clientId?: string
  clientName?: string
  plan: {
    id: string
    name: string
    maxBranches: number
    features: string[]
  }
  status: LicenseStatus
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  stripeSubscriptionId?: string
  createdAt?: string
}

export interface LicenseFilters {
  status?: LicenseStatus
  clientId?: string
  page?: number
  size?: number
}
