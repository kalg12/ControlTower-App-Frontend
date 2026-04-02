<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Select from 'primevue/select'
import { Menu, Bell, Sun, Moon, ChevronDown, LogOut, Settings, Info, AlertTriangle, XCircle, CheckCircle, CheckCheck } from 'lucide-vue-next'
import { getLocale, setLocale, type LocaleCode } from '@/i18n'
import Avatar from '@/components/ui/Avatar.vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useNotificationsStore } from '@/stores/notifications'
import { useToast } from '@/composables/useToast'
import { wsConnected } from '@/composables/useWebSocket'
import type { Notification } from '@/types/notification'

const emit = defineEmits<{ toggleSidebar: []; toggleCollapse: [] }>()

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const notifStore = useNotificationsStore()
const toast = useToast()

const userMenuOpen = ref(false)
const notifOpen = ref(false)

const pageTitle = computed(() => {
  const tk = route.meta.titleKey as string | undefined
  if (tk) return t(tk)
  return (route.meta.title as string | undefined) ?? t('app.name')
})

const localeModel = computed({
  get: (): LocaleCode => getLocale(),
  set: (v: LocaleCode) => setLocale(v)
})

const localeOptions = computed(() => [
  { label: t('common.english'), value: 'en' as const },
  { label: t('common.spanish'), value: 'es' as const }
])

const recentNotifs = computed(() => notifStore.items.slice(0, 5))

function getNotifIcon(n: Notification): typeof Info {
  const s = (n.severity || n.type || '').toUpperCase()
  if (s === 'ERROR' || s === 'CRITICAL') return XCircle
  if (s === 'WARNING' || s === 'WARN') return AlertTriangle
  if (s === 'SUCCESS') return CheckCircle
  return Info
}

function getNotifDotColor(n: Notification): string {
  const s = (n.severity || n.type || '').toUpperCase()
  if (s === 'ERROR' || s === 'CRITICAL') return 'bg-red-500'
  if (s === 'WARNING' || s === 'WARN') return 'bg-amber-500'
  if (s === 'SUCCESS') return 'bg-green-500'
  return 'bg-blue-500'
}

function getNotifIconColor(n: Notification): string {
  const s = (n.severity || n.type || '').toUpperCase()
  if (s === 'ERROR' || s === 'CRITICAL') return 'text-red-500'
  if (s === 'WARNING' || s === 'WARN') return 'text-amber-500'
  if (s === 'SUCCESS') return 'text-green-500'
  return 'text-blue-500'
}

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

async function markAllRead() {
  try {
    await notifStore.markAllRead()
  } catch {
    notifStore.items.forEach(n => { n.read = true })
  }
}

async function handleLogout() {
  userMenuOpen.value = false
  await authStore.logout()
  router.push('/login')
  toast.success(t('auth.logoutSuccess'))
}

function goToNotif(n: Notification) {
  notifOpen.value = false
  if (!n.read) notifStore.markRead(n.id).catch(() => { n.read = true })
  router.push('/notifications')
}
</script>

