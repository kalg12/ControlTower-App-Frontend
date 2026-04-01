<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  dot?: boolean
  size?: 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  dot: false,
  size: 'sm'
})

const variantClasses: Record<string, string> = {
  default: 'bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--border)]',
  success: 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900',
  danger: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900',
  info: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900',
  purple: 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-900'
}

const dotColors: Record<string, string> = {
  default: 'bg-[var(--text-muted)]',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  purple: 'bg-purple-500'
}

const sizeClasses: Record<string, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm'
}

const classes = computed(() =>
  `inline-flex items-center gap-1.5 font-medium rounded-full ${variantClasses[props.variant]} ${sizeClasses[props.size]}`
)
</script>

<template>
  <span :class="classes">
    <span
      v-if="dot"
      :class="['w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant ?? 'default']]"
    />
    <slot />
  </span>
</template>
