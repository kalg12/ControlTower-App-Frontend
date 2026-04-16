<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ShieldAlertIcon, ShieldCheckIcon, ShieldIcon } from 'lucide-vue-next'

const props = defineProps<{
  /** ISO timestamp — SLA deadline */
  dueAt: string
  /** ISO timestamp — ticket creation time (used to compute % consumed) */
  createdAt: string
  /** Whether the SLA has already been marked breached */
  breached?: boolean | null
}>()

// Tick every second to keep the countdown live
const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | null = null

onMounted(() => { ticker = setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => { if (ticker) clearInterval(ticker) })

// ── Computed ────────────────────────────────────────────────────────

const dueMs     = computed(() => new Date(props.dueAt).getTime())
const createdMs = computed(() => new Date(props.createdAt).getTime())
const totalMs   = computed(() => Math.max(dueMs.value - createdMs.value, 1))
const elapsedMs = computed(() => now.value - createdMs.value)
const remainMs  = computed(() => dueMs.value - now.value)

const pctConsumed = computed(() =>
  Math.min(Math.round((elapsedMs.value / totalMs.value) * 100), 100)
)

const isOverdue = computed(() => remainMs.value <= 0 || !!props.breached)

const remainingText = computed(() => {
  if (isOverdue.value) {
    const overMs = Math.abs(remainMs.value)
    const h = Math.floor(overMs / 3_600_000)
    const m = Math.floor((overMs % 3_600_000) / 60_000)
    return h > 0 ? `Vencido hace ${h}h ${m}m` : `Vencido hace ${m}m`
  }
  const h = Math.floor(remainMs.value / 3_600_000)
  const m = Math.floor((remainMs.value % 3_600_000) / 60_000)
  if (h > 0) return `Vence en ${h}h ${m}m`
  return `Vence en ${m}m`
})

/** Tailwind color classes for the progress bar */
const barColor = computed(() => {
  if (isOverdue.value)       return 'bg-red-600'
  if (pctConsumed.value >= 90) return 'bg-red-500'
  if (pctConsumed.value >= 75) return 'bg-orange-500'
  if (pctConsumed.value >= 50) return 'bg-yellow-500'
  return 'bg-green-500'
})

const textColor = computed(() => {
  if (isOverdue.value)       return 'text-red-600 dark:text-red-400'
  if (pctConsumed.value >= 90) return 'text-red-500'
  if (pctConsumed.value >= 75) return 'text-orange-500'
  if (pctConsumed.value >= 50) return 'text-yellow-500 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
})
</script>

<template>
  <div class="space-y-1.5">
    <!-- Label row -->
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-1.5 text-sm font-medium" :class="textColor">
        <ShieldAlertIcon v-if="isOverdue"            class="h-4 w-4" />
        <ShieldCheckIcon v-else-if="pctConsumed < 50" class="h-4 w-4" />
        <ShieldIcon      v-else                       class="h-4 w-4" />
        <span>{{ remainingText }}</span>
      </div>
      <span class="text-xs text-muted-foreground tabular-nums">{{ pctConsumed }}%</span>
    </div>

    <!-- Progress bar -->
    <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-1000"
        :class="barColor"
        :style="{ width: `${pctConsumed}%` }"
      />
    </div>
  </div>
</template>
