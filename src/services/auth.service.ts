import axios from 'axios'
import api from '@/services/api'
import type { LoginRequest, LoginResponse, ForgotPasswordRequest, ResetPasswordRequest } from '@/types/auth'

// Bare axios instance with NO interceptors — used exclusively for token refresh
// to avoid the infinite-loop where the interceptor catches the refresh 401
const plainAxios = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' }
})

function parseTotpCode(s: string): number {
  const n = parseInt(s.replace(/\s/g, ''), 10)
  if (Number.isNaN(n)) throw new Error('Invalid code')
  return n
}

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>('/auth/login', {
      email: data.email,
      password: data.password
    })
    return res.data
  },

  /** Completes login when `requiresMfa` was true on the first response. */
  async verify2faLogin(mfaToken: string, code: string): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>('/auth/2fa/verify', {
      mfaToken,
      code: parseTotpCode(code)
    })
    return res.data
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) return
    try {
      await api.post('/auth/logout', { refreshToken })
    } catch {
      // ignore errors on logout
    }
  },

  async forgotPassword(data: ForgotPasswordRequest): Promise<void> {
    await api.post('/auth/forgot-password', data)
  },

  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    await api.post('/auth/reset-password', data)
  },

  // Uses plainAxios (no interceptors) to avoid the 401 retry loop
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const res = await plainAxios.post('/auth/refresh', { refreshToken })
    const body = res.data
    return body && typeof body === 'object' && 'data' in body ? body.data : body
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', { currentPassword, newPassword })
  },

  async setup2FA(): Promise<{ secret: string; qrUrl: string }> {
    const res = await api.post<{ secret: string; qrUrl: string }>('/auth/2fa/setup')
    return res.data
  },

  /** Backend expects `{ "code": number }` (TotpCodeRequest). */
  async enable2FA(totpCode: string): Promise<void> {
    await api.post('/auth/2fa/enable', { code: parseTotpCode(totpCode) })
  },

  async disable2FA(totpCode: string): Promise<void> {
    await api.post('/auth/2fa/disable', { code: parseTotpCode(totpCode) })
  }
}
