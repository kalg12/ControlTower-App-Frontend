<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNotesList, useNoteMutations } from '@/queries/notes'
import type { Note } from '@/services/notes.service'
import { useToast } from '@/composables/useToast'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Skeleton from 'primevue/skeleton'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { StickyNote, ChevronDown, ChevronUp, Pencil, Trash2, CornerDownRight } from 'lucide-vue-next'

dayjs.extend(relativeTime)

const props = defineProps<{
  linkedTo: 'TICKET' | 'CLIENT' | 'KANBAN_CARD'
  linkedId: string
}>()

const toast = useToast()
const confirm = useConfirm()
const { t } = useI18n()
const { create, reply, update, remove } = useNoteMutations()

const isOpen = ref(true)

const { data: notesPage, isLoading } = useNotesList(
  computed(() => props.linkedTo),
  computed(() => props.linkedId)
)
const notes = computed(() => notesPage.value?.content ?? [])

// ── Add form ──────────────────────────────────────────────────────────
const addTitle = ref('')
const addContent = ref('')
const isSaving = ref(false)

async function saveNote() {
  if (!addTitle.value.trim()) return
  isSaving.value = true
  try {
    await create.mutateAsync({
      title: addTitle.value.trim(),
      content: addContent.value.trim() || undefined,
      linkedTo: props.linkedTo,
      linkedId: props.linkedId,
    })
    addTitle.value = ''
    addContent.value = ''
    toast.success(t('notes.saved'))
  } catch {
    toast.error(t('notes.saveFailed'))
  } finally {
    isSaving.value = false
  }
}

// ── Reply ─────────────────────────────────────────────────────────────
const replyingToId = ref<string | null>(null)
const replyContent = ref('')
const isReplying = ref(false)

function startReply(noteId: string) {
  replyingToId.value = replyingToId.value === noteId ? null : noteId
  replyContent.value = ''
}

async function submitReply(parentId: string, parentTitle: string) {
  if (!replyContent.value.trim()) return
  isReplying.value = true
  try {
    await reply.mutateAsync({
      parentId,
      body: {
        title: parentTitle,
        content: replyContent.value.trim(),
      },
    })
    replyingToId.value = null
    replyContent.value = ''
    toast.success(t('notes.replySaved'))
  } catch {
    toast.error(t('notes.replyFailed'))
  } finally {
    isReplying.value = false
  }
}

// ── Edit inline ───────────────────────────────────────────────────────
const editingId = ref<string | null>(null)
const editTitle = ref('')
const editContent = ref('')

function startEdit(note: Note) {
  editingId.value = note.id
  editTitle.value = note.title
  editContent.value = note.content ?? ''
}

function cancelEdit() {
  editingId.value = null
}

async function saveEdit(id: string) {
  if (!editTitle.value.trim()) return
  try {
    await update.mutateAsync({
      id,
      body: { title: editTitle.value.trim(), content: editContent.value.trim() || undefined },
    })
    editingId.value = null
    toast.success(t('notes.updated'))
  } catch {
    toast.error(t('notes.updateFailed'))
  }
}

