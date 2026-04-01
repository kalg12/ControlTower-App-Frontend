<script setup lang="ts">
import { computed } from 'vue'
import Spinner from './Spinner.vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  fullWidth?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
  type: 'button',
  fullWidth: false
})

const classes = computed(() => {
  const base = [
    'inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius)] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] cursor-pointer select-none',
    props.fullWidth ? 'w-full' : '',
    props.disabled || props.loading ? 'opacity-50 cursor-not-allowed' : ''
  ]

  const variants: Record<string, string> = {
    primary: 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-fg)] border border-transparent',
    secondary: 'bg-[var(--surface-raised)] hover:bg-[var(--border)] text-[var(--text)] border border-[var(--border)]',
    ghost: 'bg-transparent hover:bg-[var(--surface-raised)] text-[var(--text)] border border-transparent',
    danger: 'bg-[var(--danger)] hover:bg-red-600 text-white border border-transparent',
    outline: 'bg-transparent hover:bg-[var(--surface-raised)] text-[var(--text)] border border-[var(--border)]'
  }

  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs h-7',
    md: 'px-4 py-2 text-sm h-9',
    lg: 'px-5 py-2.5 text-base h-11'
  }

  return [...base, variants[props.variant], sizes[props.size]].filter(Boolean).join(' ')
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="classes"
  >
    <Spinner v-if="loading" class="w-4 h-4" />
    <slot />
  </button>
</template>
