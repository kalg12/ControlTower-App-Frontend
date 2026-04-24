<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
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
  Plug,
  Megaphone,
  LayoutGrid,
  Shield,
  Store,
  BarChart3,
  BookOpen,
  Briefcase,
  FileText,
  DollarSign,
  CalendarDays,
  Banknote,
  MessageCircle
} from 'lucide-vue-next'
import { useQuery } from '@tanstack/vue-query'
import { chatService } from '@/services/chat.service'
import { qk } from '@/queries/keys'
import { useNotificationsStore } from '@/stores/notifications'
import { useAuthStore } from '@/stores/auth'

type NavItem = {
  to: string
  label: string
  icon: Component
  permission?: string
}

interface Props {
  collapsed?: boolean
}

withDefaults(defineProps<Props>(), { collapsed: false })
const emit = defineEmits<{ close: [] }>()

const route = useRoute()
const notifStore = useNotificationsStore()
const auth = useAuthStore()
const { t } = useI18n()

const { data: chatWaiting } = useQuery({
  queryKey: qk.chatUnreadCount(),
  queryFn: () => chatService.countWaiting(),
  refetchInterval: 20000,
  enabled: computed(() => auth.hasPermission('chat:read')),
})

function visible(items: NavItem[]) {
  return items.filter((i) => !i.permission || auth.hasPermission(i.permission))
}

const dashItem = { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard }

const crmItems = computed(() =>
  visible([
    { to: '/clients', label: t('nav.clients'), icon: Building2, permission: 'client:read' },
    { to: '/persons', label: t('nav.persons'), icon: Users, permission: 'client:read' },
    { to: '/calendar', label: t('nav.calendar'), icon: CalendarDays, permission: 'client:read' },
    { to: '/proposals', label: t('nav.proposals'), icon: FileText, permission: 'proposal:read' },
    { to: '/reminders', label: t('nav.reminders'), icon: Bell, permission: 'client:read' },
  ])
)

const opsItems = computed(() =>
  visible([
    { to: '/tickets', label: t('nav.tickets'), icon: MessageSquare, permission: 'ticket:read' },
    { to: '/pos-support', label: t('nav.posSupport'), icon: Store, permission: 'ticket:read' },
    { to: '/chat', label: 'Chat Soporte', icon: MessageCircle, permission: 'chat:read' },
    { to: '/kanban', label: t('nav.kanban'), icon: LayoutGrid, permission: 'kanban:read' },
    { to: '/kanban/work', label: t('nav.kanbanWork'), icon: ClipboardList, permission: 'kanban:read' },
    { to: '/my-work', label: t('nav.myWork'), icon: Briefcase, permission: 'ticket:read' },
    { to: '/pos', label: 'Puntos de Venta', icon: Store, permission: 'health:read' },
  ])
)

const financeItems = computed(() =>
  visible([
    { to: '/finance', label: t('nav.finance'), icon: DollarSign, permission: 'finance:read' },
    { to: '/nomina', label: t('nav.payroll'), icon: Banknote, permission: 'payroll:read' },
    { to: '/licenses', label: t('nav.licenses'), icon: CreditCard, permission: 'license:read' },
    { to: '/billing', label: t('nav.billing'), icon: Receipt, permission: 'billing:read' },
  ])
)

const contentItems = computed(() =>
  visible([
    { to: '/campaigns', label: t('nav.campaigns'), icon: Megaphone, permission: 'campaign:read' },
    { to: '/templates', label: t('nav.templates'), icon: FileText, permission: 'template:read' },
    { to: '/knowledge-base', label: t('nav.knowledgeBase'), icon: BookOpen, permission: 'kb:read' },
    { to: '/reports', label: t('nav.reports'), icon: BarChart3, permission: 'report:read' },
  ])
)

const adminItems = computed(() =>
  visible([
    { to: '/tenants', label: t('nav.tenants'), icon: Building, permission: 'tenant:read' },
    { to: '/users', label: t('nav.users'), icon: Users, permission: 'user:read' },
    { to: '/roles', label: t('nav.roles'), icon: Shield, permission: 'user:read' },
    { to: '/audit', label: t('nav.audit'), icon: ClipboardList, permission: 'audit:read' },
    { to: '/activity', label: t('nav.activity'), icon: Activity, permission: 'activity:read' }
  ])
)

const accountItems = computed(() =>
  visible([
    { to: '/notifications', label: t('nav.notifications'), icon: Bell, permission: 'notification:read' },
    { to: '/settings', label: t('nav.settings'), icon: Settings }
  ])
)

