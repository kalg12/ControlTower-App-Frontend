<script setup lang="ts">
import { computed } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { notificationsService } from '@/services/notifications.service'
import { useToast } from '@/composables/useToast'
import Button from '@/components/ui/Button.vue'
import Skeleton from 'primevue/skeleton'
import EmptyState from '@/components/ui/EmptyState.vue'
import { Bell, CheckCheck, Info, AlertTriangle, XCircle, CheckCircle, Trash2 } from 'lucide-vue-next'
import type { Notification } from '@/types/notification'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const toast = useToast()
const queryClient = useQueryClient()

const { data: page, isLoading } = useQuery({
  queryKey: ['notifications'],
  queryFn: () => notificationsService.list({ page: 0, size: 50 }),
  staleTime: 10000
})

const items = computed(() => page.value?.content ?? [])
const unreadCount = computed(() => items.value.filter(n => !n.read).length)

async function handleMarkAllRead() {
  try {
    await notificationsService.markAllRead()
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    toast.success('All notifications marked as read')
  } catch {
    toast.error('Failed to mark all as read')
  }
}

async function handleMarkRead(id: string) {
  try {
    await notificationsService.markRead(id)
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  } catch { /* ignore */ }
}

async function handleDelete(id: string) {
  try {
    await notificationsService.remove(id)
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  } catch {
    toast.error('Failed to delete notification')
  }
}

// severity/type → icon & style
function getStyle(type: string, severity: string): { icon: typeof Info; iconClass: string; ring: string; dot: string; leftBar: string } {
  const s = (severity || type || '').toUpperCase()
  if (s === 'ERROR' || s === 'CRITICAL') return { icon: XCircle, iconClass: 'text-red-500', ring: 'ring-red-500/20', dot: 'bg-red-500', leftBar: 'bg-red-500' }
  if (s === 'WARNING' || s === 'WARN') return { icon: AlertTriangle, iconClass: 'text-amber-500', ring: 'ring-amber-500/20', dot: 'bg-amber-500', leftBar: 'bg-amber-500' }
  if (s === 'SUCCESS') return { icon: CheckCircle, iconClass: 'text-green-500', ring: 'ring-green-500/20', dot: 'bg-green-500', leftBar: 'bg-green-500' }
  return { icon: Info, iconClass: 'text-blue-500', ring: 'ring-blue-500/20', dot: 'bg-blue-500', leftBar: 'bg-blue-500' }
}

function formatRelativeTime(dateStr: string): string {
  return dayjs(dateStr).fromNow()
}

const grouped = computed(() => {
  const today = dayjs().format('YYYY-MM-DD')
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
  const byDate: Record<string, Notification[]> = {}

  for (const n of items.value) {
    const d = dayjs(n.createdAt).format('YYYY-MM-DD')
    const label = d === today ? 'Today' : d === yesterday ? 'Yesterday'
      : dayjs(n.createdAt).format('dddd, DD MMM YYYY')
    if (!byDate[label]) byDate[label] = []
    byDate[label].push(n)
  }

  return Object.entries(byDate).map(([label, notifs]) => ({ label, notifs }))
})
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-[var(--text)]">Notifications</h1>
        <p class="text-sm text-[var(--text-muted)] mt-0.5">
          <span v-if="unreadCount > 0">
            <span class="font-semibold text-[var(--primary)]">{{ unreadCount }}</span> unread
          </span>
          <span v-else>All caught up</span>
        </p>
      </div>

      <Button
        v-if="unreadCount > 0"
        variant="outline"
        size="sm"
        @click="handleMarkAllRead"
      >
        <CheckCheck class="w-4 h-4" />
        Mark all as read
      </Button>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-2">
      <div v-for="i in 5" :key="i" class="flex gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <Skeleton shape="circle" height="2.25rem" width="2.25rem" />
        <div class="flex-1 space-y-2">
          <Skeleton height="0.875rem" width="60%" />
          <Skeleton height="0.75rem" width="85%" />
          <Skeleton height="0.625rem" width="30%" />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <EmptyState
      v-else-if="items.length === 0"
      title="No notifications"
      description="You're all caught up. New notifications will appear here."
    >
      <template #icon><Bell class="w-6 h-6" /></template>
    </EmptyState>

    <!-- Grouped list -->
    <template v-else>
      <div v-for="group in grouped" :key="group.label" class="space-y-2">

        <!-- Group separator -->
        <div class="flex items-center gap-3">
          <span class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">
            {{ group.label }}
          </span>
          <div class="flex-1 h-px bg-[var(--border)]" />
        </div>

        <!-- Items -->
        <div class="space-y-2">
          <div
            v-for="n in group.notifs"
            :key="n.id"
            class="group relative flex gap-4 p-4 rounded-xl border transition-all duration-150 cursor-pointer overflow-hidden"
            :class="n.read
              ? 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]'
              : 'bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--bg-subtle)]'"
            @click="!n.read && handleMarkRead(n.id)"
          >
            <!-- Left color bar (unread only) -->
            <div
              v-if="!n.read"
              class="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
              :class="getStyle(n.type, n.severity).leftBar"
            />

            <!-- Icon -->
            <div class="flex-shrink-0 mt-0.5">
              <div
                class="w-9 h-9 rounded-full flex items-center justify-center ring-2 bg-[var(--surface-raised)]"
                :class="getStyle(n.type, n.severity).ring"
              >
                <component
                  :is="getStyle(n.type, n.severity).icon"
                  class="w-4 h-4"
                  :class="getStyle(n.type, n.severity).iconClass"
                />
              </div>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2 mb-1">
                <p
                  class="text-sm leading-snug"
                  :class="n.read ? 'font-normal text-[var(--text-muted)]' : 'font-semibold text-[var(--text)]'"
                >
                  {{ n.title }}
                </p>

                <div class="flex items-center gap-2 flex-shrink-0 mt-0.5">
                  <!-- Unread dot -->
                  <span
                    v-if="!n.read"
                    class="w-2 h-2 rounded-full flex-shrink-0"
                    :class="getStyle(n.type, n.severity).dot"
                  />
                  <!-- Timestamp -->
                  <span class="text-xs text-[var(--text-placeholder)] whitespace-nowrap">
                    {{ formatRelativeTime(n.createdAt) }}
                  </span>
                  <!-- Delete button -->
                  <button
                    class="p-1 rounded-md text-[var(--text-placeholder)] hover:text-[var(--danger)] hover:bg-[var(--surface-raised)] transition-all opacity-0 group-hover:opacity-100"
                    title="Delete"
                    @click.stop="handleDelete(n.id)"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <!-- body field (not message) -->
              <p class="text-sm text-[var(--text-muted)] leading-relaxed">
                {{ n.body }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>

  </div>
</template>
