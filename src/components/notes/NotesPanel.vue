<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNotesList, useNoteMutations } from '@/queries/notes'
import { useToast } from '@/composables/useToast'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Skeleton from 'primevue/skeleton'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { StickyNote, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-vue-next'

dayjs.extend(relativeTime)

const props = defineProps<{
  linkedTo: 'TICKET' | 'CLIENT'
  linkedId: string
}>()

const toast = useToast()
const confirm = useConfirm()
const { create, update, remove } = useNoteMutations()

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
    toast.success('Nota guardada')
  } catch {
    toast.error('No se pudo guardar la nota')
  } finally {
    isSaving.value = false
  }
}

// ── Edit inline ───────────────────────────────────────────────────────
const editingId = ref<string | null>(null)
const editTitle = ref('')
const editContent = ref('')

function startEdit(note: { id: string; title: string; content?: string }) {
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
    toast.success('Nota actualizada')
  } catch {
    toast.error('No se pudo actualizar la nota')
  }
}

function confirmDelete(id: string, title: string) {
  confirm.require({
    message: `¿Eliminar la nota "${title}"?`,
    header: 'Eliminar nota',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancelar', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Eliminar', severity: 'danger' },
    accept: async () => {
      try {
        await remove.mutateAsync(id)
        toast.success('Nota eliminada')
      } catch {
        toast.error('No se pudo eliminar la nota')
      }
    },
  })
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
        Notas internas
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
      <div v-else-if="notes.length" class="space-y-2 max-h-72 overflow-y-auto pr-1">
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
                <p class="text-xs text-[var(--text-muted)] mt-1 opacity-60">{{ dayjs(note.createdAt).fromNow() }}</p>
              </div>
              <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button class="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)]" @click="startEdit(note)">
                  <Pencil class="w-3.5 h-3.5" />
                </button>
                <button class="p-1 rounded text-[var(--text-muted)] hover:text-red-500" @click="confirmDelete(note.id, note.title)">
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </template>

          <!-- Edit mode -->
          <template v-else>
            <InputText v-model="editTitle" class="w-full mb-2 text-sm" placeholder="Título" size="small" />
            <Textarea v-model="editContent" class="w-full text-xs" :rows="2" placeholder="Contenido (opcional)" />
            <div class="flex gap-2 mt-2 justify-end">
              <Button label="Cancelar" severity="secondary" text size="small" @click="cancelEdit" />
              <Button label="Guardar" size="small" @click="saveEdit(note.id)" />
            </div>
          </template>
        </div>
      </div>

      <p v-else class="text-sm text-[var(--text-muted)] py-2">Sin notas aún.</p>

      <!-- Add note form -->
      <div class="border-t border-[var(--border)] pt-3 space-y-2">
        <InputText v-model="addTitle" class="w-full text-sm" placeholder="Título de la nota *" size="small" />
        <Textarea v-model="addContent" class="w-full text-xs" :rows="2" placeholder="Contenido (opcional)" />
        <div class="flex justify-end">
          <Button
            label="Guardar nota"
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
