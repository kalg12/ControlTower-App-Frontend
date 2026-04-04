import type { PaginatedResponse } from '@/types/api'

export type BoardVisibility = 'PRIVATE' | 'TEAM'
export type CardPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface ChecklistItem {
  id: string
  cardId?: string
  text: string
  completed: boolean
  position: number
  createdAt?: string
}

export interface KanbanCard {
  id: string
  columnId?: string
  title: string
  description?: string | null
  assigneeId?: string | null
  dueDate?: string | null
  priority: CardPriority
  position: number
  labels?: string[] | null
  checklist?: ChecklistItem[]
  createdAt?: string
  updatedAt?: string
}

export interface KanbanColumn {
  id: string
  boardId?: string
  name: string
  position: number
  wipLimit?: number | null
  cards?: KanbanCard[]
  createdAt?: string
}

export interface KanbanBoard {
  id: string
  tenantId?: string
  name: string
  description?: string | null
  visibility: BoardVisibility
  createdBy?: string | null
  columns?: KanbanColumn[]
  createdAt?: string
  updatedAt?: string
}

export interface BoardRequest {
  name: string
  description?: string
  visibility?: BoardVisibility
}

export interface CardRequest {
  columnId: string
  title: string
  description?: string
  assigneeId?: string
  dueDate?: string
  priority?: CardPriority
  position?: number
}

export interface MoveCardRequest {
  targetColumnId: string
  position: number
}

/** PATCH /boards/cards/{id} — column changes use moveCard */
export interface CardUpdateRequest {
  title: string
  description?: string
  assigneeId?: string | null
  dueDate?: string | null
  priority: CardPriority
}

export type BoardListResponse = PaginatedResponse<KanbanBoard>
