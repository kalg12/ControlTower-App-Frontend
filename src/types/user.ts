export interface User {
  id: string
  tenantId: string
  email: string
  fullName: string
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  superAdmin?: boolean
  roles: string[]
  permissions: string[]
  createdAt: string
  // Legacy fields
  twoFactorEnabled?: boolean
}

/** Matches RoleResponse from backend */
export interface Role {
  id: string
  name: string
  code?: string
  description?: string
  permissions?: string[]
}

export interface CreateUserRequest {
  email: string
  fullName: string
  password: string
  roleIds: string[]
}

export interface UpdateUserRequest {
  fullName?: string
  status?: User['status']
  roleIds?: string[]
}

export interface UserFilters {
  search?: string
  status?: User['status']
  page?: number
  size?: number
}
