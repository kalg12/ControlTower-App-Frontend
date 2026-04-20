<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import draggable from 'vuedraggable'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import Tag from 'primevue/tag'
import Checkbox from 'primevue/checkbox'
import Skeleton from 'primevue/skeleton'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from '@/composables/useToast'
import { useBoard, useKanbanMutations } from '@/queries/kanban'
import { kanbanService } from '@/services/kanban.service'
import { useAuthStore } from '@/stores/auth'
import { usersService } from '@/services/users.service'
import type { BoardVisibility, KanbanCard, KanbanColumn, CardPriority } from '@/types/kanban'
import { AlertTriangle, TimerIcon } from 'lucide-vue-next'
import dayjs from 'dayjs'
import TimerWidget from '@/components/time/TimerWidget.vue'
import TimeEntriesList from '@/components/time/TimeEntriesList.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const auth = useAuthStore()
const canWriteKanban = computed(() => auth.hasPermission('kanban:write'))

const boardId = computed(() => route.params.id as string)

const { data: board, isLoading, isError, refetch } = useBoard(boardId)

/** Avoid showing another board's columns while the new board is loading. */
watch(boardId, () => {
  columns.value = []
})
const {
  addColumn,
  deleteColumn,
  createCard,
  moveCard,
  updateBoard,
  updateCard,
  deleteCard,
  addChecklistItem,
  toggleChecklist
} = useKanbanMutations()

/** Local columns for drag-and-drop; synced from server */
const columns = ref<KanbanColumn[]>([])

watch(
  () => board.value,
  (b) => {
    if (!b?.columns?.length) {
      columns.value = []
      return
    }
    columns.value = [...b.columns]
      .sort((a, b) => a.position - b.position)
      .map((col) => ({
        ...col,
        cards: [...(col.cards ?? [])].sort((a, b) => a.position - b.position)
      }))
  },
  { immediate: true }
)

const showColDialog = ref(false)
const colName = ref('')
const addingCol = ref(false)

const showCardDialog = ref(false)
const targetColumnId = ref<string | null>(null)
const cardTitle = ref('')
const cardDesc = ref('')
const cardDue = ref<string | null>(null)
const cardPriority = ref<CardPriority>('MEDIUM')
const cardAssignees = ref<string[]>([])
const cardEstimatedMinutes = ref<number | null>(null)
const savingCard = ref(false)

const selectedCard = ref<KanbanCard | null>(null)
const showCardDetail = ref(false)
const detailTitle = ref('')
const detailDesc = ref('')
const detailDue = ref('')
const detailPriority = ref<CardPriority>('MEDIUM')
const detailAssignees = ref<string[]>([])
const detailEstimatedMinutes = ref<number | null>(null)
const savingCardDetail = ref(false)

const showBoardEdit = ref(false)
const boardEditName = ref('')
const boardEditDesc = ref('')
const boardEditVis = ref<BoardVisibility>('TEAM')
const savingBoardEdit = ref(false)

const boardVisOptions = computed(() => [
  { label: t('kanban.visibilityTeam'), value: 'TEAM' as const },
  { label: t('kanban.visibilityPrivate'), value: 'PRIVATE' as const }
])

const priorityOpts = computed(() => [
  { label: t('kanban.priorityLow'), value: 'LOW' as const },
  { label: t('kanban.priorityMedium'), value: 'MEDIUM' as const },
  { label: t('kanban.priorityHigh'), value: 'HIGH' as const },
  { label: t('kanban.priorityCritical'), value: 'CRITICAL' as const }
])

const tenantIdForUsers = computed(
  () => auth.user?.tenantId ?? board.value?.tenantId ?? ''
)

const { data: userOptions } = useQuery({
  queryKey: computed(() => ['users', 'kanban-assign', tenantIdForUsers.value]),
  queryFn: () =>
    usersService.list({ tenantId: tenantIdForUsers.value, page: 0, size: 100 }),
  enabled: computed(
    () => !!tenantIdForUsers.value && (showCardDialog.value || showCardDetail.value)
  )
})

