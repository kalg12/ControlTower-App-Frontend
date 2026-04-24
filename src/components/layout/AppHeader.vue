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
import Badge from 'primevue/badge'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Avatar from '@/components/ui/Avatar.vue'
import { Bell, Settings, LogOut, Search } from 'lucide-vue-next'

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
  
  if (diffMinutes < 1) return isEs ? t('time.now') : 'now'
  if (diffMinutes < 60) return isEs ? t('time.agoMinutes', { minutes: diffMinutes }) : t('time.agoMinutes', { minutes: diffMinutes })
  
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return isEs ? t('time.agoHours', { hours: diffHours }) : t('time.agoHours', { hours: diffHours })
  
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return isEs ? t('time.agoDays', { days: diffDays }) : t('time.agoDays', { days: diffDays })
  
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
</script>

<template>
  <header class="flex items-center justify-between h-14 px-4 border-b border-[var(--border)] bg-[var(--surface)]">
    <div class="flex items-center gap-2">
      <!-- Global search hint -->
      <button
        class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)] text-xs text-[var(--text-muted)] hover:border-[var(--primary)] transition-colors"
        @click="$emit('open-search')"
      >
        <Search class="w-3.5 h-3.5" />
        <span>{{ t('search.placeholder') }}</span>
        <kbd class="ml-2 font-mono bg-[var(--surface)] px-1.5 py-0.5 rounded text-[10px]">⌘K</kbd>
      </button>
      <Button :icon="themeStore.isDark ? 'pi pi-moon' : 'pi pi-sun'" severity="secondary" text rounded size="small"
        :title="themeStore.isDark ? t('header.darkMode') : t('header.lightMode')" @click="themeStore.toggle()" />
      <Select v-model="locale" :options="locales" option-label="label" option-value="value" size="small" class="w-28"
        @change="(e: any) => switchLocale(e.value)" />
    </div>

    <div class="flex items-center gap-2">
      <div class="relative">
        <Button severity="secondary" text rounded :title="t('header.notifications')" @click="toggleNotifPanel">
          <template #icon>
            <Bell class="w-6 h-6" />
          </template>
        </Button>
        <Badge v-if="notifStore.unreadCount > 0" :value="notifStore.unreadCount" severity="danger" class="absolute -top-1 -right-1 z-10 pointer-events-none" />
      </div>

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
      <span class="text-lg font-semibold text-[var(--text)]">{{ t('header.notifications') }}</span>
      <Button :label="t('header.markAllRead')" size="small" text @click="notifStore.markAllRead()" />
    </div>
    <div v-if="notifStore.items.length === 0" class="text-center py-8 text-[var(--text-muted)]">
      <Bell class="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p class="text-base">{{ t('header.noNotifications') }}</p>
    </div>
    <div v-else class="space-y-3 max-h-80 overflow-y-auto">
      <div v-for="n in notifStore.items.slice(0, 5)" :key="n.id"
        class="p-3 rounded-lg cursor-pointer hover:bg-[var(--surface-raised)]"
        :class="{ 'bg-[var(--primary)]/5': !n.read }"
        @click="handleNotificationClick(n)">
        <div class="flex items-start justify-between gap-2">
          <p class="text-base font-medium text-[var(--text)] truncate flex-1">{{ n.title }}</p>
          <span class="text-xs text-[var(--text-muted)] whitespace-nowrap">{{ formatNotificationTime(n.createdAt) }}</span>
        </div>
        <p class="text-sm text-[var(--text-muted)] line-clamp-2">{{ n.body }}</p>
      </div>
    </div>
    <div class="mt-3 pt-3 border-t border-[var(--border)]">
      <RouterLink to="/notifications" class="text-sm text-[var(--primary)] hover:underline">{{ t('header.viewAllNotifications') }}</RouterLink>
    </div>
  </OverlayPanel>

  <!-- User Overlay Panel -->
  <OverlayPanel ref="userPanel" class="w-56">
    <div class="space-y-1">
      <RouterLink to="/settings" class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--surface-raised)] text-sm text-[var(--text)]">
        <Settings class="w-4 h-4" />
        {{ t('header.settings') }}
      </RouterLink>
      <button class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--surface-raised)] text-sm text-red-500 w-full" @click="logout()">
        <LogOut class="w-4 h-4" />
        {{ t('header.logout') }}
      </button>
    </div>
  </OverlayPanel>
</template>
