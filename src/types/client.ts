export interface Client {
  id: string
  tenantId: string
  name: string
  legalName?: string
  taxId?: string
  country?: string
  status?: string
  notes?: string
  createdAt: string
  // Legacy fields kept for backward compat
  slug?: string
  contactEmail?: string
  contactPhone?: string
  branches?: ClientBranch[]
  branchCount?: number
}

export interface ClientBranch {
  id: string
  name: string
  slug: string
  clientId: string
  address?: string
  city?: string
  state?: string
  isActive: boolean
}

export interface CreateClientRequest {
  name: string
  legalName?: string
  taxId?: string
  country?: string
}

export interface UpdateClientRequest {
  name?: string
  legalName?: string
  taxId?: string
  country?: string
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
