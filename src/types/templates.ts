export interface ResponseTemplate {
  id: string
  tenantId: string
  authorId: string
  name: string
  body: string
  category?: string
  shortcut?: string
  createdAt: string
  updatedAt: string
}

export interface ResponseTemplateRequest {
  name: string
  body: string
  category?: string
  shortcut?: string
}

export interface ResponseTemplateFilters {
  q?: string
  category?: string
  page?: number
  size?: number
}
