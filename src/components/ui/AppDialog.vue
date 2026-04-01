<script setup lang="ts">
import Dialog from 'primevue/dialog'

defineProps<{ title: string; subtitle?: string; loading?: boolean }>()
const visible = defineModel<boolean>('visible', { default: false })
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :header="title"
    :closable="!loading"
    modal
    :draggable="false"
    class="w-full max-w-lg"
  >
    <p v-if="subtitle" class="text-sm text-[var(--text-muted)] mb-4 -mt-2">{{ subtitle }}</p>
    <slot />
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </Dialog>
</template>
