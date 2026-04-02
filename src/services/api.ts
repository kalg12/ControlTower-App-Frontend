import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { toast } from 'vue3-toastify'
import { i18n } from '@/i18n'

const tt = (key: string) => i18n.global.t(key)

const api: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Singleton refresh state — only one refresh call in flight at a time
let isRefreshing = false
let refreshPromise: Promise<string> | null = null

// Clears all auth state and redirects to login with a user-visible message
async function doLogout() {
  isRefreshing = false
  refreshPromise = null

  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')

  try {
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()
    authStore.accessToken = null
    authStore.user = null
  } catch { /* ignore if store unavailable */ }

  toast.warning(tt('errors.sessionExpired'))

  const { default: router } = await import('@/router')
  if (router.currentRoute.value.name !== 'login') {
    await router.push({ name: 'login' })
  }
}

api.interceptors.response.use(
  res => {
    // Unwrap the ApiResponse envelope { success, message, data, timestamp } automatically
    if (res.data && typeof res.data === 'object' && 'success' in res.data) {
      return { ...res, data: res.data.data }
    }
    return res
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // ── 401 handler: attempt silent token refresh, then retry ──────────────
    if (error.response?.status === 401) {
      // If the failing call IS the refresh endpoint, go straight to logout
      if (originalRequest?.url?.includes('/auth/refresh')) {
        await doLogout()
        return Promise.reject(error)
      }

      // Prevent infinite retry on the same request
      if (originalRequest._retry) {
        await doLogout()
        return Promise.reject(error)
      }
      originalRequest._retry = true

      const storedRefreshToken = localStorage.getItem('refreshToken')
      if (!storedRefreshToken) {
        await doLogout()
        return Promise.reject(error)
      }

      // Coalesce concurrent 401s into a single refresh call
      if (!isRefreshing) {
        isRefreshing = true
        const { authService } = await import('@/services/auth.service')
        refreshPromise = authService.refreshToken(storedRefreshToken)
          .then(tokens => {
            localStorage.setItem('accessToken', tokens.accessToken)
            localStorage.setItem('refreshToken', tokens.refreshToken)
            // Update Pinia store so isAuthenticated stays true
            import('@/stores/auth').then(({ useAuthStore }) => {
              useAuthStore().accessToken = tokens.accessToken
            })
            return tokens.accessToken
          })
          .catch(async () => {
            await doLogout()
            return Promise.reject(error)
          })
          .finally(() => {
            isRefreshing = false
            refreshPromise = null
          })
      }

      // Wait for the in-flight refresh, then replay the original request
      try {
        const newToken = await refreshPromise!
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch {
        return Promise.reject(error)
      }
    }

    // ── Other HTTP errors ──────────────────────────────────────────────────
    // Only show toasts for mutations — page error states handle read failures
    const method = (error.config?.method ?? 'get').toLowerCase()
    const isMutation = method !== 'get'

    if (error.response?.status === 403) {
      if (isMutation) toast.warning(tt('errors.forbidden'))
    } else if (error.response?.status === 500 || error.response?.status === 503) {
      if (isMutation) toast.error(tt('errors.server'))
    } else if (error.code === 'ECONNABORTED') {
      toast.error(tt('errors.timeout'))
    }

    return Promise.reject(error)
  }
)

export default api
