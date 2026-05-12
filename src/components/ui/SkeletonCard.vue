<script setup lang="ts">
import Skeleton from 'primevue/skeleton'
withDefaults(defineProps<{ lines?: number }>(), { lines: 0 })
</script>
<template>
  <div class="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 space-y-4">
    <div class="flex items-start justify-between">
      <div class="space-y-3 flex-1">
        <Skeleton height="0.625rem" width="40%" />
        <Skeleton height="1.75rem" width="30%" />
      </div>
      <Skeleton height="2.5rem" width="2.5rem" borderRadius="0.75rem" />
    </div>
    <template v-if="lines > 0">
      <div class="space-y-2">
        <Skeleton v-for="i in lines" :key="i" height="0.5rem" :width="i % 2 === 0 ? '55%' : '75%'" />
      </div>
    </template>
  </div>
</template>
