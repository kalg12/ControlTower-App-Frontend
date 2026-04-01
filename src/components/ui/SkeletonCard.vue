<script setup lang="ts">
import Skeleton from 'primevue/skeleton'
defineProps<{ lines?: number }>()
</script>
<template>
  <div class="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3">
    <div class="flex items-start justify-between">
      <div class="space-y-2 flex-1">
        <Skeleton height="0.75rem" width="40%" />
        <Skeleton height="2rem" width="30%" />
      </div>
      <Skeleton height="2.25rem" width="2.25rem" border-radius="0.5rem" />
    </div>
    <template v-if="(lines ?? 0) > 0">
      <Skeleton v-for="i in (lines ?? 1)" :key="i" height="0.6rem" :width="i % 2 === 0 ? '60%' : '80%'" />
    </template>
  </div>
</template>
