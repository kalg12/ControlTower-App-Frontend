import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { kanbanService } from '@/services/kanban.service'
import type { BoardRequest, CardRequest, CardUpdateRequest, MoveCardRequest } from '@/types/kanban'
import { qk } from '@/queries/keys'

export function useBoardsList(page: MaybeRefOrGetter<number> = 0, size: MaybeRefOrGetter<number> = 20) {
  return useQuery({
    queryKey: computed(() => [...qk.boards(), toValue(page), toValue(size)] as const),
    queryFn: () => kanbanService.listBoards(toValue(page), toValue(size)),
    staleTime: 30_000
  })
}

export function useBoard(id: MaybeRefOrGetter<string | undefined>) {
  return useQuery({
    queryKey: computed(() => {
      const bid = toValue(id)
      return bid ? qk.board(bid) : ['kanban', 'board', 'none']
    }),
    queryFn: () => kanbanService.getBoard(toValue(id)!),
    enabled: computed(() => !!toValue(id)),
    staleTime: 15_000
  })
}

export function useKanbanMutations() {
  const qc = useQueryClient()

  const invalidateBoards = () => qc.invalidateQueries({ queryKey: qk.boards() })

  const createBoard = useMutation({
    mutationFn: (body: BoardRequest) => kanbanService.createBoard(body),
    onSuccess: () => invalidateBoards()
  })

  const updateBoard = useMutation({
    mutationFn: ({ id, body }: { id: string; body: BoardRequest }) => kanbanService.updateBoard(id, body),
    onSuccess: (_data, { id }) => {
      invalidateBoards()
      qc.invalidateQueries({ queryKey: qk.board(id) })
    }
  })

  const deleteBoard = useMutation({
    mutationFn: (id: string) => kanbanService.deleteBoard(id),
    onSuccess: () => invalidateBoards()
  })

  const addColumn = useMutation({
    mutationFn: ({ boardId, name, position }: { boardId: string; name: string; position: number }) =>
      kanbanService.addColumn(boardId, name, position),
    onSuccess: (_d, { boardId }) => qc.invalidateQueries({ queryKey: qk.board(boardId) })
  })

  const deleteColumn = useMutation({
    mutationFn: ({ columnId }: { columnId: string; boardId: string }) =>
      kanbanService.deleteColumn(columnId),
    onSuccess: (_d, { boardId }) => qc.invalidateQueries({ queryKey: qk.board(boardId) })
  })

  const createCard = useMutation({
    mutationFn: ({ body }: { body: CardRequest; boardId: string }) =>
      kanbanService.createCard(body),
    onSuccess: (_c, { boardId }) => {
      invalidateBoards()
      qc.invalidateQueries({ queryKey: qk.board(boardId) })
    }
  })

  const moveCard = useMutation({
    mutationFn: ({ cardId, body }: { cardId: string; body: MoveCardRequest; boardId: string }) =>
      kanbanService.moveCard(cardId, body),
    onSuccess: (_d, { boardId }) => qc.invalidateQueries({ queryKey: qk.board(boardId) })
  })

  const updateCard = useMutation({
    mutationFn: (vars: { cardId: string; body: CardUpdateRequest; boardId: string }) =>
      kanbanService.updateCard(vars.cardId, vars.body),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: qk.board(vars.boardId) })
  })

  const deleteCard = useMutation({
    mutationFn: ({ cardId }: { cardId: string; boardId: string }) =>
      kanbanService.deleteCard(cardId),
    onSuccess: (_d, { boardId }) => qc.invalidateQueries({ queryKey: qk.board(boardId) })
  })

  const addChecklistItem = useMutation({
    mutationFn: ({ cardId, text }: { cardId: string; text: string; boardId: string }) =>
      kanbanService.addChecklistItem(cardId, text),
    onSuccess: (_d, { boardId }) => qc.invalidateQueries({ queryKey: qk.board(boardId) })
  })

  const toggleChecklist = useMutation({
    mutationFn: ({ itemId }: { itemId: string; boardId: string }) =>
      kanbanService.toggleChecklistItem(itemId),
    onSuccess: (_d, { boardId }) => qc.invalidateQueries({ queryKey: qk.board(boardId) })
  })

  return {
    createBoard,
    updateBoard,
    deleteBoard,
    addColumn,
    deleteColumn,
    createCard,
    moveCard,
    updateCard,
    deleteCard,
    addChecklistItem,
    toggleChecklist,
    invalidateBoards
  }
}
