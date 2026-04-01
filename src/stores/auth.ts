import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '@/services/auth.service'
import type { CurrentUser, LoginRequest } from '@/types/auth'

function readStoredUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) as CurrentUser : null
  } catch { return null }
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

      // Build CurrentUser from flat login response
      const currentUser: CurrentUser = {
        id: response.userId,
        email: response.email,
        fullName: response.fullName,
        tenantId: response.tenantId
      }

      accessToken.value = response.accessToken
      user.value = currentUser
      localStorage.setItem('accessToken', response.accessToken)
      localStorage.setItem('refreshToken', response.refreshToken)
      localStorage.setItem('user', JSON.stringify(currentUser))
      return response
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try { await authService.logout() } catch { /* ignore */ } finally {
      accessToken.value = null
      user.value = null
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    }
  }

  return { user, accessToken, loading, isAuthenticated, login, logout }
})
