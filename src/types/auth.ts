export interface LoginRequest {
  email: string
  password: string
  totpCode?: string
}

// Matches exactly what the backend returns from /auth/login (after unwrap)
export interface LoginResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  userId: string
  tenantId: string
  email: string
  fullName: string
  requiresMfa: boolean
  mfaToken?: string
}

// What we store in the Pinia store
export interface CurrentUser {
  id: string
  email: string
  fullName: string
  tenantId: string
}

export interface ForgotPasswordRequest { email: string }
export interface ResetPasswordRequest { token: string; newPassword: string }
