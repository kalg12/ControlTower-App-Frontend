import api from '@/services/api'
import type { BillingEvent } from '@/types/billing'
import type { PaginatedResponse } from '@/types/api'

export const billingService = {
  async listEvents(page = 0, size = 20): Promise<PaginatedResponse<BillingEvent>> {
    const res = await api.get<PaginatedResponse<BillingEvent>>('/billing/events', { params: { page, size } })
    return res.data
  }
}
