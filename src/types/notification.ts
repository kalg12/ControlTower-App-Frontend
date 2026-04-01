export interface Notification {
  id: string
  title: string
  message: string
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS'
  read: boolean
  createdAt: string
  link?: string
}

export interface NotificationFilters {
  read?: boolean
  type?: Notification['type']
  page?: number
  size?: number
}
