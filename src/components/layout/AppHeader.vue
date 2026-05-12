<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import { useThemeStore } from '@/stores/theme'
import { getEntityLink, type Notification } from '@/types/notification'
import OverlayPanel from 'primevue/overlaypanel'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Avatar from '@/components/ui/Avatar.vue'
import { Bell, Settings, LogOut, Search, Moon, Sun, Menu } from 'lucide-vue-next'

dayjs.extend(relativeTime)

const emit = defineEmits<{ 'toggle-sidebar': []; 'toggle-collapse': []; 'open-search': [] }>()

const { t, locale } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const notifStore = useNotificationsStore()
const themeStore = useThemeStore()

const userPanel = ref()
const notifPanel = ref()

const locales = computed(() => [
  { label: t('common.spanish'), value: 'es' },
  { label: t('common.english'), value: 'en' },
])

function switchLocale(loc: string) {
  locale.value = loc as any
  localStorage.setItem('locale', loc)
}

function toggleUserPanel(e: Event) {
  userPanel.value?.toggle(e)
}

function toggleNotifPanel(e: Event) {
  notifPanel.value?.toggle(e)
}

watch(locale, (loc) => {
  dayjs.locale(loc === 'es' ? 'es' : 'en')
}, { immediate: true })

function formatNotificationTime(dateStr: string) {
  const date = dayjs(dateStr)
  const now = dayjs()
  const diffMinutes = now.diff(date, 'minute')
  const isEs = locale.value === 'es'
  
  if (diffMinutes < 1) return isEs ? 'Ahora' : 'now'
  if (diffMinutes < 60) return isEs ? `Hace ${diffMinutes} min` : `${diffMinutes}m ago`
  
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return isEs ? `Hace ${diffHours}h` : `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return isEs ? `Hace ${diffDays}d` : `${diffDays}d ago`
  
  return date.format('DD/MM/YYYY HH:mm')
}

async function handleNotificationClick(n: Notification) {
  if (!n.read) {
    await notifStore.markRead(n.id)
  }
  
  const link = getEntityLink(n)
  if (link) {
    notifPanel.value?.hide()
    router.push(link)
  }
}

async function logout() {
  await authStore.logout()
  router.push('/login')
}

const unreadCount = computed(() => notifStore.unreadCount)
</script>

<template>
  <header class="flex items-center justify-between h-14 px-4 border-b border-[var(--border)] bg-[var(--surface)] flex-shrink-0">
    <div class="flex items-center gap-3">
      <!-- Mobile menu toggle -->
      <button
        class="lg:hidden p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors"
        aria-label="Toggle sidebar"
        @click="$emit('toggle-sidebar')"
      >
        <Menu class="w-5 h-5" />
      </button>

      <!-- Global search hint -->
      <button
        class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-xs text-[var(--text-muted)] hover:border-[var(--primary)] transition-all duration-150"
        @click="$emit('open-search')"
      >
        <Search class="w-3.5 h-3.5" />
        <span>{{ t('search.placeholder') }}</span>
        <kbd class="ml-auto font-mono bg-[var(--surface)] px-1.5 py-0.5 rounded text-[10px] border border-[var(--border)]">⌘K</kbd>
      </button>
    </div>

    <div class="flex items-center gap-1.5">
      <!-- Theme toggle -->
      <button
        class="p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors"
        :title="themeStore.isDark ? t('header.lightMode') : t('header.darkMode')"
        @click="themeStore.toggle()"
      >
        <Sun v-if="themeStore.isDark" class="w-4 h-4" />
        <Moon v-else class="w-4 h-4" />
      </button>

      <!-- Locale -->
      <Select v-model="locale" :options="locales" option-label="label" option-value="value" size="small" class="w-28"
        @change="(e: any) => switchLocale(e.value)" />

      <!-- Notifications -->
      <div class="relative">
        <button
          class="relative p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors"
          :title="t('header.notifications')"
          @click="toggleNotifPanel"
        >
          <Bell class="w-5 h-5" />
          <span
            v-if="unreadCount > 0"
            class="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-[var(--danger)] rounded-full pointer-events-none"
          >
            {{ unreadCount > 9 ? '9+' : unreadCount }}
          </span>
        </button>
      </div>

      <!-- User avatar -->
      <button
        class="rounded-full hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
        :title="authStore.user?.fullName || 'Usuario'"
        @click="toggleUserPanel"
      >
        <Avatar :name="authStore.user?.fullName || 'Usuario'" :src="authStore.user?.avatarUrl" size="sm" />
      </button>
    </div>
  </header>

  <!-- Notifications Overlay Panel -->
  <OverlayPanel ref="notifPanel" class="w-96">
    <div class="flex items-center justify-between w-full mb-3">
      <span class="text-base font-semibold text-[var(--text)]">{{ t('header.notifications') }}</span>
      <Button :label="t('header.markAllRead')" size="small" text @click="notifStore.markAllRead()" />
    </div>
    <div v-if="notifStore.items.length === 0" class="text-center py-8 text-[var(--text-muted)]">
      <Bell class="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p class="text-sm">{{ t('header.noNotifications') }}</p>
    </div>
    <div v-else class="space-y-2 max-h-80 overflow-y-auto">
      <div v-for="n in notifStore.items.slice(0, 5)" :key="n.id"
        class="p-3 rounded-lg cursor-pointer transition-colors hover:bg-[var(--surface-raised)]"
        :class="{ 'bg-[var(--primary)]/5': !n.read }"
        @click="handleNotificationClick(n)">
        <div class="flex items-start justify-between gap-2">
          <p class="text-sm font-medium text-[var(--text)] truncate flex-1">{{ n.title }}</p>
          <span class="text-[11px] text-[var(--text-muted)] whitespace-nowrap flex-shrink-0">{{ formatNotificationTime(n.createdAt) }}</span>
        </div>
        <p v-if="n.body" class="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{{ n.body }}</p>
      </div>
    </div>
    <div class="mt-3 pt-3 border-t border-[var(--border)]">
      <RouterLink to="/notifications" class="text-sm font-medium text-[var(--primary)] hover:underline">{{ t('header.viewAllNotifications') }}</RouterLink>
    </div>
  </OverlayPanel>

  <!-- User Overlay Panel -->
  <OverlayPanel ref="userPanel" class="w-56">
    <div class="space-y-1">
      <RouterLink to="/settings" class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-[var(--surface-raised)] text-sm text-[var(--text)] transition-colors">
        <Settings class="w-4 h-4" />
        {{ t('header.settings') }}
      </RouterLink>
      <button class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-[var(--surface-raised)] text-sm text-[var(--danger)] w-full transition-colors" @click="logout()">
        <LogOut class="w-4 h-4" />
        {{ t('header.logout') }}
      </button>
    </div>
  </OverlayPanel>
</template>
