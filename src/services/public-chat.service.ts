import axios from 'axios'
import type { ChatMessage, StartChatRequest, StartChatResponse } from '@/types/chat'
import type { PaginatedResponse } from '@/types/api'

const baseURL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1')

const publicApi = axios.create({ baseURL })

export const publicChatService = {
  async startChat(req: StartChatRequest): Promise<StartChatResponse> {
    const res = await publicApi.post<{ data: StartChatResponse }>('/public/chat/start', req)
    return res.data.data
  },

  async getMessages(conversationId: string, visitorToken: string, page = 0): Promise<PaginatedResponse<ChatMessage>> {
    const res = await publicApi.get<{ data: PaginatedResponse<ChatMessage> }>(
      `/public/chat/conversations/${conversationId}/messages`,
      { params: { visitorToken, page, size: 50 } }
    )
    return res.data.data
  },
}
