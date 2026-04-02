import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '@/services/auth.service'
import type { CurrentUser, LoginRequest, LoginResponse } from '@/types/auth'

function readStoredUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem('user')
    return raw ? (JSON.parse(raw) as CurrentUser) : null
  } catch {
    return null
  }
}

function persistSession(response: LoginResponse) {
  if (!response.accessToken || !response.refreshToken) {
    throw new Error('Missing tokens in login response')
  }
  const currentUser: CurrentUser = {
    id: response.userId,
    email: response.email,
    fullName: response.fullName ?? response.email,
    tenantId: response.tenantId ?? ''
  }
  return { currentUser, accessToken: response.accessToken, refreshToken: response.refreshToken }
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  const user = ref<CurrentUser | null>(readStoredUser())
  const loading = ref(false)

  const isAuthenticated = computed(() => !!accessToken.value && !!user.value)

  async function login(req: LoginRequest) {
    loading.value = true
    try {
      const response = await authService.login(req)

      if (response.requiresMfa && response.mfaToken) {
        return response
      }

      const { currentUser, accessToken: at, refreshToken: rt } = persistSession(response)

      accessToken.value = at
      user.value = currentUser
      localStorage.setItem('accessToken', at)
      localStorage.setItem('refreshToken', rt)
      localStorage.setItem('user', JSON.stringify(currentUser))

      import('@/stores/notifications').then(({ useNotificationsStore }) => {
        useNotificationsStore().fetch()
      })

      return response
    } finally {
      loading.value = false
    }
  }

  async function completeMfaLogin(mfaToken: string, code: string) {
    loading.value = true
    try {
      const response = await authService.verify2faLogin(mfaToken, code)
      const { currentUser, accessToken: at, refreshToken: rt } = persistSession(response)

      accessToken.value = at
      user.value = currentUser
      localStorage.setItem('accessToken', at)
      localStorage.setItem('refreshToken', rt)
      localStorage.setItem('user', JSON.stringify(currentUser))

      import('@/stores/notifications').then(({ useNotificationsStore }) => {
        useNotificationsStore().fetch()
      })

      return response
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await authService.logout()
    } catch {
      /* ignore */
    } finally {
      accessToken.value = null
      user.value = null
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    }
  }

  return { user, accessToken, loading, isAuthenticated, login, completeMfaLogin, logout }
})
