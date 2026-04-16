export interface CsatSurvey {
  id: string
  tenantId: string
  ticketId: string
  token: string
  rating?: number | null
  comment?: string | null
  sentAt: string
  respondedAt?: string | null
  createdAt: string
}

export interface CsatSubmitRequest {
  rating: number
  comment?: string
}
