<script setup lang="ts">
import { ref } from 'vue'
import Popover from 'primevue/popover'
import { Info } from 'lucide-vue-next'

defineProps<{
  title: string
  description: string
}>()

const popover = ref()
function toggle(e: Event) {
  popover.value.toggle(e)
}
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center justify-center w-6 h-6 rounded-full text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors shrink-0"
    :aria-label="title"
    @click.stop="toggle"
  >
    <Info class="w-4 h-4" />
  </button>

  <Popover ref="popover">
    <div class="p-1 max-w-xs w-72">
      <p class="text-sm font-semibold text-[var(--text)] mb-1.5">{{ title }}</p>
      <p class="text-sm text-[var(--text-muted)] leading-relaxed">{{ description }}</p>
    </div>
  </Popover>
</template>
