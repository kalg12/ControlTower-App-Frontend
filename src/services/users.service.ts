import api from '@/services/api'
import type { User, Role, CreateUserRequest, UpdateUserRequest, UserFilters } from '@/types/user'
import type { PaginatedResponse } from '@/types/api'

export const usersService = {
  async list(filters?: UserFilters): Promise<PaginatedResponse<User>> {
    const res = await api.get<PaginatedResponse<User>>('/users', { params: filters })
    return res.data
  },

  async getById(id: string): Promise<User> {
    const res = await api.get<User>(`/users/${id}`)
    return res.data
  },

  async create(data: CreateUserRequest): Promise<User> {
    const res = await api.post<User>('/users', data)
    return res.data
  },

  async update(id: string, data: UpdateUserRequest): Promise<User> {
    const res = await api.patch<User>(`/users/${id}`, data)
    return res.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/users/${id}`)
  },

  async assignRoles(id: string, roleIds: string[]): Promise<User> {
    const res = await api.post<User>(`/users/${id}/roles`, { roleIds })
    return res.data
  },

  async getRoles(): Promise<Role[]> {
    const res = await api.get<Role[]>('/roles')
    return res.data
  },

  async getMe(): Promise<User> {
    const res = await api.get<User>('/users/me')
    return res.data
  },

  async updateMe(data: { fullName?: string; email?: string }): Promise<User> {
    const res = await api.patch<User>('/users/me', data)
    return res.data
  }
}
