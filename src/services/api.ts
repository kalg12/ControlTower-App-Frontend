import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { toast } from 'vue3-toastify'
import { i18n } from '@/i18n'
import { getJwtExpMs } from '@/utils/jwt'

const tt = (key: string) => i18n.global.t(key)

/** Dev: Vite proxies `/api` → backend. Production: set VITE_API_BASE_URL (e.g. https://api.example.com). */
const apiRoot =
  import.meta.env.VITE_API_BASE_URL != null && String(import.meta.env.VITE_API_BASE_URL).trim() !== ''
    ? `${String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '')}/api/v1`
    : '/api/v1'

const api: AxiosInstance = axios.create({
  baseURL: apiRoot,
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

let proactiveInterval: ReturnType<typeof setInterval> | null = null

function notifyWsReconnect() {
  void import('@/composables/useWebSocket')
    .then(m => m.reconnectWebSocket?.())
    .catch(() => { /* optional WS */ })
}

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

function requestHadBearer(originalRequest: InternalAxiosRequestConfig): boolean {
  const h = originalRequest.headers?.Authorization
  return typeof h === 'string' && h.startsWith('Bearer ')
}

/** Coalesced refresh; updates storage + Pinia; reconnects WebSocket. */
async function refreshAccessToken(staleError: AxiosError): Promise<string> {
  if (refreshPromise) return refreshPromise

  const storedRefreshToken = localStorage.getItem('refreshToken')
  if (!storedRefreshToken) {
    await doLogout()
    throw staleError
  }

  isRefreshing = true
  refreshPromise = (async () => {
    const { authService } = await import('@/services/auth.service')
    const tokens = await authService.refreshToken(storedRefreshToken)
    localStorage.setItem('accessToken', tokens.accessToken)
    localStorage.setItem('refreshToken', tokens.refreshToken)
    import('@/stores/auth').then(({ useAuthStore }) => {
      useAuthStore().accessToken = tokens.accessToken
    })
    notifyWsReconnect()
    return tokens.accessToken
  })()
    .catch(async () => {
      await doLogout()
      throw staleError
    })
    .finally(() => {
      isRefreshing = false
      refreshPromise = null
    })

  return refreshPromise
}

async function retryWithFreshToken(
  originalRequest: InternalAxiosRequestConfig & { _retry?: boolean },
  staleError: AxiosError
): Promise<unknown> {
  if (originalRequest._retry) throw staleError
  originalRequest._retry = true

  const newToken = await refreshAccessToken(staleError)
  originalRequest.headers = originalRequest.headers ?? {}
  originalRequest.headers.Authorization = `Bearer ${newToken}`
  return api(originalRequest)
}

/** Refresh ~5 minutes before access token expiry (coalesced with interceptor refresh). */
export function startProactiveTokenRefresh() {
  if (proactiveInterval) clearInterval(proactiveInterval)
  const leadMs = 5 * 60 * 1000
  const tickMs = 60_000

  proactiveInterval = setInterval(() => {
    const access = localStorage.getItem('accessToken')
    const rt = localStorage.getItem('refreshToken')
    if (!access || !rt) return
    const exp = getJwtExpMs(access)
    if (!exp) return
    const now = Date.now()
    // Skip if expiry is still more than 5 minutes away (includes already-expired access tokens)
    if (exp - now > leadMs) return
    if (isRefreshing || refreshPromise) return

    const fakeErr = new Error('proactive refresh') as unknown as AxiosError
    void refreshAccessToken(fakeErr).catch(() => { /* doLogout already ran */ })
  }, tickMs)
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

    const status = error.response?.status

    // ── 401 only: token expired → refresh + retry once ────────────────────
    // 403 is a permission error — refreshing the token will never fix it.
    if (status === 401) {
      if (originalRequest?.url?.includes('/auth/refresh')) {
        await doLogout()
        return Promise.reject(error)
      }

      if (originalRequest._retry) {
        await doLogout()
        return Promise.reject(error)
      }

      try {
        return await retryWithFreshToken(originalRequest, error)
      } catch {
        return Promise.reject(error)
      }
    }

    // ── Other HTTP errors ──────────────────────────────────────────────────
    if (status === 403) {
      // Always show forbidden toast — both reads and mutations need feedback
      toast.warning(tt('errors.forbidden'))
    } else if (status === 500 || status === 503) {
      toast.error(tt('errors.server'))
    } else if (error.code === 'ECONNABORTED') {
      toast.error(tt('errors.timeout'))
    }

    return Promise.reject(error)
  }
)

export default api
