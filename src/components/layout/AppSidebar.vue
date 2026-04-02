<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  LayoutDashboard,
  MessageSquare,
  Building2,
  Activity,
  CreditCard,
  Receipt,
  Bell,
  Users,
  Settings,
  Zap,
  Building,
  ClipboardList,
  Plug
} from 'lucide-vue-next'
import { useNotificationsStore } from '@/stores/notifications'

interface Props {
  collapsed?: boolean
}

withDefaults(defineProps<Props>(), { collapsed: false })
const emit = defineEmits<{ close: [] }>()

const route = useRoute()
const notifStore = useNotificationsStore()

const mainItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tickets', label: 'Tickets', icon: MessageSquare },
  { to: '/clients', label: 'Clients', icon: Building2 },
  { to: '/health', label: 'Health', icon: Activity },
  { to: '/licenses', label: 'Licenses', icon: CreditCard },
  { to: '/billing', label: 'Billing', icon: Receipt },
  { to: '/integrations', label: 'Integrations', icon: Plug },
]

const adminItems = [
  { to: '/tenants', label: 'Tenants', icon: Building },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/audit', label: 'Audit Log', icon: ClipboardList },
]

const accountItems = [
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const unreadCount = computed(() => notifStore.unreadCount)

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(path + '/')
}

function badge(to: string): number | null {
  if (to === '/notifications') return unreadCount.value || null
  return null
}
</script>

<template>
  <aside
    :class="[
      'flex flex-col h-full bg-[var(--surface)] border-r border-[var(--border)] transition-all duration-200',
      collapsed ? 'w-14' : 'w-56'
    ]"
  >
    <!-- Logo -->
    <div class="flex items-center gap-2.5 px-3 h-14 border-b border-[var(--border)] flex-shrink-0 overflow-hidden">
      <div class="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
        <Zap class="w-4 h-4 text-white" />
      </div>
      <span v-if="!collapsed" class="font-bold text-[var(--text)] text-sm tracking-tight whitespace-nowrap">Control Tower</span>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-4">

      <!-- Main section -->
      <div>
        <p v-if="!collapsed" class="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-placeholder)]">Main</p>
        <div class="space-y-0.5">
          <RouterLink
            v-for="item in mainItems"
            :key="item.to"
            :to="item.to"
            :class="[
              'flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius)] text-sm font-medium transition-all duration-150 group relative',
              isActive(item.to)
                ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'
            ]"
            :title="collapsed ? item.label : undefined"
            @click="emit('close')"
          >
            <component
              :is="item.icon"
              :class="['w-4 h-4 flex-shrink-0 transition-colors', isActive(item.to) ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text)]']"
            />
            <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
          </RouterLink>
        </div>
      </div>

      <!-- Admin section -->
      <div>
        <p v-if="!collapsed" class="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-placeholder)]">Admin</p>
        <div class="space-y-0.5">
          <RouterLink
            v-for="item in adminItems"
            :key="item.to"
            :to="item.to"
            :class="[
              'flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius)] text-sm font-medium transition-all duration-150 group relative',
              isActive(item.to)
                ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'
            ]"
            :title="collapsed ? item.label : undefined"
            @click="emit('close')"
          >
            <component
              :is="item.icon"
              :class="['w-4 h-4 flex-shrink-0 transition-colors', isActive(item.to) ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text)]']"
            />
            <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
          </RouterLink>
        </div>
      </div>

      <!-- Account section -->
      <div>
        <p v-if="!collapsed" class="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-placeholder)]">Account</p>
        <div class="space-y-0.5">
          <RouterLink
            v-for="item in accountItems"
            :key="item.to"
            :to="item.to"
            :class="[
              'flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius)] text-sm font-medium transition-all duration-150 group relative',
              isActive(item.to)
                ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'
            ]"
            :title="collapsed ? item.label : undefined"
            @click="emit('close')"
          >
            <component
              :is="item.icon"
              :class="['w-4 h-4 flex-shrink-0 transition-colors', isActive(item.to) ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text)]']"
            />
            <span v-if="!collapsed" class="flex-1 truncate">{{ item.label }}</span>
            <!-- Unread badge -->
            <span
              v-if="badge(item.to)"
              :class="[
                'flex-shrink-0 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none flex items-center justify-center',
                collapsed ? 'absolute top-1 right-1 w-4 h-4' : 'min-w-[18px] h-4 px-1'
              ]"
            >
              {{ badge(item.to)! > 9 ? '9+' : badge(item.to) }}
            </span>
          </RouterLink>
        </div>
      </div>
    </nav>

    <!-- Bottom info -->
    <div class="px-3 py-3 border-t border-[var(--border)] flex-shrink-0">
      <p v-if="!collapsed" class="text-[10px] text-[var(--text-placeholder)] font-medium uppercase tracking-wider">CT v1.0</p>
      <div v-else class="w-4 h-4 rounded-full bg-[var(--surface-raised)] mx-auto" />
    </div>
  </aside>
</template>
