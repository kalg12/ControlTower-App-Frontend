<script setup lang="ts">
import { X } from 'lucide-vue-next'

interface Props {
  open: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnBackdrop?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closeOnBackdrop: true
})

const emit = defineEmits<{
  close: []
}>()

const sizeClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl'
}

function handleBackdrop() {
  if (props.closeOnBackdrop) emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="handleBackdrop"
        />

        <Transition
          enter-active-class="transition-all duration-200"
          leave-active-class="transition-all duration-150"
          enter-from-class="opacity-0 scale-95"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            :class="[
              'relative w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl z-10',
              sizeClasses[size]
            ]"
          >
            <div v-if="title || $slots.title" class="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 class="text-base font-semibold text-[var(--text)]">
                <slot name="title">{{ title }}</slot>
              </h2>
              <button
                class="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors"
                @click="emit('close')"
              >
                <X class="w-4 h-4" />
              </button>
            </div>

            <div class="px-5 py-4">
              <slot />
            </div>

            <div v-if="$slots.footer" class="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--border)] bg-[var(--bg-subtle)]">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