<template>
  <header class="h-14 flex items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--surface)] flex-shrink-0 z-30">

    <!-- Left -->
    <div class="flex items-center gap-3">
      <!-- Mobile: open overlay sidebar -->
      <button
        class="lg:hidden p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors"
        @click="emit('toggleSidebar')"
      >
        <Menu class="w-5 h-5" />
      </button>
      <!-- Desktop: collapse/expand sidebar -->
      <button
        class="hidden lg:flex p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors"
        :title="t('header.toggleSidebar')"
        @click="emit('toggleCollapse')"
      >
        <Menu class="w-5 h-5" />
      </button>
      <h1 class="text-sm font-semibold text-[var(--text)]">{{ pageTitle }}</h1>
    </div>

    <!-- Right -->
    <div class="flex items-center gap-1">
      <Select
        v-model="localeModel"
        :options="localeOptions"
        option-label="label"
        option-value="value"
        class="w-[7.5rem] text-xs hidden sm:block"
        :aria-label="t('common.language')"
      />

      <!-- Theme toggle -->
      <button
        class="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors"
        :title="themeStore.isDark ? 'Modo claro' : 'Modo oscuro'"
        @click="themeStore.toggle()"
      >
        <Moon v-if="themeStore.isDark" class="w-4 h-4" />
        <Sun v-else class="w-4 h-4" />
      </button>

      <!-- Live connection indicator -->
      <span
        :class="[
          'w-2 h-2 rounded-full transition-colors duration-500',
          wsConnected ? 'bg-green-400 animate-pulse' : 'bg-[var(--text-placeholder)]'
        ]"
        :title="wsConnected ? 'Real-time connected' : 'Connecting...'"
        :aria-label="wsConnected ? 'Connected' : 'Disconnected'"
      />

      <!-- Notifications dropdown -->
      <div class="relative">
        <button
          class="relative p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors"
          title="Notificaciones"
          @click="notifOpen = !notifOpen; userMenuOpen = false"
        >
          <Bell class="w-4 h-4" />
          <span
            v-if="notifStore.unreadCount > 0"
            class="absolute top-0 right-0 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none"
          >
            {{ notifStore.unreadCount > 9 ? '9+' : notifStore.unreadCount }}
          </span>
        </button>

        <!-- Notif dropdown -->
        <Transition
          enter-active-class="transition-all duration-150"
          leave-active-class="transition-all duration-100"
          enter-from-class="opacity-0 translate-y-1 scale-95"
          leave-to-class="opacity-0 translate-y-1 scale-95"
        >
          <div
            v-if="notifOpen"
            class="absolute right-0 top-full mt-2 w-80 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden origin-top-right"
          >
            <!-- Dropdown header -->
            <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-[var(--text)]">Notificaciones</span>
                <span
                  v-if="notifStore.unreadCount > 0"
                  class="px-1.5 py-0.5 text-[10px] font-bold bg-[var(--primary)] text-white rounded-full leading-none"
                >
                  {{ notifStore.unreadCount }}
                </span>
              </div>
              <button
                v-if="notifStore.unreadCount > 0"
                class="flex items-center gap-1 text-xs text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium transition-colors"
                @click="markAllRead"
              >
                <CheckCheck class="w-3 h-3" />
                Marcar todas
              </button>
            </div>

            <!-- List -->
            <div class="divide-y divide-[var(--border-subtle)] max-h-72 overflow-y-auto">
              <div
                v-for="n in recentNotifs"
                :key="n.id"
                class="flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                :class="!n.read ? 'bg-[var(--bg-subtle)]' : ''"
                @click="goToNotif(n)"
              >
                <!-- Icon -->
                <div class="flex-shrink-0 mt-0.5">
                  <component :is="getNotifIcon(n)" class="w-4 h-4" :class="getNotifIconColor(n)" />
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2">
                    <p class="text-xs font-medium text-[var(--text)] leading-snug line-clamp-1">
                      {{ n.title }}
                    </p>
                    <div class="flex items-center gap-1.5 flex-shrink-0">
                      <span v-if="!n.read" class="w-1.5 h-1.5 rounded-full flex-shrink-0" :class="getNotifDotColor(n)" />
                      <span class="text-[10px] text-[var(--text-placeholder)]">{{ formatTime(n.createdAt) }}</span>
                    </div>
                  </div>
                  <p class="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2 leading-relaxed">{{ n.body }}</p>
                </div>
              </div>

              <!-- Empty state inside dropdown -->
              <div v-if="recentNotifs.length === 0" class="px-4 py-6 text-center">
                <Bell class="w-6 h-6 text-[var(--text-placeholder)] mx-auto mb-2" />
                <p class="text-xs text-[var(--text-muted)]">Sin notificaciones</p>
              </div>
            </div>

            <!-- Footer link -->
            <div class="px-4 py-2.5 border-t border-[var(--border)]">
              <RouterLink
                to="/notifications"
                class="block text-center text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
                @click="notifOpen = false"
              >
                Ver todas las notificaciones
              </RouterLink>
            </div>
          </div>
        </Transition>
      </div>

      <!-- User menu -->
      <div class="relative ml-1">
        <button
          class="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[var(--surface-raised)] transition-colors"
          @click="userMenuOpen = !userMenuOpen; notifOpen = false"
        >
          <Avatar :name="authStore.user?.fullName ?? 'User'" size="xs" />
          <span class="hidden sm:block text-sm text-[var(--text)] font-medium max-w-[120px] truncate">
            {{ authStore.user?.fullName }}
          </span>
          <ChevronDown class="w-3 h-3 text-[var(--text-muted)]" />
        </button>

        <!-- User dropdown -->
        <Transition
          enter-active-class="transition-all duration-150"
          leave-active-class="transition-all duration-100"
          enter-from-class="opacity-0 translate-y-1 scale-95"
          leave-to-class="opacity-0 translate-y-1 scale-95"
        >
          <div
            v-if="userMenuOpen"
            class="absolute right-0 top-full mt-2 w-52 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden origin-top-right"
          >
            <div class="px-4 py-3 border-b border-[var(--border)]">
              <p class="text-sm font-semibold text-[var(--text)] truncate">{{ authStore.user?.fullName }}</p>
              <p class="text-xs text-[var(--text-muted)] truncate mt-0.5">{{ authStore.user?.email }}</p>
            </div>
            <div class="py-1">
              <RouterLink
                to="/settings"
                class="flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors"
                @click="userMenuOpen = false"
              >
                <Settings class="w-4 h-4 text-[var(--text-muted)]" />
                Configuración
              </RouterLink>
              <button
                class="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-[var(--surface-raised)] transition-colors"
                @click="handleLogout"
              >
                <LogOut class="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Click outside to close any dropdown -->
    <div
      v-if="userMenuOpen || notifOpen"
      class="fixed inset-0 z-40"
      @click="userMenuOpen = false; notifOpen = false"
    />
  </header>
</template>
