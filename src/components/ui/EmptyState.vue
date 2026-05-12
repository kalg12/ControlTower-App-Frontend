<script setup lang="ts">
import { Inbox } from 'lucide-vue-next'

interface Props {
  title: string
  description?: string
  actionLabel?: string
  icon?: boolean
}

withDefaults(defineProps<Props>(), {
  icon: true
})
const emit = defineEmits<{ action: [] }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div v-if="icon || $slots.icon" class="w-12 h-12 rounded-full bg-[var(--surface-raised)] flex items-center justify-center mb-4">
      <slot name="icon">
        <Inbox class="w-6 h-6 text-[var(--text-muted)]" />
      </slot>
    </div>
    <h3 class="text-sm font-semibold text-[var(--text)] mb-1">{{ title }}</h3>
    <p v-if="description" class="text-sm text-[var(--text-muted)] max-w-xs">{{ description }}</p>
    <button
      v-if="actionLabel"
      class="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[var(--primary)] text-[var(--primary-fg)] rounded-[var(--radius)] hover:bg-[var(--primary-hover)] transition-colors shadow-sm"
      @click="emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>
