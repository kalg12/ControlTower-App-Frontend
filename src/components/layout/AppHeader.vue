<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Menu, Bell, Sun, Moon, ChevronDown, LogOut, Settings } from 'lucide-vue-next'
import Avatar from '@/components/ui/Avatar.vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useNotificationsStore } from '@/stores/notifications'
import { useToast } from '@/composables/useToast'

const emit = defineEmits<{ toggleSidebar: [] }>()

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const notifStore = useNotificationsStore()
const toast = useToast()

const userMenuOpen = ref(false)

const pageTitle = computed(() => {
  const title = route.meta.title as string | undefined
  return title ?? 'Control Tower'
})

async function handleLogout() {
  userMenuOpen.value = false
  await authStore.logout()
  router.push('/login')
  toast.success('Signed out successfully')
}
</script>

<template>
  <header class="h-14 flex items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--surface)] flex-shrink-0">
    <!-- Left -->
    <div class="flex items-center gap-3">
      <button
        class="lg:hidden p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors"
        @click="emit('toggleSidebar')"
      >
        <Menu class="w-5 h-5" />
      </button>
      <h1 class="text-sm font-semibold text-[var(--text)]">{{ pageTitle }}</h1>
    </div>

    <!-- Right -->
    <div class="flex items-center gap-1">
      <!-- Theme toggle -->
      <button
        class="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors"
        :title="themeStore.isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="themeStore.toggle()"
      >
        <Moon v-if="themeStore.isDark" class="w-4 h-4" />
        <Sun v-else class="w-4 h-4" />
      </button>

      <!-- Notifications -->
      <RouterLink
        to="/notifications"
        class="relative p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors"
        title="Notifications"
      >
        <Bell class="w-4 h-4" />
        <span
          v-if="notifStore.unreadCount > 0"
          class="absolute top-0.5 right-0.5 w-4 h-4 bg-[var(--danger)] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none"
        >
          {{ notifStore.unreadCount > 9 ? '9+' : notifStore.unreadCount }}
        </span>
      </RouterLink>

      <!-- User menu -->
      <div class="relative ml-1">
        <button
          class="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[var(--surface-raised)] transition-colors"
          @click="userMenuOpen = !userMenuOpen"
        >
          <Avatar :name="authStore.user?.fullName ?? 'User'" size="xs" />
          <span class="hidden sm:block text-sm text-[var(--text)] font-medium max-w-[120px] truncate">
            {{ authStore.user?.fullName }}
          </span>
          <ChevronDown class="w-3 h-3 text-[var(--text-muted)]" />
        </button>

        <!-- Dropdown -->
        <Transition
          enter-active-class="transition-all duration-150"
          leave-active-class="transition-all duration-100"
          enter-from-class="opacity-0 translate-y-1"
          leave-to-class="opacity-0 translate-y-1"
        >
          <div
            v-if="userMenuOpen"
            class="absolute right-0 top-full mt-1 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] shadow-lg z-50 overflow-hidden"
          >
            <div class="px-3 py-2 border-b border-[var(--border)]">
              <p class="text-xs font-semibold text-[var(--text)] truncate">{{ authStore.user?.fullName }}</p>
              <p class="text-xs text-[var(--text-muted)] truncate">{{ authStore.user?.email }}</p>
            </div>
            <div class="py-1">
              <RouterLink
                to="/settings"
                class="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface-raised)] transition-colors"
                @click="userMenuOpen = false"
              >
                <Settings class="w-3.5 h-3.5 text-[var(--text-muted)]" />
                Settings
              </RouterLink>
              <button
                class="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--danger)] hover:bg-[var(--surface-raised)] transition-colors"
                @click="handleLogout"
              >
                <LogOut class="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Click outside to close dropdown -->
    <div
      v-if="userMenuOpen"
      class="fixed inset-0 z-40"
      @click="userMenuOpen = false"
    />
  </header>
</template>
