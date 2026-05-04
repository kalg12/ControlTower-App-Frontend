<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
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
const triggerRef = ref<HTMLButtonElement | null>(null)
const dropdownPos = ref({ bottom: '0px', right: '0px' })
let debounceTimer: ReturnType<typeof setTimeout>

watch(q, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { debouncedQ.value = val }, 250)
})

const { data } = useQuery({
  queryKey: computed(() => ['template-selector', debouncedQ.value]),
  queryFn: () => templatesService.list({ q: debouncedQ.value || undefined, size: 30 }),
  staleTime: 60_000,
  enabled: computed(() => open.value),
})

const templates = computed(() => data.value?.content ?? [])

function computePosition() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  dropdownPos.value = {
    bottom: `${window.innerHeight - rect.top + 6}px`,
    right:  `${window.innerWidth - rect.right}px`,
  }
}

function toggle() {
  if (!open.value) {
    computePosition()
    q.value = ''
    debouncedQ.value = ''
  }
  open.value = !open.value
}

function pick(tpl: ResponseTemplate) {
  emit('select', tpl.body)
  open.value = false
  q.value = ''
}

function onClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (triggerRef.value && !triggerRef.value.contains(target)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', onClickOutside, true))
onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside, true))
</script>

<template>
  <div>
    <button
      ref="triggerRef"
      type="button"
      :title="t('templates.insertTemplate')"
      :class="[
        'p-1.5 rounded transition-colors',
        open
          ? 'bg-[var(--primary)] text-white'
          : 'text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--primary)]'
      ]"
      @click="toggle"
    >
      <FileText class="w-4 h-4" />
    </button>

    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-150 ease-out"
        leave-active-class="transition-all duration-100 ease-in"
        enter-from-class="opacity-0 translate-y-1"
        leave-to-class="opacity-0 translate-y-1"
      >
        <div
          v-if="open"
          :style="{ position: 'fixed', bottom: dropdownPos.bottom, right: dropdownPos.right, zIndex: 9999 }"
          class="w-80 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[var(--surface-raised)]">
            <span class="text-xs font-semibold text-[var(--text)]">{{ t('templates.title') }}</span>
            <button
              class="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              @click="open = false"
            >
              <X class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Search -->
          <div class="px-3 py-2 border-b border-[var(--border)] relative">
            <Search class="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
            <input
              v-model="q"
              type="text"
              :placeholder="t('common.search')"
              class="w-full pl-7 pr-3 py-1 text-xs rounded bg-[var(--surface-raised)] text-[var(--text)] placeholder-[var(--text-muted)] outline-none border border-transparent focus:border-[var(--primary)] transition-colors"
              autofocus
            />
          </div>

          <!-- Results -->
          <div class="max-h-64 overflow-y-auto">
            <div
              v-if="templates.length === 0"
              class="py-8 text-center text-xs text-[var(--text-muted)]"
            >
              {{ t('templates.empty') }}
            </div>
            <button
              v-for="tpl in templates"
              :key="tpl.id"
              class="w-full text-left px-3 py-2.5 hover:bg-[var(--surface-raised)] transition-colors border-b border-[var(--border)] last:border-0 group"
              @click="pick(tpl)"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs font-medium text-[var(--text)] truncate group-hover:text-[var(--primary)] transition-colors">
                  {{ tpl.name }}
                </p>
                <span
                  v-if="tpl.shortcut"
                  class="text-[10px] text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded font-mono shrink-0"
                >/{{ tpl.shortcut }}</span>
              </div>
              <p class="text-[11px] text-[var(--text-muted)] truncate mt-0.5 leading-relaxed">
                {{ tpl.body }}
              </p>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
