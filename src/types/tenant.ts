export interface Tenant {
  id: string
  name: string
  slug: string
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'
  country: string
  timezone: string
  currency: string
  createdAt: string
}
