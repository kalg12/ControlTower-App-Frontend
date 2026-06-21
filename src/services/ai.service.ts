import api from '@/services/api'

export type AiTask = 'GENERATE_CARD_PROMPT' | 'IMPROVE_TICKET_REPLY' | 'QUICK_REPLY'

export type QuickReplyType =
  | 'STARTED_REVIEW'
  | 'WAITING_CLIENT'
  | 'CLOSE_TICKET'
  | 'NEED_INFO'
  | 'SCHEDULE_CALL'

export interface AiContext {
  cardTitle?: string
  cardDescription?: string
  cardChecklist?: string[]
  cardPriority?: string
  boardName?: string
  clientName?: string
  ticketSubject?: string
  ticketDescription?: string
  draftReply?: string
  quickReplyType?: QuickReplyType
}

export interface AiAssistRequest {
  task: AiTask
  context: AiContext
}

export const aiService = {
  async assist(request: AiAssistRequest): Promise<string> {
    const res = await api.post<{ data: { result: string } }>('/ai/assist', request)
    return res.data?.data?.result ?? ''
  }
}