const unreadCount = computed(() => notifStore.unreadCount)

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(path + '/')
}

function badge(to: string): number | null {
  if (to === '/notifications') return unreadCount.value || null
  if (to === '/pos-support') return notifStore.posBadgeCount || null
  if (to === '/chat') return (chatWaiting.value ?? 0) > 0 ? chatWaiting.value! : null
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
      <span v-if="!collapsed" class="font-bold text-[var(--text)] text-sm tracking-tight whitespace-nowrap">{{ t('app.name') }}</span>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-4">

      <!-- Dashboard -->
      <div>
        <RouterLink
          :to="dashItem.to"
          :class="[
            'flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius)] text-sm font-medium transition-all duration-150 group relative',
            isActive(dashItem.to)
              ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
              : 'text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'
          ]"
          :title="collapsed ? dashItem.label : undefined"
          @click="emit('close')"
        >
          <component :is="dashItem.icon" :class="['w-4 h-4 flex-shrink-0 transition-colors', isActive(dashItem.to) ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text)]']" />
          <span v-if="!collapsed" class="flex-1 truncate">{{ dashItem.label }}</span>
        </RouterLink>
      </div>

      <!-- CRM -->
      <div v-if="crmItems.length">
        <p v-if="!collapsed" class="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-placeholder)]">CRM</p>
        <div class="space-y-0.5">
          <RouterLink
            v-for="item in crmItems"
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
            <component :is="item.icon" :class="['w-4 h-4 flex-shrink-0 transition-colors', isActive(item.to) ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text)]']" />
            <span v-if="!collapsed" class="flex-1 truncate">{{ item.label }}</span>
            <span v-if="badge(item.to)" :class="['flex-shrink-0 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none flex items-center justify-center', collapsed ? 'absolute top-1 right-1 w-4 h-4' : 'min-w-[18px] h-4 px-1']">{{ badge(item.to)! > 9 ? '9+' : badge(item.to) }}</span>
          </RouterLink>
        </div>
      </div>

      <!-- Operaciones -->
      <div v-if="opsItems.length">
        <p v-if="!collapsed" class="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-placeholder)]">{{ t('nav.operations') }}</p>
        <div class="space-y-0.5">
          <RouterLink
            v-for="item in opsItems"
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
            <component :is="item.icon" :class="['w-4 h-4 flex-shrink-0 transition-colors', isActive(item.to) ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text)]']" />
            <span v-if="!collapsed" class="flex-1 truncate">{{ item.label }}</span>
            <span v-if="badge(item.to)" :class="['flex-shrink-0 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none flex items-center justify-center', collapsed ? 'absolute top-1 right-1 w-4 h-4' : 'min-w-[18px] h-4 px-1']">{{ badge(item.to)! > 9 ? '9+' : badge(item.to) }}</span>
          </RouterLink>
        </div>
      </div>

      <!-- Finanzas -->
      <div v-if="financeItems.length">
        <p v-if="!collapsed" class="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-placeholder)]">{{ t('nav.finances') }}</p>
        <div class="space-y-0.5">
          <RouterLink
            v-for="item in financeItems"
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
            <component :is="item.icon" :class="['w-4 h-4 flex-shrink-0 transition-colors', isActive(item.to) ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text)]']" />
            <span v-if="!collapsed" class="flex-1 truncate">{{ item.label }}</span>
          </RouterLink>
        </div>
      </div>

      <!-- Contenido -->
      <div v-if="contentItems.length">
        <p v-if="!collapsed" class="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-placeholder)]">{{ t('nav.content') }}</p>
        <div class="space-y-0.5">
          <RouterLink
            v-for="item in contentItems"
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
            <component :is="item.icon" :class="['w-4 h-4 flex-shrink-0 transition-colors', isActive(item.to) ? 'text-[var(--primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text)]']" />
            <span v-if="!collapsed" class="flex-1 truncate">{{ item.label }}</span>
          </RouterLink>
        </div>
      </div>

      <!-- Admin section -->
      <div v-if="adminItems.length">
        <p v-if="!collapsed" class="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-placeholder)]">{{ t('nav.admin') }}</p>
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
        <p v-if="!collapsed" class="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-placeholder)]">{{ t('nav.account') }}</p>
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
      <p v-if="!collapsed" class="text-[10px] text-[var(--text-placeholder)] font-medium uppercase tracking-wider">{{ t('app.version') }}</p>
      <div v-else class="w-4 h-4 rounded-full bg-[var(--surface-raised)] mx-auto" />
    </div>
  </aside>
</template>
