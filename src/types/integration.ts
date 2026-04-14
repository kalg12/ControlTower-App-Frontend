export type IntegrationEndpointType = 'POS' | 'CUSTOM'

export interface Integration {
  id: string
  tenantId: string
  clientBranchId?: string
  type: IntegrationEndpointType
  pullUrl?: string
  heartbeatIntervalSeconds: number
  contractVersion?: string
  active: boolean
  createdAt: string
}

export interface CreateIntegrationRequest {
  clientBranchId?: string
  type: IntegrationEndpointType
  pullUrl?: string
  apiKey?: string
  heartbeatIntervalSeconds?: number
  contractVersion?: string
}

export interface UpdateIntegrationRequest {
  pullUrl?: string
  apiKey?: string
  heartbeatIntervalSeconds?: number
  contractVersion?: string
  clientBranchId?: string
  metadata?: Record<string, unknown>
}
