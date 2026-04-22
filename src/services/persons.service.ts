import api from './api'
import type { Person, CreatePersonRequest, UpdatePersonRequest } from '@/types/person'

interface PagedPersons {
  content: Person[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export const personsService = {
  async list(params?: { search?: string; page?: number; size?: number }): Promise<PagedPersons> {
    const res = await api.get<{ data: PagedPersons }>('/persons', { params })
    return res.data.data
  },

  async get(id: string): Promise<Person> {
    const res = await api.get<{ data: Person }>(`/persons/${id}`)
    return res.data.data
  },

  async create(body: CreatePersonRequest): Promise<Person> {
    const res = await api.post<{ data: Person }>('/persons', body)
    return res.data.data
  },

  async update(id: string, body: UpdatePersonRequest): Promise<Person> {
    const res = await api.put<{ data: Person }>(`/persons/${id}`, body)
    return res.data.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/persons/${id}`)
  },

  async listByClient(clientId: string): Promise<Person[]> {
    const res = await api.get<{ data: Person[] }>(`/persons/by-client/${clientId}`)
    return res.data.data
  }
}
