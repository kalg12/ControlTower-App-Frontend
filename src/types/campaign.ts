export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED' | 'CANCELED'
export type CampaignType = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP'

export interface Campaign {
  id: string
  name: string
  type: CampaignType
  status: CampaignStatus
  subject?: string
  body: string
  targetAudience?: string
  sentCount?: number
  openRate?: number
  scheduledAt?: string
  sentAt?: string
  createdAt: string
  updatedAt?: string
}
