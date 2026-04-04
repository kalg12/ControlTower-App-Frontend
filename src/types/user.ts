export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION'

export interface User {
  id: string
  tenantId: string
  email: string
  fullName: string
  status: UserStatus
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
  email?: string
  status?: UserStatus
  /** Replace all roles; omit to leave unchanged (backend); send [] to clear */
  roleIds?: string[]
  password?: string
}

export interface UserFilters {
  search?: string
  status?: UserStatus
  page?: number
  size?: number
}
