<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import { ticketsService } from '@/services/tickets.service'
import { clientsService } from '@/services/clients.service'
import { kbService } from '@/services/kb.service'
import { Search, MessageSquare, Building2, BookOpen, X } from 'lucide-vue-next'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [val: boolean] }>()

const { t } = useI18n()
const router = useRouter()
const q = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const debouncedQ = ref('')
let debounceTimer: ReturnType<typeof setTimeout>
watch(q, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { debouncedQ.value = val }, 300)
})

watch(() => props.open, (val) => {
  if (val) {
    q.value = ''
    debouncedQ.value = ''
    setTimeout(() => inputRef.value?.focus(), 50)
  }
})

const enabled = computed(() => props.open && debouncedQ.value.trim().length >= 2)

const { data: ticketResults } = useQuery({
  queryKey: computed(() => ['cmd-tickets', debouncedQ.value]),
  queryFn: () => ticketsService.list({ q: debouncedQ.value, size: 5 }),
  enabled,
  staleTime: 10_000
})

const { data: clientResults } = useQuery({
  queryKey: computed(() => ['cmd-clients', debouncedQ.value]),
  queryFn: () => clientsService.list({ search: debouncedQ.value, size: 5 }),
  enabled,
  staleTime: 10_000
})

const { data: kbResults } = useQuery({
  queryKey: computed(() => ['cmd-kb', debouncedQ.value]),
  queryFn: () => kbService.list({ q: debouncedQ.value, status: 'PUBLISHED', size: 5 }),
  enabled,
  staleTime: 10_000
})

const tickets = computed(() => ticketResults.value?.content ?? [])
const clients = computed(() => clientResults.value?.content ?? [])
const kbArticles = computed(() => kbResults.value?.content ?? [])
const hasResults = computed(() => tickets.value.length > 0 || clients.value.length > 0 || kbArticles.value.length > 0)

function close() {
  emit('update:open', false)
}

function go(path: string) {
  router.push(path)
  close()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

const statusColor: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CLOSED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  WAITING: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      leave-active-class="transition-opacity duration-100"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div v-if="open" class="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4" @keydown="handleKeydown">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" @click="close" />

        <!-- Panel -->
        <div class="relative w-full max-w-xl bg-[var(--surface)] rounded-xl shadow-2xl border border-[var(--border)] overflow-hidden">
          <!-- Search input -->
          <div class="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
            <Search class="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
            <input
              ref="inputRef"
              v-model="q"
              type="text"
              :placeholder="t('search.placeholder')"
              class="flex-1 bg-transparent outline-none text-[var(--text)] placeholder-[var(--text-placeholder)] text-sm"
            />
            <button class="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors" @click="close">
              <X class="w-4 h-4" />
            </button>
          </div>

          <!-- Results -->
          <div class="max-h-[60vh] overflow-y-auto">
            <div v-if="debouncedQ.length >= 2 && !hasResults" class="py-10 text-center text-sm text-[var(--text-muted)]">
              {{ t('search.noResults') }}
            </div>

            <div v-if="debouncedQ.length < 2" class="py-10 text-center text-sm text-[var(--text-muted)]">
              {{ t('search.typeToSearch') }}
            </div>

            <!-- Tickets -->
            <div v-if="tickets.length > 0">
              <p class="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-placeholder)] border-b border-[var(--border)]">
                <MessageSquare class="inline w-3 h-3 mr-1" />{{ t('nav.tickets') }}
              </p>
              <button
                v-for="ticket in tickets"
                :key="ticket.id"
                class="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-raised)] transition-colors text-left"
                @click="go(`/tickets/${ticket.id}`)"
              >
                <MessageSquare class="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                <span class="flex-1 text-sm text-[var(--text)] truncate">{{ ticket.title }}</span>
                <span :class="['text-[10px] font-semibold px-1.5 py-0.5 rounded-full', statusColor[ticket.status] ?? '']">
                  {{ ticket.status }}
                </span>
              </button>
            </div>

            <!-- Clients -->
            <div v-if="clients.length > 0">
              <p class="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-placeholder)] border-b border-[var(--border)]">
                <Building2 class="inline w-3 h-3 mr-1" />{{ t('nav.clients') }}
              </p>
              <button
                v-for="client in clients"
                :key="client.id"
                class="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-raised)] transition-colors text-left"
                @click="go(`/clients/${client.id}`)"
              >
                <Building2 class="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                <span class="flex-1 text-sm text-[var(--text)] truncate">{{ client.name }}</span>
                <span class="text-xs text-[var(--text-muted)]">{{ client.email }}</span>
              </button>
            </div>

            <!-- KB Articles -->
            <div v-if="kbArticles.length > 0">
              <p class="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-placeholder)] border-b border-[var(--border)]">
                <BookOpen class="inline w-3 h-3 mr-1" />{{ t('nav.knowledgeBase') }}
              </p>
              <button
                v-for="article in kbArticles"
                :key="article.id"
                class="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-raised)] transition-colors text-left"
                @click="go(`/knowledge-base/${article.id}`)"
              >
                <BookOpen class="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                <span class="flex-1 text-sm text-[var(--text)] truncate">{{ article.title }}</span>
                <span class="text-xs text-[var(--text-muted)]">{{ article.category }}</span>
              </button>
            </div>
          </div>

          <!-- Footer hint -->
          <div class="px-4 py-2 border-t border-[var(--border)] flex items-center gap-3 text-[10px] text-[var(--text-placeholder)]">
            <span><kbd class="font-mono bg-[var(--surface-raised)] px-1.5 py-0.5 rounded">↵</kbd> {{ t('search.select') }}</span>
            <span><kbd class="font-mono bg-[var(--surface-raised)] px-1.5 py-0.5 rounded">Esc</kbd> {{ t('search.close') }}</span>
            <span class="ml-auto"><kbd class="font-mono bg-[var(--surface-raised)] px-1.5 py-0.5 rounded">⌘K</kbd></span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
