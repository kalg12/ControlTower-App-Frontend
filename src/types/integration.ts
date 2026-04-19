export type IntegrationEndpointType = 'POS' | 'CUSTOM'
export type WebhookDeliveryStatus = 'PENDING' | 'DELIVERED' | 'FAILED'

export interface Integration {
  id: string
  tenantId: string
  clientBranchId?: string
  clientId?: string
  clientName?: string
  branchName?: string
  name?: string
  type: IntegrationEndpointType
  pullUrl?: string
  heartbeatIntervalSeconds: number
  contractVersion?: string
  active: boolean
  createdAt: string
  updatedAt?: string
}

export interface IntegrationEvent {
  id: string
  eventType: string
  receivedAt: string
  processedAt?: string
  payload?: Record<string, unknown>
}

export interface WebhookDelivery {
  id: string
  url: string
  status: WebhookDeliveryStatus
  attempts: number
  lastAttemptAt?: string
  responseStatus?: number
  createdAt: string
}

export interface CreateIntegrationRequest {
  clientBranchId?: string
  name?: string
  type: IntegrationEndpointType
  pullUrl?: string
  apiKey?: string
  heartbeatIntervalSeconds?: number
  contractVersion?: string
}

export interface UpdateIntegrationRequest {
  name?: string
  pullUrl?: string
  apiKey?: string
  heartbeatIntervalSeconds?: number
  contractVersion?: string
  clientBranchId?: string
  metadata?: Record<string, unknown>
}
