<script setup lang="ts">
import Skeleton from 'primevue/skeleton'
defineProps<{ rows?: number; cols?: number }>()
</script>
<template>
  <div class="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
    <!-- Header -->
    <div class="flex items-center gap-4 px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-raised)]">
      <Skeleton v-for="i in (cols ?? 4)" :key="i" height="0.75rem" :width="`${60 + i * 20}px`" />
    </div>
    <!-- Rows -->
    <div v-for="r in (rows ?? 5)" :key="r" class="flex items-center gap-4 px-4 py-3 border-b border-[var(--border-subtle)] last:border-0">
      <Skeleton v-for="i in (cols ?? 4)" :key="i" height="0.875rem" :width="`${50 + (r * i * 13) % 100}px`" />
    </div>
  </div>
</template>
