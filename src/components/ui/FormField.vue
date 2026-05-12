<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  label: string
  name: string
  error?: string
  required?: boolean
  hint?: string
}

const props = defineProps<Props>()

const inputId = computed(() => `field-${props.name}`)
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between">
      <label :for="inputId" class="text-sm font-medium text-[var(--text)]">
        {{ label }}
        <span v-if="required" class="text-[var(--danger)] ml-0.5">*</span>
      </label>
      <span v-if="hint" class="text-[11px] text-[var(--text-placeholder)]">{{ hint }}</span>
    </div>
    <slot :id="inputId" />
    <p v-if="error" class="text-xs text-[var(--danger)] flex items-center gap-1">
      <svg class="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      {{ error }}
    </p>
  </div>
</template>
