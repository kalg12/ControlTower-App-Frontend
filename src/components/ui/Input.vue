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
          'focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error ? 'border-[var(--danger)] focus:ring-[var(--danger)]' : 'border-[var(--border)]',
          $slots.icon ? 'pl-10' : '',
          type === 'password' ? 'pr-10' : ''
        ]"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />

      <button
        v-if="type === 'password'"
        type="button"
        class="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        @click="showPassword = !showPassword"
      >
        <EyeOff v-if="showPassword" class="w-4 h-4" />
        <Eye v-else class="w-4 h-4" />
      </button>
    </div>

    <p v-if="error" class="text-xs text-[var(--danger)] mt-0.5">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-[var(--text-muted)] mt-0.5">{{ hint }}</p>
  </div>
</template>
