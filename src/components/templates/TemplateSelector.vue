<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import { templatesService } from '@/services/templates.service'
import type { ResponseTemplate } from '@/types/templates'
import { FileText, Search, X } from 'lucide-vue-next'

const emit = defineEmits<{ select: [body: string] }>()

const { t } = useI18n()
const open = ref(false)
const q = ref('')
const debouncedQ = ref('')
let debounce: ReturnType<typeof setTimeout>

watch(q, (val) => {
  clearTimeout(debounce)
  debounce = setTimeout(() => { debouncedQ.value = val }, 250)
})

const { data } = useQuery({
  queryKey: computed(() => ['template-selector', debouncedQ.value]),
  queryFn: () => templatesService.list({ q: debouncedQ.value || undefined, size: 30 }),
  staleTime: 60_000,
  enabled: computed(() => open.value)
})

const templates = computed(() => data.value?.content ?? [])

function pick(tpl: ResponseTemplate) {
  emit('select', tpl.body)
  open.value = false
  q.value = ''
}

function toggle() {
  open.value = !open.value
  if (open.value) q.value = ''
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      :title="t('templates.insertTemplate')"
      class="p-1.5 rounded hover:bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
      @click="toggle"
    >
      <FileText class="w-4 h-4" />
    </button>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition-all duration-150"
      leave-active-class="transition-all duration-100"
      enter-from-class="opacity-0 scale-95"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="open"
        class="absolute bottom-full left-0 mb-2 w-80 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
          <span class="text-xs font-semibold text-[var(--text)]">{{ t('templates.title') }}</span>
          <button class="text-[var(--text-muted)] hover:text-[var(--text)]" @click="open = false">
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Search -->
        <div class="px-3 py-2 border-b border-[var(--border)] relative">
          <Search class="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            v-model="q"
            type="text"
            :placeholder="t('common.search')"
            class="w-full pl-7 pr-3 py-1 text-xs rounded bg-[var(--surface-raised)] text-[var(--text)] placeholder-[var(--text-placeholder)] outline-none"
          />
        </div>

        <!-- Results -->
        <div class="max-h-60 overflow-y-auto">
          <div v-if="templates.length === 0" class="py-6 text-center text-xs text-[var(--text-muted)]">
            {{ t('templates.empty') }}
          </div>
          <button
            v-for="tpl in templates"
            :key="tpl.id"
            class="w-full text-left px-3 py-2.5 hover:bg-[var(--surface-raised)] transition-colors border-b border-[var(--border)] last:border-0"
            @click="pick(tpl)"
          >
            <p class="text-xs font-medium text-[var(--text)] truncate">{{ tpl.name }}</p>
            <p class="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{{ tpl.body }}</p>
            <span v-if="tpl.shortcut" class="text-[10px] text-[var(--primary)]">/{{ tpl.shortcut }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>
