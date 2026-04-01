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
  { id: '1', title: 'Branch Down Alert', message: 'Farmacia San Pablo — Sucursal Norte no está respondiendo. Revisa la conexión.', type: 'ERROR', read: false, createdAt: new Date(Date.now() - 900000).toISOString() },
  { id: '2', title: 'Ticket Asignado', message: 'Ticket #1234 te fue asignado: "POS no imprime recibos". Prioridad alta.', type: 'INFO', read: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '3', title: 'Licencia por Vencer', message: 'La licencia de Oxxo Sucursal Norte vence en 7 días. Renueva antes de que expire.', type: 'WARNING', read: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: '4', title: 'Nuevo Cliente Registrado', message: 'Supermercado Familia fue registrado exitosamente como cliente nuevo.', type: 'SUCCESS', read: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '5', title: 'Alta Latencia Detectada', message: 'Oxxo Localidad Polanco reporta 820ms de tiempo de respuesta. Monitorea la conexión.', type: 'WARNING', read: true, createdAt: new Date(Date.now() - 172800000).toISOString() }
]

onMounted(async () => {
  try {
    await notifStore.fetch()
    if (notifStore.items.length === 0) notifStore.items.push(...mockNotifications)
  } catch {
    notifStore.items.push(...mockNotifications)
  }
})

async function handleMarkAllRead() {
  try {
    await notifStore.markAllRead()
    toast.success('Todas las notificaciones marcadas como leídas')
  } catch {
    notifStore.items.forEach(n => { n.read = true })
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

// Static icon map — avoids dynamic class issues with Tailwind v4
type NotifType = Notification['type']

const iconMap: Record<NotifType, typeof Info> = {
  INFO: Info,
  WARNING: AlertTriangle,
  ERROR: XCircle,
  SUCCESS: CheckCircle
}

const styleMap: Record<NotifType, { icon: string; ring: string; dot: string; leftBar: string }> = {
  INFO:    { icon: 'text-blue-500',  ring: 'ring-blue-500/20',  dot: 'bg-blue-500',  leftBar: 'bg-blue-500' },
  WARNING: { icon: 'text-amber-500', ring: 'ring-amber-500/20', dot: 'bg-amber-500', leftBar: 'bg-amber-500' },
  ERROR:   { icon: 'text-red-500',   ring: 'ring-red-500/20',   dot: 'bg-red-500',   leftBar: 'bg-red-500' },
  SUCCESS: { icon: 'text-green-500', ring: 'ring-green-500/20', dot: 'bg-green-500', leftBar: 'bg-green-500' }
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Hace ${hours}h`
  return new Date(dateStr).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
}

const grouped = computed(() => {
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  const byDate: Record<string, Notification[]> = {}

  for (const n of notifStore.items) {
    const d = new Date(n.createdAt).toDateString()
    const label = d === today ? 'Hoy' : d === yesterday ? 'Ayer'
      : new Date(n.createdAt).toLocaleDateString('es-MX', { weekday: 'long', month: 'long', day: 'numeric' })
    if (!byDate[label]) byDate[label] = []
    byDate[label].push(n)
  }

  return Object.entries(byDate).map(([label, items]) => ({ label, items }))
})
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-[var(--text)]">Notificaciones</h1>
        <p class="text-sm text-[var(--text-muted)] mt-0.5">
          <span v-if="notifStore.unreadCount > 0">
            <span class="font-semibold text-[var(--primary)]">{{ notifStore.unreadCount }}</span> sin leer
          </span>
          <span v-else>Todo al día</span>
        </p>
      </div>

      <Button
        v-if="notifStore.unreadCount > 0"
        variant="outline"
        size="sm"
        @click="handleMarkAllRead"
      >
        <CheckCheck class="w-4 h-4" />
        Marcar todo como leído
      </Button>
    </div>

    <!-- Loading -->
    <div v-if="notifStore.loading" class="flex items-center justify-center py-20">
      <Spinner class="w-7 h-7 text-[var(--primary)]" />
    </div>

    <!-- Empty state -->
    <EmptyState
      v-else-if="notifStore.items.length === 0"
      title="Sin notificaciones"
      description="Estás al día. Las nuevas notificaciones aparecerán aquí."
    >
      <template #icon><Bell class="w-6 h-6" /></template>
    </EmptyState>

    <!-- Grupos -->
    <template v-else>
      <div v-for="group in grouped" :key="group.label" class="space-y-2">

        <!-- Separador de grupo -->
        <div class="flex items-center gap-3">
          <span class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">
            {{ group.label }}
          </span>
          <div class="flex-1 h-px bg-[var(--border)]" />
        </div>

        <!-- Items del grupo -->
        <div class="space-y-2">
          <div
            v-for="n in group.items"
            :key="n.id"
            class="group relative flex gap-4 p-4 rounded-xl border transition-all duration-150 cursor-pointer overflow-hidden"
            :class="n.read
              ? 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]'
              : 'bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--bg-subtle)]'"
            @click="!n.read && handleMarkRead(n.id)"
          >
            <!-- Barra de color izquierda (solo unread) -->
            <div
              v-if="!n.read"
              class="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
              :class="styleMap[n.type].leftBar"
            />

            <!-- Ícono -->
            <div class="flex-shrink-0 mt-0.5">
              <div
                class="w-9 h-9 rounded-full flex items-center justify-center ring-2"
                :class="[styleMap[n.type].ring, n.read ? 'bg-[var(--surface-raised)]' : 'bg-[var(--surface-raised)]']"
              >
                <component
                  :is="iconMap[n.type]"
                  class="w-4 h-4"
                  :class="styleMap[n.type].icon"
                />
              </div>
            </div>

            <!-- Contenido -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2 mb-1">
                <p
                  class="text-sm leading-snug"
                  :class="n.read ? 'font-normal text-[var(--text-muted)]' : 'font-semibold text-[var(--text)]'"
                >
                  {{ n.title }}
                </p>

                <div class="flex items-center gap-2 flex-shrink-0 mt-0.5">
                  <!-- Dot unread -->
                  <span
                    v-if="!n.read"
                    class="w-2 h-2 rounded-full flex-shrink-0"
                    :class="styleMap[n.type].dot"
                  />
                  <!-- Timestamp -->
                  <span class="text-xs text-[var(--text-placeholder)] whitespace-nowrap">
                    {{ formatRelativeTime(n.createdAt) }}
                  </span>
                  <!-- Delete button -->
                  <button
                    class="p-1 rounded-md text-[var(--text-placeholder)] hover:text-[var(--danger)] hover:bg-[var(--surface-raised)] transition-all opacity-0 group-hover:opacity-100"
                    title="Eliminar"
                    @click.stop="handleDelete(n.id)"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p class="text-sm text-[var(--text-muted)] leading-relaxed">
                {{ n.message }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>

  </div>
</template>
