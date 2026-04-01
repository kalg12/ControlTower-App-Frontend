export interface ApiResponse<T> {
  data: T
  message?: string
  timestamp?: string
}

export interface PaginatedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  page: number      // backend field name
  number?: number   // some Spring versions use 'number' for current page
  size: number
  first?: boolean
  last?: boolean
}

export interface ApiError {
  status: number
  error: string
  message: string
  path: string
  timestamp: string
}
