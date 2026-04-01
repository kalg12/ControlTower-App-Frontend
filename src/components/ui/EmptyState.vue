<script setup lang="ts">
interface Props {
  title: string
  description?: string
  actionLabel?: string
}

defineProps<Props>()
const emit = defineEmits<{ action: [] }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div class="w-12 h-12 rounded-full bg-[var(--surface-raised)] flex items-center justify-center mb-4 text-[var(--text-muted)]">
      <slot name="icon" />
    </div>
    <h3 class="text-sm font-semibold text-[var(--text)] mb-1">{{ title }}</h3>
    <p v-if="description" class="text-sm text-[var(--text-muted)] max-w-xs">{{ description }}</p>
    <button
      v-if="actionLabel"
      class="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--primary)] text-[var(--primary-fg)] rounded-[var(--radius)] hover:bg-[var(--primary-hover)] transition-colors"
      @click="emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>
