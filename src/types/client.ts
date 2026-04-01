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
  slug: string
  contactEmail?: string
  contactPhone?: string
}

export interface UpdateClientRequest {
  name?: string
  contactEmail?: string
  contactPhone?: string
}

export interface ClientFilters {
  search?: string
  page?: number
  size?: number
}