function confirmDelete(id: string, title: string) {
  confirm.require({
    message: t('notes.deleteConfirm', { title }),
    header: t('notes.deleteTitle'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('notes.cancelLabel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('notes.deleteLabel'), severity: 'danger' },
    accept: async () => {
      try {
        await remove.mutateAsync(id)
        toast.success(t('notes.deleted'))
      } catch {
        toast.error(t('notes.deleteFailed'))
      }
    },
  })
}

function formatDatetime(iso?: string) {
  if (!iso) return ''
  return dayjs(iso).format('DD/MM/YY HH:mm')
}
</script>

<template>
  <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
    <!-- Header -->
    <button
      class="w-full flex items-center justify-between px-4 py-3 text-left"
      @click="isOpen = !isOpen"
    >
      <span class="flex items-center gap-2 text-sm font-semibold text-[var(--text)] uppercase tracking-wide">
        <StickyNote class="w-4 h-4" />
        {{ $t('notes.title') }}
        <span v-if="notes.length" class="text-xs font-normal text-[var(--text-muted)]">({{ notes.length }})</span>
      </span>
      <ChevronDown v-if="!isOpen" class="w-4 h-4 text-[var(--text-muted)]" />
      <ChevronUp v-else class="w-4 h-4 text-[var(--text-muted)]" />
    </button>

    <div v-if="isOpen" class="px-4 pb-4 space-y-3">
      <!-- Loading -->
      <div v-if="isLoading" class="space-y-2">
        <Skeleton height="2.5rem" v-for="i in 2" :key="i" />
      </div>

      <!-- Notes list -->
      <div v-else-if="notes.length" class="space-y-2 max-h-96 overflow-y-auto pr-1">
        <div
          v-for="note in notes"
          :key="note.id"
          class="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 group"
        >
          <!-- View mode -->
          <template v-if="editingId !== note.id">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-[var(--text)]">{{ note.title }}</p>
                <p v-if="note.content" class="text-xs text-[var(--text-muted)] mt-0.5 whitespace-pre-wrap">{{ note.content }}</p>
                <!-- Author + datetime -->
                <p class="text-xs text-[var(--text-muted)] mt-1.5 flex items-center gap-1.5 opacity-75">
                  <span class="font-medium text-[var(--text-muted)]">{{ note.authorName ?? $t('notes.unknownAuthor') }}</span>
                  <span>·</span>
                  <span :title="note.createdAt">{{ formatDatetime(note.createdAt) }}</span>
                </p>
              </div>
              <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button
                  class="p-1 rounded text-[var(--text-muted)] hover:text-[var(--brand)]"
                  :title="$t('notes.reply')"
                  @click="startReply(note.id)"
                >
                  <CornerDownRight class="w-3.5 h-3.5" />
                </button>
                <button class="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)]" @click="startEdit(note)">
                  <Pencil class="w-3.5 h-3.5" />
                </button>
                <button class="p-1 rounded text-[var(--text-muted)] hover:text-red-500" @click="confirmDelete(note.id, note.title)">
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <!-- Embedded replies -->
            <div v-if="note.replies && note.replies.length" class="mt-2 ml-4 border-l-2 border-[var(--border)] pl-3 space-y-2">
              <div
                v-for="r in note.replies"
                :key="r.id"
                class="text-xs text-[var(--text-muted)]"
              >
                <p class="text-[var(--text)] whitespace-pre-wrap">{{ r.content }}</p>
                <p class="flex items-center gap-1.5 mt-0.5 opacity-75">
                  <span class="font-medium">{{ r.authorName ?? $t('notes.unknownAuthor') }}</span>
                  <span>·</span>
                  <span>{{ formatDatetime(r.createdAt) }}</span>
                </p>
              </div>
            </div>

            <!-- Reply form -->
            <div v-if="replyingToId === note.id" class="mt-2 ml-4 border-l-2 border-[var(--brand)] pl-3">
              <Textarea
                v-model="replyContent"
                class="w-full text-xs"
                :rows="2"
                :placeholder="$t('notes.replyPlaceholder')"
                auto-resize
              />
              <div class="flex gap-2 mt-1.5 justify-end">
                <Button :label="$t('notes.cancelLabel')" severity="secondary" text size="small" @click="startReply(note.id)" />
                <Button
                  :label="$t('notes.sendReply')"
                  size="small"
                  icon="pi pi-send"
                  :loading="isReplying"
                  :disabled="!replyContent.trim()"
                  @click="submitReply(note.id, note.title)"
                />
              </div>
            </div>
          </template>

          <!-- Edit mode -->
          <template v-else>
            <InputText v-model="editTitle" class="w-full mb-2 text-sm" :placeholder="$t('notes.placeholderTitle')" size="small" />
            <Textarea v-model="editContent" class="w-full text-xs" :rows="2" :placeholder="$t('notes.placeholderContent')" />
            <div class="flex gap-2 mt-2 justify-end">
              <Button :label="$t('notes.cancelLabel')" severity="secondary" text size="small" @click="cancelEdit" />
              <Button :label="$t('notes.save')" size="small" @click="saveEdit(note.id)" />
            </div>
          </template>
        </div>
      </div>

      <p v-else class="text-sm text-[var(--text-muted)] py-2">{{ $t('notes.empty') }}</p>

      <!-- Add note form -->
      <div class="border-t border-[var(--border)] pt-3 space-y-2">
        <InputText v-model="addTitle" class="w-full text-sm" :placeholder="$t('notes.addTitle')" size="small" />
        <Textarea v-model="addContent" class="w-full text-xs" :rows="2" :placeholder="$t('notes.placeholderContent')" />
        <div class="flex justify-end">
          <Button
            :label="$t('notes.saveNote')"
            icon="pi pi-plus"
            size="small"
            :loading="isSaving"
            :disabled="!addTitle.trim()"
            @click="saveNote"
          />
        </div>
      </div>
    </div>
  </div>
</template>
