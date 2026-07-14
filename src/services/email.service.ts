import api from '@/services/api'
import type { EmailStatus } from '@/types/email'

export const emailService = {
  async getStatus(): Promise<EmailStatus> {
    const res = await api.get<EmailStatus>('/email/status')
    return res.data
  },

  async sendTest(): Promise<void> {
    await api.post('/email/test-send')
  },
}
