import api from '@/services/api'

export interface TicketAttachment {
  id: string
  ticketId: string
  fileName?: string
  contentType?: string
  sizeBytes?: number
  uploadedBy?: string
}

export const ticketAttachmentsService = {
  async list(ticketId: string): Promise<TicketAttachment[]> {
    const res = await api.get<TicketAttachment[]>(`/tickets/${ticketId}/attachments`)
    return res.data
  },

  async upload(ticketId: string, file: File): Promise<TicketAttachment> {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post<TicketAttachment>(`/tickets/${ticketId}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return res.data
  },

  downloadUrl(attachmentId: string): string {
    return `/api/v1/attachments/${attachmentId}`
  },

  async delete(attachmentId: string): Promise<void> {
    await api.delete(`/attachments/${attachmentId}`)
  }
}
