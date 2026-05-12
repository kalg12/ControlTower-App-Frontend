<script setup lang="ts">
interface Props {
  padding?: boolean
  hover?: boolean
  variant?: 'default' | 'subtle' | 'interactive'
}

withDefaults(defineProps<Props>(), {
  padding: true,
  hover: false,
  variant: 'default'
})
</script>

<template>
  <div
    :class="[
      'bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden transition-all duration-150',
      hover ? 'hover:border-[var(--primary)]/40 hover:shadow-sm cursor-pointer' : '',
      variant === 'subtle' ? 'bg-[var(--bg-subtle)]' : '',
      variant === 'interactive' ? 'hover:border-[var(--primary)]/40 hover:shadow-md cursor-pointer active:scale-[0.99]' : ''
    ]"
  >
    <div v-if="$slots.header" class="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
      <slot name="header" />
    </div>

    <div :class="padding ? 'p-5' : ''">
      <slot />
    </div>

    <div v-if="$slots.footer" class="px-5 py-3 border-t border-[var(--border)] bg-[var(--bg-subtle)]">
      <slot name="footer" />
    </div>
  </div>
</template>
