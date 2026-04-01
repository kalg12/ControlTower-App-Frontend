<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useNotificationsStore } from '@/stores/notifications'
import { useToast } from '@/composables/useToast'
import Button from '@/components/ui/Button.vue'
import Spinner from '@/components/ui/Spinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { Bell, CheckCheck, Info, AlertTriangle, XCircle, CheckCircle, Trash2 } from 'lucide-vue-next'
import type { Notification } from '@/types/notification'

const notifStore = useNotificationsStore()
const toast = useToast()

const mockNotifications: Notification[] = [
  { id: '1', title: 'Branch Down Alert', message: 'Farmacia San Pablo - Sucursal Norte is not responding.', type: 'ERROR', read: false, createdAt: new Date(Date.now() - 900000).toISOString() },
  { id: '2', title: 'Ticket Assigned', message: 'Ticket #1234 has been assigned to you: "POS not printing receipts"', type: 'INFO', read: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '3', title: 'License Expiring Soon', message: 'Oxxo Sucursal Norte license expires in 7 days.', type: 'WARNING', read: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: '4', title: 'New Client Added', message: 'Supermercado Familia has been registered as a new client.', type: 'SUCCESS', read: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '5', title: 'High Latency Detected', message: 'Oxxo Localidad Polanco reporting 820ms response time.', type: 'WARNING', read: true, createdAt: new Date(Date.now() - 172800000).toISOString() }
]

onMounted(async () => {
  try {
    await notifStore.fetch()
    if (notifStore.items.length === 0) {
      notifStore.items.push(...mockNotifications)
    }
  } catch {
    notifStore.items.push(...mockNotifications)
  }
})

async function handleMarkAllRead() {
  try {
    await notifStore.markAllRead()
    toast.success('All notifications marked as read')
  } catch {
    toast.error('Failed to mark all as read')
  }
}

async function handleMarkRead(id: string) {
  try {
    await notifStore.markRead(id)
  } catch {
    const item = notifStore.items.find(n => n.id === id)
    if (item) item.read = true
  }
}

async function handleDelete(id: string) {
  try {
    await notifStore.remove(id)
  } catch {
    notifStore.items = notifStore.items.filter(n => n.id !== id)
  }
}

function typeIcon(type: Notification['type']) {
  const icons = { INFO: Info, WARNING: AlertTriangle, ERROR: XCircle, SUCCESS: CheckCircle }
  return icons[type] ?? Info
}

function typeColor(type: Notification['type']): string {
  const map: Record<string, string> = {
    INFO: 'text-blue-500',
    WARNING: 'text-amber-500',
    ERROR: 'text-red-500',
    SUCCESS: 'text-green-500'
  }
  return map[type] ?? 'text-[var(--text-muted)]'
}

function typeBg(type: Notification['type']): string {
  const map: Record<string, string> = {
    INFO: 'bg-blue-50 dark:bg-blue-950',
    WARNING: 'bg-amber-50 dark:bg-amber-950',
    ERROR: 'bg-red-50 dark:bg-red-950',
    SUCCESS: 'bg-green-50 dark:bg-green-950'
  }
  return map[type] ?? 'bg-[var(--surface-raised)]'
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(dateStr).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
}

// Group by day
const grouped = computed(() => {
  const groups: { label: string; items: Notification[] }[] = []
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()

  const byDate = notifStore.items.reduce((acc, n) => {
    const d = new Date(n.createdAt).toDateString()
    const label = d === today ? 'Today' : d === yesterday ? 'Yesterday' : new Date(n.createdAt).toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' })
    if (!acc[label]) acc[label] = []
    acc[label].push(n)
    return acc
  }, {} as Record<string, Notification[]>)

  for (const [label, items] of Object.entries(byDate)) {
    groups.push({ label, items })
  }
  return groups
})
</script>

<template>
  <div class="space-y-4 max-w-2xl">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">Notifications</h2>
        <p class="text-sm text-[var(--text-muted)]">
          {{ notifStore.unreadCount }} unread
        </p>
      </div>
      <Button
        v-if="notifStore.unreadCount > 0"
        variant="outline"
        size="sm"
        @click="handleMarkAllRead"
      >
        <CheckCheck class="w-4 h-4" />
        Mark all read
      </Button>
    </div>

    <!-- Loading -->
    <div v-if="notifStore.loading" class="flex items-center justify-center py-16">
      <Spinner class="w-7 h-7 text-[var(--primary)]" />
    </div>

    <!-- Empty state -->
    <EmptyState
      v-else-if="notifStore.items.length === 0"
      title="No notifications"
      description="You're all caught up! New notifications will appear here."
    >
      <template #icon><Bell class="w-6 h-6" /></template>
    </EmptyState>

    <!-- Grouped notifications -->
    <template v-else>
      <div v-for="group in grouped" :key="group.label" class="space-y-2">
        <h3 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">
          {{ group.label }}
        </h3>

        <div class="space-y-1">
          <div
            v-for="notification in group.items"
            :key="notification.id"
            :class="[
              'flex items-start gap-3 p-3 rounded-[var(--radius)] border transition-all duration-150 group cursor-pointer',
              notification.read
                ? 'bg-[var(--surface)] border-[var(--border)]'
                : 'bg-[var(--surface)] border-[var(--border)] ring-1 ring-[var(--primary)]/20'
            ]"
            @click="!notification.read && handleMarkRead(notification.id)"
          >
            <!-- Icon -->
            <div :class="['w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', typeBg(notification.type)]">
              <component :is="typeIcon(notification.type)" :class="['w-4 h-4', typeColor(notification.type)]" />
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <p :class="['text-sm font-medium', notification.read ? 'text-[var(--text-muted)]' : 'text-[var(--text)]']">
                  {{ notification.title }}
                </p>
                <div class="flex items-center gap-1 flex-shrink-0">
                  <span v-if="!notification.read" class="w-1.5 h-1.5 rounded-full bg-[var(--primary)] flex-shrink-0" />
                  <button
                    class="p-1 rounded text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors opacity-0 group-hover:opacity-100"
                    @click.stop="handleDelete(notification.id)"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p class="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{{ notification.message }}</p>
              <p class="text-xs text-[var(--text-placeholder)] mt-1">{{ formatRelativeTime(notification.createdAt) }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
