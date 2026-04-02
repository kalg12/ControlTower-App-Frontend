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
import Tag from 'primevue/tag'
import Checkbox from 'primevue/checkbox'
import Skeleton from 'primevue/skeleton'
import { useToast } from '@/composables/useToast'
import { useBoard, useKanbanMutations } from '@/queries/kanban'
import { useAuthStore } from '@/stores/auth'
import { usersService } from '@/services/users.service'
import type { KanbanCard, KanbanColumn, CardPriority } from '@/types/kanban'
import { AlertTriangle } from 'lucide-vue-next'
import dayjs from 'dayjs'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const auth = useAuthStore()

const boardId = computed(() => route.params.id as string)

const { data: board, isLoading, isError, refetch } = useBoard(boardId)
const {
  addColumn,
  deleteColumn,
  createCard,
  moveCard,
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
const cardAssignee = ref<string | null>(null)
const savingCard = ref(false)

const selectedCard = ref<KanbanCard | null>(null)
const showCardDetail = ref(false)

const priorityOpts = computed(() => [
  { label: t('kanban.priorityLow'), value: 'LOW' as const },
  { label: t('kanban.priorityMedium'), value: 'MEDIUM' as const },
  { label: t('kanban.priorityHigh'), value: 'HIGH' as const },
  { label: t('kanban.priorityCritical'), value: 'CRITICAL' as const }
])

const { data: userOptions } = useQuery({
  queryKey: computed(() => ['users', 'kanban-assign', auth.user?.tenantId ?? '']),
  queryFn: () =>
    usersService.list({ tenantId: auth.user!.tenantId, page: 0, size: 100 }),
  enabled: computed(() => !!auth.user?.tenantId && showCardDialog.value)
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
  cardAssignee.value = null
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
        assigneeId: cardAssignee.value || undefined,
        position: pos
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
  showCardDetail.value = true
}

async function onToggleChecklist(itemId: string) {
  if (!board.value) return
  try {
    await toggleChecklist.mutateAsync({ itemId, boardId: board.value.id })
  } catch {
    toast.error(t('errors.loadFailed'))
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

async function removeCard() {
  if (!selectedCard.value || !board.value) return
  try {
    await deleteCard.mutateAsync({ cardId: selectedCard.value.id, boardId: board.value.id })
    showCardDetail.value = false
    selectedCard.value = null
    refetch()
  } catch {
    toast.error(t('errors.loadFailed'))
  }
}

async function removeColumn(columnId: string) {
  if (!board.value) return
  try {
    await deleteColumn.mutateAsync({ columnId, boardId: board.value.id })
    refetch()
  } catch {
    toast.error(t('errors.loadFailed'))
  }
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
</script>

<template>
  <div class="space-y-4 min-h-[60vh]">
    <div class="flex flex-wrap items-center gap-3">
      <Button :label="t('common.back')" icon="pi pi-arrow-left" severity="secondary" text @click="router.push({ name: 'kanban' })" />
      <div v-if="board" class="min-w-0 flex-1">
        <h1 class="text-xl font-semibold text-[var(--text)] truncate">{{ board.name }}</h1>
        <p v-if="board.description" class="text-sm text-[var(--text-muted)] line-clamp-1">{{ board.description }}</p>
      </div>
      <Button :label="t('kanban.addColumn')" icon="pi pi-plus" outlined @click="openAddColumn" />
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
      <Button :label="t('kanban.addColumn')" icon="pi pi-plus" @click="openAddColumn" />
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
          <div class="flex gap-1 shrink-0">
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
              @click="removeColumn(col.id)"
            />
          </div>
        </div>

        <draggable
          v-model="col.cards"
          group="kanbanCards"
          item-key="id"
          class="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]"
          ghost-class="opacity-50"
          @change="(e: { added?: unknown; moved?: unknown }) => onDragChange(e as { added?: { element: KanbanCard; newIndex: number }; moved?: { element: KanbanCard; newIndex: number } }, col.id)"
        >
          <template #item="{ element: card }">
            <button
              type="button"
              class="w-full text-left rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 hover:border-[var(--primary)]/50 transition-colors"
              @click="openCard(card)"
            >
              <p class="font-medium text-sm text-[var(--text)] line-clamp-2">{{ card.title }}</p>
              <p v-if="card.description" class="text-xs text-[var(--text-muted)] line-clamp-2 mt-1">{{ card.description }}</p>
              <div class="flex flex-wrap gap-1 mt-2">
                <Tag v-if="card.priority" severity="warn" class="text-[10px]">{{ priorityLabel(card.priority) }}</Tag>
                <Tag v-if="card.dueDate" severity="info" class="text-[10px]">{{ formatDue(card.dueDate) }}</Tag>
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
          <label class="text-sm font-medium">{{ t('kanban.assignee') }}</label>
          <Select
            v-model="cardAssignee"
            :options="assigneeSelectOptions"
            option-label="label"
            option-value="value"
            :placeholder="t('kanban.unassigned')"
            show-clear
            class="w-full"
            filter
          />
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button :label="t('common.cancel')" severity="secondary" outlined @click="showCardDialog = false" />
          <Button :label="t('common.create')" :loading="savingCard" :disabled="!cardTitle.trim()" @click="submitCard" />
        </div>
      </div>
    </Dialog>

    <!-- Card detail -->
    <Dialog
      v-model:visible="showCardDetail"
      :header="selectedCard?.title ?? ''"
      modal
      class="w-full max-w-lg"
      @hide="selectedCard = null"
    >
      <div v-if="selectedCard" class="flex flex-col gap-4 pt-2">
        <p class="text-xs text-[var(--text-muted)]">{{ t('kanban.cardReadOnlyHint') }}</p>
        <div v-if="selectedCard.description" class="text-sm text-[var(--text)] whitespace-pre-wrap">{{ selectedCard.description }}</div>
        <div class="flex flex-wrap gap-2">
          <Tag :value="priorityLabel(selectedCard.priority)" />
          <Tag v-if="selectedCard.dueDate" :value="formatDue(selectedCard.dueDate)" severity="info" />
        </div>

        <div class="border-t border-[var(--border)] pt-4">
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
                @update:model-value="() => onToggleChecklist(item.id)"
              />
              <span :class="item.completed ? 'line-through text-[var(--text-muted)]' : ''">{{ item.text }}</span>
            </li>
          </ul>
          <div class="flex gap-2">
            <InputText v-model="newChecklistText" class="flex-1" :placeholder="t('kanban.addChecklistItem')" @keydown.enter="submitChecklistItem" />
            <Button icon="pi pi-plus" @click="submitChecklistItem" />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <Button :label="t('common.delete')" severity="danger" outlined @click="removeCard" />
        </div>
      </div>
    </Dialog>
  </div>
</template>
