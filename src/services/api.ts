import axios, { type AxiosInstance, type AxiosError } from 'axios'

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

// Track if a 401 redirect is already in flight to avoid duplicate redirects
let redirecting = false

api.interceptors.response.use(
  res => {
    // Unwrap the ApiResponse envelope { success, message, data, timestamp } automatically
    if (res.data && typeof res.data === 'object' && 'success' in res.data) {
      return { ...res, data: res.data.data }   // .data may be null for void endpoints — correct
    }
    return res
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401 && !redirecting) {
      redirecting = true
      // Clear auth data without a hard page reload
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      // Use Vue Router to navigate — no full page reload, no flash of blank
      const { default: router } = await import('@/router')
      if (router.currentRoute.value.name !== 'login') {
        await router.push({ name: 'login' })
      }
      // Allow future 401s to redirect again (e.g. after re-login)
      setTimeout(() => { redirecting = false }, 2000)
    }
    return Promise.reject(error)
  }
)

export default api
