import api from '@/services/api'
import type { KbArticle, KbArticleFilters, KbArticleRequest } from '@/types/knowledge-base'
import type { PaginatedResponse } from '@/types/api'

export const kbService = {
  async list(filters?: KbArticleFilters): Promise<PaginatedResponse<KbArticle>> {
    const res = await api.get<PaginatedResponse<KbArticle>>('/kb/articles', { params: filters })
    return res.data
  },

  async getById(id: string): Promise<KbArticle> {
    const res = await api.get<KbArticle>(`/kb/articles/${id}`)
    return res.data
  },

  async create(data: KbArticleRequest): Promise<KbArticle> {
    const res = await api.post<KbArticle>('/kb/articles', data)
    return res.data
  },

  async update(id: string, data: KbArticleRequest): Promise<KbArticle> {
    const res = await api.put<KbArticle>(`/kb/articles/${id}`, data)
    return res.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/kb/articles/${id}`)
  }
}
