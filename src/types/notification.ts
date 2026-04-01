export interface Notification {
  id: string
  type: string
  title: string
  body: string        // backend uses 'body' not 'message'
  severity: string
  metadata?: Record<string, string>
  read: boolean
  readAt?: string
  createdAt: string
}

export interface NotificationFilters {
  read?: boolean
  type?: string
  page?: number
  size?: number
}
