import api from '@/services/api'
import type { BillingOverview, Invoice, Subscription } from '@/types/billing'
import type { PaginatedResponse } from '@/types/api'

export const billingService = {
  async getOverview(): Promise<BillingOverview> {
    const res = await api.get<BillingOverview>('/billing/overview')
    return res.data
  },

  async listInvoices(page = 0, size = 20): Promise<PaginatedResponse<Invoice>> {
    const res = await api.get<PaginatedResponse<Invoice>>('/billing/invoices', { params: { page, size } })
    return res.data
  },

  async getSubscription(): Promise<Subscription> {
    const res = await api.get<Subscription>('/billing/subscription')
    return res.data
  },

  async createPortalSession(): Promise<{ url: string }> {
    const res = await api.post<{ url: string }>('/billing/portal')
    return res.data
  }
}
