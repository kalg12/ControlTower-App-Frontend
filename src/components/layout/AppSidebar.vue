<script setup lang="ts">
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

interface Props {
  collapsed?: boolean
}

withDefaults(defineProps<Props>(), { collapsed: false })
const emit = defineEmits<{ close: [] }>()

const route = useRoute()

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tickets', label: 'Tickets', icon: MessageSquare },
  { to: '/clients', label: 'Clients', icon: Building2 },
  { to: '/health', label: 'Health', icon: Activity },
  { to: '/licenses', label: 'Licenses', icon: CreditCard },
  { to: '/billing', label: 'Billing', icon: Receipt },
  { to: '/integrations', label: 'Integrations', icon: Plug },
  { to: '/tenants', label: 'Tenants', icon: Building },
  { to: '/audit', label: 'Audit Log', icon: ClipboardList },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings }
]

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<template>
  <aside class="flex flex-col h-full bg-[var(--surface)] border-r border-[var(--border)]">
    <!-- Logo -->
    <div class="flex items-center gap-2.5 px-4 h-14 border-b border-[var(--border)] flex-shrink-0">
      <div class="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center flex-shrink-0">
        <Zap class="w-4 h-4 text-white" />
      </div>
      <span class="font-bold text-[var(--text)] text-sm tracking-tight">Control Tower</span>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto py-3 px-2">
      <div class="space-y-0.5">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :class="[
            'flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius)] text-sm font-medium transition-all duration-150 group',
            isActive(item.to)
              ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
              : 'text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'
          ]"
          @click="emit('close')"
        >
          <component
            :is="item.icon"
            :class="['w-4 h-4 flex-shrink-0 transition-colors', isActive(item.to) ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text)]']"
          />
          <span>{{ item.label }}</span>
        </RouterLink>
      </div>
    </nav>

    <!-- Bottom info -->
    <div class="px-4 py-3 border-t border-[var(--border)] flex-shrink-0">
      <p class="text-[10px] text-[var(--text-placeholder)] font-medium uppercase tracking-wider">Control Tower v1.0</p>
    </div>
  </aside>
</template>
