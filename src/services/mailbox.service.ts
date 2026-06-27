import api from '@/services/api'
import type { MailboxConfig, MailboxRequest } from '@/types/mailbox'

export const mailboxService = {
  async list(): Promise<MailboxConfig[]> {
    const res = await api.get<{ data: MailboxConfig[] }>('/email/mailboxes')
    return res.data.data
  },

  async create(req: MailboxRequest): Promise<MailboxConfig> {
    const res = await api.post<{ data: MailboxConfig }>('/email/mailboxes', req)
    return res.data.data
  },

  async update(id: string, req: MailboxRequest): Promise<MailboxConfig> {
    const res = await api.put<{ data: MailboxConfig }>(`/email/mailboxes/${id}`, req)
    return res.data.data
  },

  async deactivate(id: string): Promise<void> {
    await api.delete(`/email/mailboxes/${id}`)
  },

  async testConnection(id: string): Promise<string> {
    const res = await api.post<{ message: string }>(`/email/mailboxes/${id}/test-connection`)
    return res.data.message
  },

  async testSend(mailboxId: string, to: string): Promise<void> {
    await api.post('/email/mailboxes/test-send', {
      mailboxId,
      to,
      subject: 'Test desde Control Tower',
      bodyHtml: '<p>Este es un correo de prueba desde Control Tower.</p>',
    })
  },
}
