import api from '@/services/api'
import type { PaginatedResponse } from '@/types/api'

export interface Note {
  id: string
  title?: string
  body?: string
  content?: string
  linkedTo?: string
  linkedId?: string
  authorId?: string
  createdAt?: string
  updatedAt?: string
}

export interface NoteRequest {
  title?: string
  body?: string
  linkedTo?: string
  linkedId?: string
}

export const notesService = {
  async list(params?: {
    linkedTo?: string
    linkedId?: string
    page?: number
    size?: number
  }): Promise<PaginatedResponse<Note>> {
    const res = await api.get<PaginatedResponse<Note>>('/notes', { params })
    return res.data
  },

  async getById(id: string): Promise<Note> {
    const res = await api.get<Note>(`/notes/${id}`)
    return res.data
  },

  async create(body: NoteRequest): Promise<Note> {
    const res = await api.post<Note>('/notes', body)
    return res.data
  },

  async update(id: string, body: NoteRequest): Promise<Note> {
    const res = await api.put<Note>(`/notes/${id}`, body)
    return res.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/notes/${id}`)
  }
}
