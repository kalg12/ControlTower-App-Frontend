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

api.interceptors.response.use(
  res => {
    // Unwrap the ApiResponse envelope { success, message, data, timestamp } automatically
    if (res.data && typeof res.data === 'object' && 'success' in res.data) {
      return { ...res, data: res.data.data }   // .data may be null for void endpoints — that's correct
    }
    return res
  },
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
