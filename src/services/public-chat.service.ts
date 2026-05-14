import axios from 'axios'
import type { ChatMessage, StartChatRequest, StartChatResponse, PublicConversationInfo } from '@/types/chat'
import type { PaginatedResponse } from '@/types/api'

const baseURL = `${(import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/api\/v1$/, '')}/api/v1`

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

  async getConversation(conversationId: string, visitorToken: string): Promise<PublicConversationInfo> {
    const res = await publicApi.get<{ data: PublicConversationInfo }>(
      `/public/chat/conversations/${conversationId}`,
      { params: { visitorToken } }
    )
    return res.data.data
  },

  async sendMessage(conversationId: string, visitorToken: string, content: string): Promise<ChatMessage> {
    const res = await publicApi.post<{ data: ChatMessage }>(
      `/public/chat/conversations/${conversationId}/messages`,
      { content },
      { params: { visitorToken } }
    )
    return res.data.data
  },

  async rateConversation(conversationId: string, visitorToken: string, rating: number, comment?: string): Promise<void> {
    await publicApi.post(`/public/chat/conversations/${conversationId}/rate`, {
      visitorToken,
      rating,
      comment: comment || null,
    })
  },
}
