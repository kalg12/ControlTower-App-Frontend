export type IntegrationStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'PENDING'

export interface Integration {
  id: string
  tenantId: string
  name: string
  type: string
  status: IntegrationStatus
  webhookUrl?: string
  lastTriggeredAt?: string
  eventsDelivered?: number
  eventsFailed?: number
  createdAt: string
}

export interface CreateIntegrationRequest {
  name: string
  type: string
  webhookUrl: string
  secret?: string
}