const assigneeSelectOptions = computed(() =>
  (userOptions.value?.content ?? []).map((u) => ({
    label: u.fullName || u.email,
    value: u.id
  }))
)

function openAddColumn() {
  colName.value = ''
  showColDialog.value = true
}

async function submitColumn() {
  const name = colName.value.trim()
  if (!name || !board.value) return
  const maxPos = columns.value.reduce((m, c) => Math.max(m, c.position), -1)
  addingCol.value = true
  try {
    await addColumn.mutateAsync({
      boardId: board.value.id,
      name,
      position: maxPos + 1
    })
    showColDialog.value = false
    refetch()
  } catch {
    toast.error(t('errors.loadFailed'))
  } finally {
    addingCol.value = false
  }
}

function openAddCard(columnId: string) {
  targetColumnId.value = columnId
  cardTitle.value = ''
  cardDesc.value = ''
  cardDue.value = null
  cardPriority.value = 'MEDIUM'
  cardAssignees.value = []
  cardEstimatedMinutes.value = null
  showCardDialog.value = true
}

async function submitCard() {
  const title = cardTitle.value.trim()
  const cid = targetColumnId.value
  if (!title || !cid || !board.value) return
  const col = columns.value.find((c) => c.id === cid)
  const pos = col?.cards?.length ?? 0
  savingCard.value = true
  try {
    await createCard.mutateAsync({
      body: {
        columnId: cid,
        title,
        description: cardDesc.value.trim() || undefined,
        dueDate: cardDue.value || undefined,
        priority: cardPriority.value,
        assigneeIds: cardAssignees.value.length > 0 ? cardAssignees.value : undefined,
        position: pos,
        estimatedMinutes: cardEstimatedMinutes.value ?? undefined
      },
      boardId: board.value.id
    })
    showCardDialog.value = false
    refetch()
  } catch {
    toast.error(t('errors.loadFailed'))
  } finally {
    savingCard.value = false
  }
}

function onDragChange(evt: { added?: { element: KanbanCard; newIndex: number }; moved?: { element: KanbanCard; newIndex: number } }, columnId: string) {
  if (!board.value) return
  if (evt.added) {
    const card = evt.added.element
    const newIndex = evt.added.newIndex
    moveCard.mutate(
      { cardId: card.id, body: { targetColumnId: columnId, position: newIndex }, boardId: board.value.id },
      {
        onError: () => {
          toast.error(t('kanban.moveCardFailed'))
          refetch()
        }
      }
    )
  } else if (evt.moved) {
    const card = evt.moved.element
    const newIndex = evt.moved.newIndex
    moveCard.mutate(
      { cardId: card.id, body: { targetColumnId: columnId, position: newIndex }, boardId: board.value.id },
      {
        onError: () => {
          toast.error(t('kanban.moveCardFailed'))
          refetch()
        }
      }
    )
  }
}

function cardWipCount(column: KanbanColumn): number {
  return column.cards?.length ?? 0
}

function wipExceeded(column: KanbanColumn): boolean {
  if (column.wipLimit == null || column.wipLimit <= 0) return false
  return cardWipCount(column) > column.wipLimit
}

function openCard(c: KanbanCard) {
  selectedCard.value = c
  detailTitle.value = c.title
  detailDesc.value = c.description ?? ''
  detailDue.value = c.dueDate ? formatDue(c.dueDate) : ''
  detailPriority.value = c.priority
  detailAssignees.value = c.assigneeIds ?? []
  detailEstimatedMinutes.value = c.estimatedMinutes ?? null
  showCardDetail.value = true
}

function openBoardEdit() {
  if (!board.value) return
  boardEditName.value = board.value.name
  boardEditDesc.value = board.value.description ?? ''
  boardEditVis.value = board.value.visibility
  showBoardEdit.value = true
}

