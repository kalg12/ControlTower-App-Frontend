import api from '@/services/api'

export type AiTask = 'GENERATE_CARD_PROMPT' | 'IMPROVE_TICKET_REPLY' | 'QUICK_REPLY' | 'GENERATE_KB_CONTENT'

export type QuickReplyType =
  | 'STARTED_REVIEW'
  | 'WAITING_CLIENT'
  | 'CLOSE_TICKET'
  | 'NEED_INFO'
  | 'SCHEDULE_CALL'

export interface AiContext {
  // Kanban
  cardTitle?: string
  cardDescription?: string
  cardChecklist?: string[]
  cardPriority?: string
  boardName?: string
  clientName?: string
  devNotes?: string[]
  // Ticket
  ticketSubject?: string
  ticketDescription?: string
  ticketStatus?: string
  ticketPriority?: string
  ticketSource?: string
  draftReply?: string
  previousReplies?: string[]
  requesterEmail?: string
  quickReplyType?: QuickReplyType
  // Knowledge base
  kbArticles?: string[]
}

export interface AiAssistRequest {
  task: AiTask
  context: AiContext
}

export const aiService = {
  async assist(request: AiAssistRequest): Promise<string> {
    // timeout de 60s porque las llamadas a OpenAI pueden tardar 20-30s
    const res = await api.post<{ result: string }>('/ai/assist', request, { timeout: 60_000 })
    // el interceptor de api.ts ya desenvuelve el ApiResponse envelope → res.data es el campo "data" directamente
    return res.data?.result ?? ''
  }
}
