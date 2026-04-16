<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useTimeSummary } from '@/queries/time-tracking'
import TimeProgressBar from '@/components/time/TimeProgressBar.vue'

const props = defineProps<{
  ticketId: string
  estimatedMinutes?: number | null
}>()

const entityType = computed(() => 'TICKET' as const)
const entityId = toRef(props, 'ticketId')

const { data: summary } = useTimeSummary(entityType, entityId)

const logged = computed(() => summary.value?.loggedMinutes ?? 0)
</script>

<template>
  <div v-if="estimatedMinutes && estimatedMinutes > 0" class="mt-1.5 px-0.5">
    <TimeProgressBar :logged-minutes="logged" :estimated-minutes="estimatedMinutes" />
  </div>
</template>