async function submitBoardEdit() {
  if (!board.value) return
  const name = boardEditName.value.trim()
  if (!name) return
  savingBoardEdit.value = true
  try {
    await updateBoard.mutateAsync({
      id: board.value.id,
      body: {
        name,
        description: boardEditDesc.value.trim() || undefined,
        visibility: boardEditVis.value
      }
    })
    showBoardEdit.value = false
    toast.success(t('common.save'))
    refetch()
  } catch {
    toast.error(t('errors.loadFailed'))
  } finally {
    savingBoardEdit.value = false
  }
}

async function submitCardDetail() {
  if (!selectedCard.value || !board.value) return
  const title = detailTitle.value.trim()
  if (!title) return
  savingCardDetail.value = true
  try {
    const updated = await updateCard.mutateAsync({
      cardId: selectedCard.value.id,
      boardId: board.value.id,
      body: {
        title,
        description: detailDesc.value.trim() || undefined,
        dueDate: detailDue.value.trim() ? detailDue.value : null,
        priority: detailPriority.value,
        assigneeIds: detailAssignees.value,
        estimatedMinutes: detailEstimatedMinutes.value ?? null
      }
    })
    selectedCard.value = updated
    toast.success(t('common.save'))
    refetch()
  } catch {
    toast.error(t('errors.loadFailed'))
  } finally {
    savingCardDetail.value = false
  }
}

async function onToggleChecklist(itemId: string) {
  if (!board.value) return
  try {
    await toggleChecklist.mutateAsync({ itemId, boardId: board.value.id })
  } catch {
    toast.error(t('errors.loadFailed'))
  }
}

const attendingCardId = ref<string | null>(null)

async function attendCard(cardId: string) {
  attendingCardId.value = cardId
  try {
    await kanbanService.attendCard(cardId)
    refetch()
  } catch {
    toast.error(t('errors.loadFailed'))
  } finally {
    attendingCardId.value = null
  }
}

const newChecklistText = ref('')
async function submitChecklistItem() {
  const text = newChecklistText.value.trim()
  if (!text || !selectedCard.value || !board.value) return
  try {
    await addChecklistItem.mutateAsync({
      cardId: selectedCard.value.id,
      text,
      boardId: board.value.id
    })
    newChecklistText.value = ''
    refetch()
  } catch {
    toast.error(t('errors.loadFailed'))
  }
}

