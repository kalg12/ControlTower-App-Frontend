<script setup lang="ts">
import { computed } from 'vue'
import { formatMinutes } from '@/types/time-tracking'

const props = defineProps<{
  loggedMinutes: number
  estimatedMinutes?: number | null
}>()

const pct = computed(() => {
  if (!props.estimatedMinutes || props.estimatedMinutes <= 0) return null
  return Math.round((props.loggedMinutes / props.estimatedMinutes) * 100)
})

const barWidth = computed(() =>
  pct.value === null ? 0 : Math.min(pct.value, 100)
)

const barColor = computed(() => {
  if (pct.value === null) return 'bg-blue-500'
  if (pct.value > 100) return 'bg-red-500'
  if (pct.value > 85)  return 'bg-orange-500'
  return 'bg-blue-500'
})
</script>

<template>
  <div class="space-y-1">
    <div class="flex items-center justify-between text-xs text-muted-foreground">
      <span>Registrado: <strong class="text-foreground">{{ formatMinutes(loggedMinutes) }}</strong></span>
      <span v-if="estimatedMinutes">
        Estimado: <strong class="text-foreground">{{ formatMinutes(estimatedMinutes) }}</strong>
        <span :class="pct! > 100 ? 'text-red-500 font-semibold ml-1' : 'ml-1'">({{ pct }}%)</span>
      </span>
      <span v-else class="italic">Sin estimación</span>
    </div>

    <div v-if="estimatedMinutes" class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-500"
        :class="barColor"
        :style="{ width: `${barWidth}%` }"
      />
    </div>
  </div>
</template>
