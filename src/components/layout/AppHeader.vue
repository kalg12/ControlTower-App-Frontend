<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import { useThemeStore } from '@/stores/theme'
import OverlayPanel from 'primevue/overlaypanel'
import Badge from 'primevue/badge'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Avatar from '@/components/ui/Avatar.vue'
import { Bell, Settings, LogOut, Search } from 'lucide-vue-next'

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
        <Button severity="secondary" text rounded size="small" :title="t('header.notifications')" @click="toggleNotifPanel">
          <template #icon>
            <Bell class="w-4 h-4" />
          </template>
        </Button>
        <Badge v-if="notifStore.unreadCount > 0" :value="notifStore.unreadCount" severity="danger" class="absolute -top-1 -right-1 z-10 pointer-events-none" />
      </div>

      <button
        class="rounded-full hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
        :title="authStore.user?.fullName || 'Usuario'"
        @click="toggleUserPanel"
      >
        <Avatar :name="authStore.user?.fullName || 'Usuario'" size="sm" />
      </button>
    </div>
  </header>

  <!-- Notifications Overlay Panel -->
  <OverlayPanel ref="notifPanel" class="w-80">
    <div class="flex items-center justify-between w-full mb-2">
      <span class="font-semibold text-[var(--text)]">{{ t('header.notifications') }}</span>
      <Button :label="t('header.markAllRead')" size="small" text @click="notifStore.markAllRead()" />
    </div>
    <div v-if="notifStore.items.length === 0" class="text-center py-6 text-[var(--text-muted)]">
      <Bell class="w-8 h-8 mx-auto mb-2 opacity-50" />
      <p class="text-sm">{{ t('header.noNotifications') }}</p>
    </div>
    <div v-else class="space-y-2 max-h-64 overflow-y-auto">
      <div v-for="n in notifStore.items.slice(0, 5)" :key="n.id"
        class="p-2 rounded-lg cursor-pointer hover:bg-[var(--surface-raised)]"
        :class="{ 'bg-[var(--primary)]/5': !n.read }"
        @click="notifStore.markRead(n.id)">
        <p class="text-sm font-medium text-[var(--text)] truncate">{{ n.title }}</p>
        <p class="text-xs text-[var(--text-muted)] line-clamp-1">{{ n.body }}</p>
      </div>
    </div>
    <div class="mt-2 pt-2 border-t border-[var(--border)]">
      <RouterLink to="/notifications" class="text-xs text-[var(--primary)] hover:underline">{{ t('header.viewAllNotifications') }}</RouterLink>
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