function confirmRemoveCard() {
  const c = selectedCard.value
  const b = board.value
  if (!c || !b) return
  confirm.require({
    message: t('kanban.deleteCardConfirm', { title: c.title }),
    header: t('kanban.deleteCard'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: async () => {
      try {
        await deleteCard.mutateAsync({ cardId: c.id, boardId: b.id })
        showCardDetail.value = false
        selectedCard.value = null
        refetch()
        toast.success(t('common.delete'))
      } catch {
        toast.error(t('errors.loadFailed'))
      }
    }
  })
}

function confirmRemoveColumn(columnId: string, columnName: string) {
  if (!board.value) return
  confirm.require({
    message: t('kanban.deleteColumnConfirm', { name: columnName }),
    header: t('kanban.deleteColumn'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: async () => {
      try {
        await deleteColumn.mutateAsync({ columnId, boardId: board.value!.id })
        refetch()
        toast.success(t('common.delete'))
      } catch {
        toast.error(t('errors.loadFailed'))
      }
    }
  })
}

function priorityLabel(p: string): string {
  const map: Record<string, string> = {
    LOW: t('kanban.priorityLow'),
    MEDIUM: t('kanban.priorityMedium'),
    HIGH: t('kanban.priorityHigh'),
    CRITICAL: t('kanban.priorityCritical')
  }
  return map[p] ?? p
}

function formatDue(d: string | null | undefined): string {
  if (!d) return ''
  return dayjs(d).format('YYYY-MM-DD')
}

function isCardOverdue(dueDate: string | null | undefined, columnKind: string | null | undefined, attendedAt?: string): boolean {
  if (!dueDate) return false
  if (columnKind === 'DONE' || columnKind === 'HISTORY') return false
  if (attendedAt) return false
  return dayjs(dueDate).isBefore(dayjs(), 'day')
}

function isCardDueSoon(dueDate: string | null | undefined, columnKind: string | null | undefined, attendedAt?: string): boolean {
  if (!dueDate) return false
  if (columnKind === 'DONE' || columnKind === 'HISTORY') return false
  if (attendedAt) return false
  const d = dayjs(dueDate)
  const today = dayjs()
  return d.isSame(today, 'day') || d.isSame(today.add(1, 'day'), 'day')
}

function dueBadgeLabel(dueDate: string | null | undefined, columnKind: string | null | undefined, attendedAt?: string): string | null {
  if (!dueDate) return null
  if (columnKind === 'DONE' || columnKind === 'HISTORY') return null
  if (attendedAt) return null
  const d = dayjs(dueDate)
  const today = dayjs()
  if (d.isBefore(today, 'day')) return 'VENCIDA'
  if (d.isSame(today, 'day')) return 'HOY'
  if (d.isSame(today.add(1, 'day'), 'day')) return 'MAÑANA'
  return null
}
</script>

<template>
  <div class="space-y-4 min-h-[60vh]">
    <div class="flex flex-wrap items-center gap-3">
      <Button :label="t('common.back')" icon="pi pi-arrow-left" severity="secondary" text @click="router.push({ name: 'kanban' })" />
      <div v-if="board" class="min-w-0 flex-1">
        <h1 class="text-xl font-semibold text-[var(--text)] truncate">{{ board.name }}</h1>
        <p v-if="board.description" class="text-sm text-[var(--text-muted)] line-clamp-1">{{ board.description }}</p>
      </div>
      <Button
        v-if="board && canWriteKanban"
        v-tooltip.top="t('kanban.editBoard')"
        icon="pi pi-pencil"
        outlined
        :aria-label="t('kanban.editBoard')"
        @click="openBoardEdit"
      />
      <Button
        v-if="canWriteKanban"
        :label="t('kanban.addColumn')"
        icon="pi pi-plus"
        outlined
        @click="openAddColumn"
      />
    </div>

    <div v-if="isLoading" class="flex gap-4 overflow-x-auto pb-2">
      <div v-for="i in 4" :key="i" class="w-72 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 space-y-3">
        <Skeleton height="1.25rem" width="40%" />
        <Skeleton height="5rem" />
        <Skeleton height="5rem" />
      </div>
    </div>

    <div v-else-if="isError" class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
      <p class="text-[var(--text-muted)] mb-4">{{ t('errors.loadFailed') }}</p>
      <Button :label="t('common.retry')" icon="pi pi-refresh" @click="() => refetch()" />
    </div>

    <div v-else-if="!columns.length" class="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center">
      <p class="text-[var(--text-muted)] mb-4">{{ t('kanban.emptyBoard') }}</p>
      <Button
        v-if="canWriteKanban"
        :label="t('kanban.addColumn')"
        icon="pi pi-plus"
        @click="openAddColumn"
      />
    </div>

    <div v-else class="flex gap-4 overflow-x-auto pb-4 items-start">
      <div
        v-for="col in columns"
        :key="col.id"
        class="w-80 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col max-h-[calc(100vh-12rem)]"
      >
        <div class="p-3 border-b border-[var(--border)] flex items-start justify-between gap-2">
          <div class="min-w-0">
            <h2 class="font-semibold text-[var(--text)] truncate">{{ col.name }}</h2>
            <div class="flex flex-wrap items-center gap-1.5 mt-1">
              <span class="text-xs text-[var(--text-muted)]">
                {{ cardWipCount(col) }} {{ t('kanban.cards') }}
              </span>
              <template v-if="col.wipLimit != null && col.wipLimit > 0">
                <Tag
                  :severity="wipExceeded(col) ? 'danger' : 'secondary'"
                  class="text-[10px]"
                  :value="`${t('kanban.wipLimit')}: ${col.wipLimit}`"
                />
                <span v-if="wipExceeded(col)" class="flex items-center gap-0.5 text-xs text-amber-600">
                  <AlertTriangle class="w-3.5 h-3.5" />
                  {{ t('kanban.wipExceeded') }}
                </span>
              </template>
            </div>
          </div>
          <div v-if="canWriteKanban" class="flex gap-1 shrink-0">
            <Button
              v-tooltip.top="t('kanban.addCard')"
              icon="pi pi-plus"
              rounded
              text
              size="small"
              @click="openAddCard(col.id)"
            />
            <Button
              v-tooltip.top="t('common.delete')"
              icon="pi pi-trash"
              rounded
              text
              severity="danger"
              size="small"
              @click="confirmRemoveColumn(col.id, col.name)"
            />
          </div>
        </div>

        <draggable
          v-model="col.cards"
          group="kanbanCards"
          item-key="id"
          class="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]"
          ghost-class="opacity-50"
          :disabled="!canWriteKanban"
          @change="(e: { added?: unknown; moved?: unknown }) => onDragChange(e as { added?: { element: KanbanCard; newIndex: number }; moved?: { element: KanbanCard; newIndex: number } }, col.id)"
        >
          <template #item="{ element: card }">
            <button
              type="button"
              class="w-full text-left rounded-lg border bg-[var(--surface-raised)] p-3 hover:border-[var(--primary)]/50 transition-colors"
              :class="isCardOverdue(card.dueDate, col.columnKind, card.attendedAt)
                ? 'border-red-400 dark:border-red-600'
                : isCardDueSoon(card.dueDate, col.columnKind, card.attendedAt)
                  ? 'border-orange-400 dark:border-orange-500'
                  : 'border-[var(--border)]'"
              @click="openCard(card)"
            >
              <div class="flex items-start justify-between gap-1 mb-1">
                <p class="font-medium text-sm text-[var(--text)] line-clamp-2">{{ card.title }}</p>
                <span
                  v-if="dueBadgeLabel(card.dueDate, col.columnKind, card.attendedAt)"
                  class="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
                  :class="isCardOverdue(card.dueDate, col.columnKind, card.attendedAt) ? 'bg-red-500' : 'bg-orange-400'"
                >{{ dueBadgeLabel(card.dueDate, col.columnKind, card.attendedAt) }}</span>
              </div>
              <div v-if="card.wasOverdue && card.attendedAt" class="text-[10px] text-green-600 dark:text-green-400 mb-1">
                ✓ Atendida
              </div>
              <button
                v-if="dueBadgeLabel(card.dueDate, col.columnKind, card.attendedAt) === 'VENCIDA' && canWriteKanban"
                type="button"
                class="mt-1 text-[10px] text-green-600 hover:text-green-700 dark:text-green-400 font-medium flex items-center gap-0.5 disabled:opacity-50"
                :disabled="attendingCardId === card.id"
                @click.stop="attendCard(card.id)"
              >✓ Marcar atendida</button>
              <p v-if="card.description" class="text-xs text-[var(--text-muted)] line-clamp-2 mt-1">{{ card.description }}</p>
              <div class="flex items-center justify-between gap-1 mt-2">
                <div class="flex flex-wrap gap-1">
                  <Tag v-if="card.priority" severity="warn" class="text-[10px]">{{ priorityLabel(card.priority) }}</Tag>
                  <Tag v-if="card.dueDate && col.columnKind !== 'DONE' && col.columnKind !== 'HISTORY'" severity="info" class="text-[10px]">{{ formatDue(card.dueDate) }}</Tag>
                  <Tag v-if="card.estimatedMinutes" severity="secondary" class="text-[10px]">
                    ⏱ {{ card.estimatedMinutes >= 60 ? `${Math.floor(card.estimatedMinutes / 60)}h` : `${card.estimatedMinutes}m` }}
                  </Tag>
                </div>
                <!-- Stacked assignee avatars -->
                <div v-if="card.assigneeIds && card.assigneeIds.length > 0" class="flex -space-x-1.5 flex-shrink-0">
                  <div
                    v-for="(uid, idx) in card.assigneeIds.slice(0, 3)"
                    :key="uid"
                    :style="{ zIndex: 3 - idx }"
                    class="w-5 h-5 rounded-full bg-[var(--primary)] border border-[var(--surface)] flex items-center justify-center text-[8px] font-bold text-white"
                    :title="uid"
                  >
                    {{ assigneeSelectOptions.find(o => o.value === uid)?.label?.[0]?.toUpperCase() ?? '?' }}
                  </div>
                  <div v-if="card.assigneeIds.length > 3" class="w-5 h-5 rounded-full bg-gray-400 border border-[var(--surface)] flex items-center justify-center text-[8px] font-bold text-white">
                    +{{ card.assigneeIds.length - 3 }}
                  </div>
                </div>
              </div>
            </button>
          </template>
        </draggable>
      </div>
    </div>

    <!-- New column -->
    <Dialog v-model:visible="showColDialog" :header="t('kanban.addColumn')" modal class="w-full max-w-md">
      <div class="flex flex-col gap-3 pt-2">
        <InputText v-model="colName" :placeholder="t('kanban.columnName')" class="w-full" @keydown.enter="submitColumn" />
        <div class="flex justify-end gap-2">
          <Button :label="t('common.cancel')" severity="secondary" outlined @click="showColDialog = false" />
          <Button :label="t('common.create')" :loading="addingCol" :disabled="!colName.trim()" @click="submitColumn" />
        </div>
      </div>
    </Dialog>

    <!-- New card -->
    <Dialog v-model:visible="showCardDialog" :header="t('kanban.addCard')" modal class="w-full max-w-lg">
      <div class="flex flex-col gap-3 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('kanban.cardTitle') }}</label>
          <InputText v-model="cardTitle" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('kanban.cardDescription') }}</label>
          <Textarea v-model="cardDesc" rows="3" class="w-full" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('kanban.dueDate') }}</label>
            <InputText v-model="cardDue" type="date" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('kanban.priority') }}</label>
            <Select v-model="cardPriority" :options="priorityOpts" option-label="label" option-value="value" class="w-full" />
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('kanban.assignees') }}</label>
          <MultiSelect
            v-model="cardAssignees"
            :options="assigneeSelectOptions"
            option-label="label"
            option-value="value"
            :placeholder="t('kanban.unassigned')"
            class="w-full"
            filter
            :max-selected-labels="3"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Tiempo estimado (min)</label>
          <InputText v-model.number="cardEstimatedMinutes" type="number" min="1" placeholder="ej. 90" class="w-full" />
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button :label="t('common.cancel')" severity="secondary" outlined @click="showCardDialog = false" />
          <Button :label="t('common.create')" :loading="savingCard" :disabled="!cardTitle.trim()" @click="submitCard" />
        </div>
      </div>
    </Dialog>

    <!-- Board settings -->
    <Dialog v-model:visible="showBoardEdit" :header="t('kanban.editBoard')" modal class="w-full max-w-md" :dismissable-mask="true">
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium">{{ t('kanban.boardName') }}</label>
          <InputText v-model="boardEditName" class="w-full" />
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium">{{ t('kanban.description') }}</label>
          <Textarea v-model="boardEditDesc" rows="3" class="w-full" />
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium">{{ t('kanban.visibility') }}</label>
          <Select v-model="boardEditVis" :options="boardVisOptions" option-label="label" option-value="value" class="w-full" />
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button :label="t('common.cancel')" severity="secondary" outlined @click="showBoardEdit = false" />
          <Button
            :label="t('common.save')"
            icon="pi pi-check"
            :loading="savingBoardEdit"
            :disabled="!boardEditName.trim()"
            @click="submitBoardEdit"
          />
        </div>
      </div>
    </Dialog>

    <!-- Card detail -->
    <Dialog
      v-model:visible="showCardDetail"
      :header="t('kanban.editCard')"
      modal
      class="w-full max-w-lg"
      @hide="selectedCard = null"
    >
      <div v-if="selectedCard" class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('kanban.cardTitle') }}</label>
          <InputText v-model="detailTitle" class="w-full" :readonly="!canWriteKanban" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('kanban.cardDescription') }}</label>
          <Textarea v-model="detailDesc" rows="3" class="w-full" :readonly="!canWriteKanban" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('kanban.dueDate') }}</label>
            <InputText v-model="detailDue" type="date" class="w-full" :readonly="!canWriteKanban" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('kanban.priority') }}</label>
            <Select
              v-model="detailPriority"
              :options="priorityOpts"
              option-label="label"
              option-value="value"
              class="w-full"
              :disabled="!canWriteKanban"
            />
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('kanban.assignees') }}</label>
          <MultiSelect
            v-model="detailAssignees"
            :options="assigneeSelectOptions"
            option-label="label"
            option-value="value"
            :placeholder="t('kanban.unassigned')"
            class="w-full"
            filter
            :max-selected-labels="3"
            :disabled="!canWriteKanban"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Tiempo estimado (min)</label>
          <InputText v-model.number="detailEstimatedMinutes" type="number" min="1" placeholder="ej. 90" class="w-full" :readonly="!canWriteKanban" />
        </div>
        <div v-if="canWriteKanban" class="flex justify-end gap-2">
          <Button
            :label="t('common.save')"
            icon="pi pi-check"
            :loading="savingCardDetail"
            :disabled="!detailTitle.trim()"
            @click="submitCardDetail"
          />
        </div>

        <div v-if="(selectedCard.checklist?.length ?? 0) > 0 || canWriteKanban" class="border-t border-[var(--border)] pt-4">
          <h3 class="text-sm font-semibold mb-2">{{ t('kanban.checklist') }}</h3>
          <ul class="space-y-2 mb-3">
            <li
              v-for="item in selectedCard.checklist ?? []"
              :key="item.id"
              class="flex items-center gap-2 text-sm"
            >
              <Checkbox
                :model-value="item.completed"
                binary
                :disabled="!canWriteKanban"
                @update:model-value="() => onToggleChecklist(item.id)"
              />
              <span :class="item.completed ? 'line-through text-[var(--text-muted)]' : ''">{{ item.text }}</span>
            </li>
          </ul>
          <div v-if="canWriteKanban" class="flex gap-2">
            <InputText v-model="newChecklistText" class="flex-1" :placeholder="t('kanban.addChecklistItem')" @keydown.enter="submitChecklistItem" />
            <Button icon="pi pi-plus" @click="submitChecklistItem" />
          </div>
        </div>

        <!-- Time tracking section -->
        <div class="border-t border-[var(--border)] pt-4 space-y-3">
          <h3 class="text-sm font-semibold flex items-center gap-1.5">
            <TimerIcon class="h-4 w-4 text-muted-foreground" />
            Tiempo
          </h3>
          <TimerWidget entity-type="CARD" :entity-id="selectedCard.id" />
          <TimeEntriesList entity-type="CARD" :entity-id="selectedCard.id" />
        </div>

        <div v-if="canWriteKanban" class="flex justify-end gap-2 pt-2">
          <Button :label="t('common.delete')" severity="danger" outlined @click="confirmRemoveCard" />
        </div>
      </div>
    </Dialog>
  </div>
</template>
