export interface User {
  id: string
  email: string
  fullName: string
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  twoFactorEnabled: boolean
  tenantId: string
  roles: Role[]
  createdAt: string
}

export interface Role {
  id: string
  name: string
  permissions: string[]
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
