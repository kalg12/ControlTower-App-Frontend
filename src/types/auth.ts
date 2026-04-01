export interface LoginRequest {
  email: string
  password: string
  totpCode?: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  user: CurrentUser
}

export interface CurrentUser {
  id: string
  email: string
  fullName: string
  roles: string[]
  permissions: string[]
  tenantId: string
  tenantSlug: string
  twoFactorEnabled?: boolean
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  newPassword: string
}
