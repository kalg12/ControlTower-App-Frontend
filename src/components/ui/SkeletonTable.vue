<script setup lang="ts">
import Skeleton from 'primevue/skeleton'
withDefaults(defineProps<{ rows?: number; cols?: number }>(), { rows: 5, cols: 4 })
</script>
<template>
  <div class="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
    <div class="flex items-center gap-6 px-4 py-3.5 border-b border-[var(--border)] bg-[var(--bg-subtle)]">
      <Skeleton v-for="i in cols" :key="i" height="0.7rem" :width="`${70 + i * 15}px`" />
    </div>
    <div v-for="r in rows" :key="r" class="flex items-center gap-6 px-4 py-3.5 border-b border-[var(--border-subtle)] last:border-0">
      <Skeleton v-for="i in cols" :key="i" height="0.8rem" :width="`${60 + (r * i * 11) % 120}px`" />
    </div>
  </div>
</template>
