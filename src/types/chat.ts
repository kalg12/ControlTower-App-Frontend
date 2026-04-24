export type ConversationStatus = 'WAITING' | 'ACTIVE' | 'TRANSFERRED' | 'CLOSED' | 'ARCHIVED'
export type SenderType = 'VISITOR' | 'AGENT' | 'SYSTEM'

export interface ChatConversation {
  id: string
  tenantId: string
  visitorId: string
  visitorName: string
  visitorEmail?: string
  agentId?: string
  agentName?: string
  agentAvatarUrl?: string
  status: ConversationStatus
  source: string
  unreadCount: number
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
  closedAt?: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  senderType: SenderType
  senderId?: string
  senderName?: string
  senderAvatarUrl?: string
  content: string
  isRead: boolean
  createdAt: string
}

export interface ChatMessagePayload {
  type: 'MESSAGE' | 'TYPING' | 'SYSTEM' | 'STATUS_CHANGED' | 'JOINED'
  id?: string
  conversationId: string
  senderType?: SenderType
  senderId?: string
  senderName?: string
  senderAvatarUrl?: string
  content?: string
  isRead?: boolean
  createdAt: string
  conversationStatus?: ConversationStatus
}

export interface ChatQuickReply {
  id: string
  shortcut: string
  content: string
}

export interface StartChatRequest {
  tenantId: string
  visitorName: string
  visitorEmail?: string
  visitorId?: string
  source?: string
}

export interface StartChatResponse {
  conversationId: string
  visitorToken: string
}

export interface TransferRequest {
  toAgentId: string
  note?: string
}
