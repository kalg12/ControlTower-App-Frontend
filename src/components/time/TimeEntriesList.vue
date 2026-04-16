<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTimeSummary, useTimeTrackingMutations } from '@/queries/time-tracking'
import { useToast } from '@/composables/useToast'
import type { TimeEntityType } from '@/types/time-tracking'
import { formatMinutes } from '@/types/time-tracking'
import TimeProgressBar from '@/components/time/TimeProgressBar.vue'
import { ChevronDownIcon, ChevronUpIcon, Trash2Icon, PlusIcon, LoaderCircleIcon } from 'lucide-vue-next'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import duration from 'dayjs/plugin/duration'
import 'dayjs/locale/es'

dayjs.extend(relativeTime)
dayjs.extend(duration)
dayjs.locale('es')

const props = defineProps<{
  entityType: TimeEntityType
  entityId: string
}>()

const entityTypeRef  = computed(() => props.entityType)
const entityIdRef    = computed(() => props.entityId)

const { data: summary, isLoading } = useTimeSummary(entityTypeRef, entityIdRef)
const { deleteEntry, logManual }   = useTimeTrackingMutations()
const toast = useToast()

const isExpanded   = ref(false)
const showLogForm  = ref(false)
const logMinutes   = ref<number | null>(null)
const logNote      = ref('')

// ── Actions ─────────────────────────────────────────────────────────

async function handleDelete(entryId: string) {
  try {
    await deleteEntry.mutateAsync({
      id: entryId,
      entityType: props.entityType,
      entityId: props.entityId,
    })
    toast.success('Entrada eliminada')
  } catch {
    toast.error('No se pudo eliminar')
  }
}

async function handleLogManual() {
  if (!logMinutes.value || logMinutes.value < 1) return
  try {
    await logManual.mutateAsync({
      entityType: props.entityType,
      entityId: props.entityId,
      minutes: logMinutes.value,
      note: logNote.value || undefined,
    })
    logMinutes.value = null
    logNote.value    = ''
    showLogForm.value = false
    toast.success('Tiempo registrado')
  } catch {
    toast.error('No se pudo registrar el tiempo')
  }
}

function entryDuration(entry: { minutes?: number | null; startedAt: string; endedAt?: string | null }) {
  if (entry.minutes != null) return formatMinutes(entry.minutes)
  if (!entry.endedAt) return 'En curso'
  const mins = Math.round((new Date(entry.endedAt).getTime() - new Date(entry.startedAt).getTime()) / 60000)
  return formatMinutes(mins)
}
</script>

<template>
  <div class="rounded-lg border border-border">
    <!-- Header / toggle -->
    <button
      class="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/40 transition-colors rounded-lg"
      @click="isExpanded = !isExpanded"
    >
      <span class="flex items-center gap-2">
        <span>Tiempo</span>
        <span v-if="summary" class="text-xs text-muted-foreground font-normal">
          {{ formatMinutes(summary.loggedMinutes) }} registrado
        </span>
        <LoaderCircleIcon v-if="isLoading" class="h-3 w-3 animate-spin text-muted-foreground" />
      </span>
      <ChevronDownIcon v-if="!isExpanded" class="h-4 w-4 text-muted-foreground" />
      <ChevronUpIcon   v-else              class="h-4 w-4 text-muted-foreground" />
    </button>

    <div v-if="isExpanded" class="border-t border-border px-3 pb-3 space-y-3 pt-2">
      <!-- Progress bar -->
      <TimeProgressBar
        v-if="summary"
        :logged-minutes="summary.loggedMinutes"
        :estimated-minutes="summary.estimatedMinutes"
      />

      <!-- Entries list -->
      <div v-if="summary && summary.entries.length > 0" class="space-y-1">
        <div
          v-for="entry in summary.entries"
          :key="entry.id"
          class="flex items-start gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted/40 group"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium tabular-nums">{{ entryDuration(entry) }}</span>
              <span class="text-muted-foreground">{{ dayjs(entry.startedAt).fromNow() }}</span>
              <span v-if="entry.active"
                    class="rounded-full bg-green-500/20 text-green-600 dark:text-green-400 px-1.5 py-0.5 font-medium">
                En curso
              </span>
            </div>
            <p v-if="entry.note" class="text-muted-foreground mt-0.5 truncate">{{ entry.note }}</p>
          </div>
          <button
            v-if="!entry.active"
            class="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 hover:text-red-500 transition-all"
            :disabled="deleteEntry.isPending.value"
            @click.stop="handleDelete(entry.id)"
          >
            <Trash2Icon class="h-3 w-3" />
          </button>
        </div>
      </div>

      <p v-else-if="summary && !isLoading" class="text-xs text-muted-foreground italic">
        Sin entradas de tiempo registradas.
      </p>

      <!-- Manual log form -->
      <div v-if="showLogForm" class="space-y-2 rounded-lg border border-border p-2 bg-muted/20">
        <div class="flex gap-2">
          <input
            v-model.number="logMinutes"
            type="number"
            min="1"
            placeholder="Minutos"
            class="w-24 rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            v-model="logNote"
            type="text"
            placeholder="Nota (opcional)"
            class="flex-1 rounded border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div class="flex gap-2">
          <button
            class="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            :disabled="!logMinutes || logManual.isPending.value"
            @click="handleLogManual"
          >
            Guardar
          </button>
          <button
            class="rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            @click="showLogForm = false; logMinutes = null; logNote = ''"
          >
            Cancelar
          </button>
        </div>
      </div>

      <!-- Add manual entry button -->
      <button
        v-if="!showLogForm"
        class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        @click="showLogForm = true"
      >
        <PlusIcon class="h-3 w-3" />
        Agregar tiempo manualmente
      </button>
    </div>
  </div>
</template>
