import api from '@/services/api'
import type { PaginatedResponse } from '@/types/api'
import type {
  ChatConversation, ChatMessage, ChatQuickReply,
  ConversationStatus, TransferRequest
} from '@/types/chat'

export const chatService = {
  // ── Conversations ──────────────────────────────────────────────────────────

  async listConversations(params?: {
    status?: ConversationStatus
    agentId?: string
    page?: number
    size?: number
  }): Promise<PaginatedResponse<ChatConversation>> {
    const res = await api.get<PaginatedResponse<ChatConversation>>('/chat/conversations', { params })
    return res.data
  },

  async getConversation(id: string): Promise<ChatConversation> {
    const res = await api.get<ChatConversation>(`/chat/conversations/${id}`)
    return res.data
  },

  async getMessages(id: string, params?: { page?: number; size?: number }): Promise<PaginatedResponse<ChatMessage>> {
    const res = await api.get<PaginatedResponse<ChatMessage>>(`/chat/conversations/${id}/messages`, { params })
    return res.data
  },

  async claim(id: string): Promise<ChatConversation> {
    const res = await api.post<ChatConversation>(`/chat/conversations/${id}/claim`)
    return res.data
  },

  async transfer(id: string, data: TransferRequest): Promise<ChatConversation> {
    const res = await api.post<ChatConversation>(`/chat/conversations/${id}/transfer`, data)
    return res.data
  },

  async close(id: string): Promise<ChatConversation> {
    const res = await api.post<ChatConversation>(`/chat/conversations/${id}/close`)
    return res.data
  },

  async archive(id: string): Promise<void> {
    await api.post(`/chat/conversations/${id}/archive`)
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/chat/conversations/${id}`)
  },

  async markRead(id: string): Promise<void> {
    await api.get(`/chat/conversations/${id}/messages`, { params: { page: 0, size: 1 } })
  },

  async countWaiting(): Promise<number> {
    const res = await api.get<{ count: number }>('/chat/unread-count')
    return res.data.count
  },

  async getQuickReplies(): Promise<ChatQuickReply[]> {
    const res = await api.get<ChatQuickReply[]>('/chat/quick-replies')
    return res.data
  },
}
