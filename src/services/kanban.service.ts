import api from '@/services/api'
import type {
  BoardListResponse,
  BoardRequest,
  CardRequest,
  CardUpdateRequest,
  KanbanBoard,
  KanbanCard,
  KanbanColumn,
  KanbanColumnKind,
  KanbanWorkItem,
  SupervisorFilters,
  ChecklistItem,
  MoveCardRequest
} from '@/types/kanban'

export const kanbanService = {
  async listBoards(page = 0, size = 20): Promise<BoardListResponse> {
    const res = await api.get<BoardListResponse>('/boards', { params: { page, size } })
    return res.data
  },

  async listWorkItems(params?: {
    assigneeId?: string
    columnKind?: KanbanColumnKind | ''
  }): Promise<KanbanWorkItem[]> {
    const res = await api.get<KanbanWorkItem[]>('/kanban/work-items', {
      params: {
        assigneeId: params?.assigneeId || undefined,
        columnKind: params?.columnKind || undefined
      }
    })
    return res.data
  },

  async listSupervisorItems(params?: SupervisorFilters): Promise<KanbanWorkItem[]> {
    const res = await api.get<KanbanWorkItem[]>('/kanban/supervisor-items', {
      params: {
        tenantId: params?.tenantId || undefined,
        boardId: params?.boardId || undefined,
        assigneeId: params?.assigneeId || undefined,
        columnKind: params?.columnKind || undefined,
        priority: params?.priority || undefined,
        dueDateFrom: params?.dueDateFrom || undefined,
        dueDateTo: params?.dueDateTo || undefined,
        label: params?.label || undefined
      }
    })
    return res.data
  },

  async getBoard(id: string): Promise<KanbanBoard> {
    const res = await api.get<KanbanBoard>(`/boards/${id}`)
    return res.data
  },

  async createBoard(body: BoardRequest): Promise<KanbanBoard> {
    const res = await api.post<KanbanBoard>('/boards', body)
    return res.data
  },

  async updateBoard(id: string, body: BoardRequest): Promise<KanbanBoard> {
    const res = await api.put<KanbanBoard>(`/boards/${id}`, body)
    return res.data
  },

  async deleteBoard(id: string): Promise<void> {
    await api.delete(`/boards/${id}`)
  },

  async addColumn(boardId: string, name: string, position: number): Promise<KanbanColumn> {
    const res = await api.post<KanbanColumn>(`/boards/${boardId}/columns`, null, {
      params: { name, position }
    })
    return res.data
  },

  async deleteColumn(columnId: string): Promise<void> {
    await api.delete(`/boards/columns/${columnId}`)
  },

  async createCard(body: CardRequest): Promise<KanbanCard> {
    const res = await api.post<KanbanCard>('/boards/cards', body)
    return res.data
  },

  async moveCard(cardId: string, body: MoveCardRequest): Promise<KanbanCard> {
    const res = await api.patch<KanbanCard>(`/boards/cards/${cardId}/move`, body)
    return res.data
  },

  async moveCardToColumn(cardId: string, body: { columnKind: string }): Promise<KanbanWorkItem> {
    const res = await api.patch<KanbanWorkItem>(`/kanban/cards/${cardId}/move-to`, body)
    return res.data
  },

  async updateCard(cardId: string, body: CardUpdateRequest): Promise<KanbanCard> {
    const res = await api.patch<KanbanCard>(`/boards/cards/${cardId}`, body)
    return res.data
  },

  async attendCard(cardId: string): Promise<KanbanCard> {
    const res = await api.patch<KanbanCard>(`/boards/cards/${cardId}/attend`)
    return res.data
  },

  async deleteCard(cardId: string): Promise<void> {
    await api.delete(`/boards/cards/${cardId}`)
  },

  async addChecklistItem(cardId: string, text: string): Promise<ChecklistItem> {
    const res = await api.post<ChecklistItem>(`/boards/cards/${cardId}/checklist`, null, {
      params: { text }
    })
    return res.data
  },

  async toggleChecklistItem(itemId: string): Promise<ChecklistItem> {
    const res = await api.patch<ChecklistItem>(`/boards/checklist/${itemId}/toggle`)
    return res.data
  }
}
