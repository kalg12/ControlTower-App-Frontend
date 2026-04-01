import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService } from '@/services/auth.service'
import type { CurrentUser, LoginRequest } from '@/types/auth'

function readStoredUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem('user')
    return raw ? (JSON.parse(raw) as CurrentUser) : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  // Initialize synchronously so the router guard can read auth state
  // before App.vue mounts.
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  const user = ref<CurrentUser | null>(readStoredUser())
  const loading = ref(false)

  const isAuthenticated = computed(() => !!accessToken.value && !!user.value)

  function hasPermission(permission: string): boolean {
    return user.value?.permissions?.includes(permission) ?? false
  }

  function hasRole(role: string): boolean {
    return user.value?.roles?.includes(role) ?? false
  }

  async function login(req: LoginRequest) {
    loading.value = true
    try {
      const response = await authService.login(req)
      accessToken.value = response.accessToken
      user.value = response.user
      localStorage.setItem('accessToken', response.accessToken)
      localStorage.setItem('refreshToken', response.refreshToken)
      localStorage.setItem('user', JSON.stringify(response.user))
      return response
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await authService.logout()
    } catch {
      // ignore
    } finally {
      accessToken.value = null
      user.value = null
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    }
  }

  return {
    user,
    accessToken,
    loading,
    isAuthenticated,
    hasPermission,
    hasRole,
    login,
    logout
  }
})
