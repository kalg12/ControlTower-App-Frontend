<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import { useTimerStore } from '@/stores/timer'
import { useTimeTrackingMutations, useActiveTimer } from '@/queries/time-tracking'
import { useToast } from '@/composables/useToast'
import type { TimeEntityType } from '@/types/time-tracking'
import { PlayIcon, StopCircleIcon, TimerIcon } from 'lucide-vue-next'
import { qk } from '@/queries/keys'

const props = defineProps<{
  entityType: TimeEntityType
  entityId: string
}>()

const toast       = useToast()
const timer       = useTimerStore()
const queryClient = useQueryClient()
const { startTimer, stopTimer } = useTimeTrackingMutations()
const { data: activeTimerData, isLoading: loadingActive } = useActiveTimer()

// Sync store when server responds with active timer
watch(activeTimerData, (entry) => {
  if (entry !== undefined) timer.syncFromServer(entry)
}, { immediate: true })

// Is this widget's entity the one being timed?
const isThisActive = computed(() => timer.isActiveFor(props.entityType, props.entityId))

// ── Actions ─────────────────────────────────────────────────────────

async function handleStart() {
  try {
    const entry = await startTimer.mutateAsync({ entityType: props.entityType, entityId: props.entityId })
    timer.syncFromServer(entry)
  } catch {
    toast.error('No se pudo iniciar el cronómetro')
  }
}

async function handleStop() {
  if (!timer.activeEntry) return
  try {
    const stopped = await stopTimer.mutateAsync({
      id: timer.activeEntry.id,
      entityType: props.entityType,
      entityId: props.entityId,
    })
    timer.syncFromServer(null)
    toast.success(`Tiempo registrado: ${stopped.minutes} min`)
  } catch (err: any) {
    const status = err?.response?.status
    if (status === 400 || status === 404) {
      // Timer was already stopped on the server (stale localStorage entry).
      // Re-sync so the UI reflects reality.
      queryClient.invalidateQueries({ queryKey: qk.activeTimer() })
      timer.syncFromServer(null)
      toast.warning('El cronómetro ya fue detenido')
    } else {
      toast.error('No se pudo detener el cronómetro')
    }
  }
}

onUnmounted(() => {
  // Don't stop the store ticker — another component may still be running
})
</script>

<template>
  <div class="flex items-center gap-3 rounded-lg border px-3 py-2"
       :class="isThisActive
         ? 'border-green-500/40 bg-green-500/5 dark:bg-green-500/10'
         : 'border-border bg-muted/30'">

    <!-- Timer icon + elapsed -->
    <div class="flex items-center gap-1.5 min-w-[88px]">
      <TimerIcon class="h-4 w-4 shrink-0"
                 :class="isThisActive ? 'text-green-500 animate-pulse' : 'text-muted-foreground'" />
      <span class="font-mono text-sm tabular-nums"
            :class="isThisActive ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-muted-foreground'">
        {{ isThisActive ? timer.formattedElapsed : '00:00:00' }}
      </span>
    </div>

    <!-- Controls -->
    <div class="flex items-center gap-1 ml-auto">
      <button v-if="!isThisActive"
              class="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium
                     bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              :disabled="startTimer.isPending.value || loadingActive"
              @click="handleStart">
        <PlayIcon class="h-3 w-3" />
        Iniciar
      </button>

      <button v-if="isThisActive"
              class="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium
                     bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              :disabled="stopTimer.isPending.value || loadingActive"
              @click="handleStop">
        <StopCircleIcon class="h-3 w-3" />
        Detener
      </button>
    </div>

    <!-- Other entity running indicator -->
    <div v-if="timer.isRunning && !isThisActive"
         class="text-xs text-amber-600 dark:text-amber-400 italic">
      Timer activo en otro elemento
    </div>
  </div>
</template>
