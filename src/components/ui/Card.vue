<script setup lang="ts">
interface Props {
  padding?: boolean
  hover?: boolean
}

withDefaults(defineProps<Props>(), {
  padding: true,
  hover: false
})
</script>

<template>
  <div
    :class="[
      'bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] overflow-hidden',
      hover ? 'hover:border-[var(--primary)] transition-colors duration-150 cursor-pointer' : ''
    ]"
  >
    <div v-if="$slots.header" class="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
      <slot name="header" />
    </div>

    <div :class="padding ? 'p-4' : ''">
      <slot />
    </div>

    <div v-if="$slots.footer" class="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-subtle)]">
      <slot name="footer" />
    </div>
  </div>
</template>
