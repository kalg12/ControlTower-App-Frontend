export type PersonStatus = 'PROSPECT' | 'ACTIVE' | 'INACTIVE' | 'CONVERTED'

export type PersonLeadSource =
  | 'REFERRAL' | 'INBOUND' | 'OUTBOUND' | 'WEBSITE' | 'SOCIAL_MEDIA'
  | 'EVENT' | 'WHATSAPP' | 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK' | 'OTHER'

export interface Person {
  id: string
  tenantId: string
  firstName: string
  lastName?: string
  fullName: string
  email?: string
  phone?: string
  whatsapp?: string
  birthDate?: string
  notes?: string
  leadSource?: PersonLeadSource | string
  status: PersonStatus
  assignedToId?: string
  assignedToName?: string
  clientId?: string
  clientName?: string
  address?: string
  tags?: string[]
  createdAt: string
  updatedAt: string
}

export interface CreatePersonRequest {
  firstName: string
  lastName?: string
  email?: string
  phone?: string
  whatsapp?: string
  birthDate?: string
  notes?: string
  leadSource?: string
  status?: PersonStatus
  assignedToId?: string
  clientId?: string
  address?: string
  tags?: string[]
}

export type UpdatePersonRequest = CreatePersonRequest
