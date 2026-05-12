<script setup lang="ts">
import { ref, computed } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'

interface Props {
  modelValue?: string | number
  label?: string
  placeholder?: string
  type?: string
  error?: string
  hint?: string
  disabled?: boolean
  required?: boolean
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  required: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showPassword = ref(false)

const inputType = computed(() => {
  if (props.type === 'password') {
    return showPassword.value ? 'text' : 'password'
  }
  return props.type
})

const inputId = computed(() => props.id ?? `input-${Math.random().toString(36).slice(2)}`)
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label
      v-if="label"
      :for="inputId"
      class="text-sm font-medium text-[var(--text)]"
    >
      {{ label }}
      <span v-if="required" class="text-[var(--danger)] ml-0.5">*</span>
    </label>

    <div class="relative">
      <div v-if="$slots.icon" class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[var(--text-muted)]">
        <slot name="icon" />
      </div>

      <input
        :id="inputId"
        :type="inputType"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :class="[
          'w-full bg-[var(--surface)] text-[var(--text)] border rounded-[var(--radius)] px-3 py-2 text-sm transition-all duration-150',
          'placeholder:text-[var(--text-placeholder)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--surface-raised)]',
          error ? 'border-[var(--danger)] focus:ring-[var(--danger)]/20 focus:border-[var(--danger)]' : 'border-[var(--border)]',
          $slots.icon ? 'pl-10' : '',
          type === 'password' ? 'pr-10' : ''
        ]"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />

      <button
        v-if="type === 'password'"
        type="button"
        class="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        tabindex="-1"
        @click="showPassword = !showPassword"
      >
        <EyeOff v-if="showPassword" class="w-4 h-4" />
        <Eye v-else class="w-4 h-4" />
      </button>
    </div>

    <p v-if="error" class="text-xs text-[var(--danger)] flex items-center gap-1">
      <svg class="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      {{ error }}
    </p>
    <p v-else-if="hint" class="text-xs text-[var(--text-muted)]">{{ hint }}</p>
  </div>
</template>
