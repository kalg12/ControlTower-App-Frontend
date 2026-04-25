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
  assigneeIds?: string[]
  dueDate?: string | null
  priority: CardPriority
  position: number
  labels?: string[] | null
  checklist?: ChecklistItem[]
  estimatedMinutes?: number | null
  attendedBy?: string
  attendedAt?: string
  wasOverdue?: boolean
  createdAt?: string
  updatedAt?: string
}

export type KanbanColumnKind = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'HISTORY'

export interface KanbanColumn {
  id: string
  boardId?: string
  name: string
  /** Default workflow stage when set (cross-board filters). */
  columnKind?: KanbanColumnKind | null
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
  clientId?: string | null
  columns?: KanbanColumn[]
  createdAt?: string
  updatedAt?: string
}

export interface BoardRequest {
  name: string
  description?: string
  visibility?: BoardVisibility
  clientId?: string
}

export interface CardRequest {
  columnId: string
  title: string
  description?: string
  assigneeIds?: string[]
  dueDate?: string
  priority?: CardPriority
  position?: number
  estimatedMinutes?: number | null
}

export interface MoveCardRequest {
  targetColumnId: string
  position: number
}

/** PATCH /boards/cards/{id} — column changes use moveCard */
export interface CardUpdateRequest {
  title: string
  description?: string
  assigneeIds?: string[]
  dueDate?: string | null
  priority: CardPriority
  estimatedMinutes?: number | null
}

export type BoardListResponse = PaginatedResponse<KanbanBoard>

export interface KanbanWorkItem {
  id: string
  card: KanbanCard
  boardId: string
  boardName: string
  columnId: string
  columnName: string
  columnKind?: string | null
  tenantId?: string
  tenantName?: string
  assigneeNames: string[]
  checklistProgress?: string
  overdue: boolean
  // For work hub filtering
  cardId?: string
}

export interface SupervisorFilters {
  tenantId?: string
  boardId?: string
  assigneeId?: string
  columnKind?: KanbanColumnKind
  priority?: CardPriority
  dueDateFrom?: string
  dueDateTo?: string
  label?: string
}
