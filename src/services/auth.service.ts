import axios from 'axios'
import api from '@/services/api'
import type { LoginRequest, LoginResponse, ForgotPasswordRequest, ResetPasswordRequest } from '@/types/auth'

// Bare axios instance with NO interceptors — used exclusively for token refresh
// to avoid the infinite-loop where the interceptor catches the refresh 401
const plainAxios = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' }
})

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>('/auth/login', data)
    return res.data
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout')
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

  // Uses plainAxios (no interceptors) to avoid triggering the 401 retry loop
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const res = await plainAxios.post('/auth/refresh', { refreshToken })
    // Unwrap ApiResponse envelope if present
    const body = res.data
    return (body && typeof body === 'object' && 'data' in body) ? body.data : body
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', { currentPassword, newPassword })
  },

  async enableTotp(): Promise<{ qrCode: string; secret: string }> {
    const res = await api.post('/auth/totp/enable')
    return res.data
  },

  async disableTotp(totpCode: string): Promise<void> {
    await api.post('/auth/totp/disable', { totpCode })
  },

  async verifyTotp(totpCode: string): Promise<void> {
    await api.post('/auth/totp/verify', { totpCode })
  },

  async setup2FA(): Promise<{ secret: string; qrUrl: string }> {
    const res = await api.post<{ secret: string; qrUrl: string }>('/auth/2fa/setup')
    return res.data
  },

  async enable2FA(totpCode: string): Promise<void> {
    await api.post('/auth/2fa/enable', { totpCode })
  },

  async disable2FA(totpCode: string): Promise<void> {
    await api.post('/auth/2fa/disable', { totpCode })
  }
}
