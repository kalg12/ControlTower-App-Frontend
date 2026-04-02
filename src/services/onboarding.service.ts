import api from '@/services/api'

export interface OnboardingRequest {
  tenantName: string
  tenantSlug: string
  adminEmail: string
  adminPassword: string
  adminFullName: string
}

export interface OnboardingResponse {
  tenantId: string
  userId: string
  message?: string
}

/** POST /api/v1/tenants/onboard — public */
export const onboardingService = {
  async onboard(body: OnboardingRequest): Promise<OnboardingResponse> {
    const res = await api.post<OnboardingResponse>('/tenants/onboard', body)
    return res.data
  }
}
