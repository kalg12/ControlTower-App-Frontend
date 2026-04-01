export interface ApiResponse<T> {
  data: T
  message?: string
  timestamp?: string
}

export interface PaginatedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface ApiError {
  status: number
  error: string
  message: string
  path: string
  timestamp: string
}
