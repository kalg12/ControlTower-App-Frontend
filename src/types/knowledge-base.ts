export type KbStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export interface KbArticle {
  id: string
  tenantId: string
  authorId?: string
  title: string
  content?: string
  category?: string
  tags: string[]
  status: KbStatus
  views: number
  createdAt: string
  updatedAt: string
}

export interface KbArticleRequest {
  title: string
  content?: string
  category?: string
  tags?: string[]
  status?: KbStatus
}

export interface KbArticleFilters {
  q?: string
  status?: KbStatus
  category?: string
  page?: number
  size?: number
}
