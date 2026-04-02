import api from '@/services/api'
import type { User, Role, CreateUserRequest } from '@/types/user'
import type { PaginatedResponse } from '@/types/api'

/** Aligned with GET /api/v1/users?tenantId&page&size */
export const usersService = {
  async list(params: { tenantId: string; page?: number; size?: number }): Promise<PaginatedResponse<User>> {
    const res = await api.get<PaginatedResponse<User>>('/users', {
      params: {
        tenantId: params.tenantId,
        page: params.page ?? 0,
        size: params.size ?? 20
      }
    })
    return res.data
  },

  async getById(id: string): Promise<User> {
    const res = await api.get<User>(`/users/${id}`)
    return res.data
  },

  /** POST /api/v1/users?tenantId= */
  async create(tenantId: string, data: CreateUserRequest): Promise<User> {
    const body = {
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      roleIds: data.roleIds?.length ? data.roleIds : undefined
    }
    const res = await api.post<User>('/users', body, { params: { tenantId } })
    return res.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/users/${id}`)
  }
}

/** Roles & permissions — GET /api/v1/roles (paginated), GET /api/v1/permissions */
export const rolesService = {
  async listRoles(page = 0, size = 50): Promise<PaginatedResponse<Role>> {
    const res = await api.get<PaginatedResponse<Role>>('/roles', { params: { page, size } })
    return res.data
  },

  async listPermissions(): Promise<{ id: string; code: string; description?: string }[]> {
    const res = await api.get<{ id: string; code: string; description?: string }[]>('/permissions')
    return res.data
  },

  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    await api.post(`/users/${userId}/roles/${roleId}`)
  },

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await api.delete(`/users/${userId}/roles/${roleId}`)
  }
}
