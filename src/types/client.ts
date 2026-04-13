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
  contactCount?: number
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
