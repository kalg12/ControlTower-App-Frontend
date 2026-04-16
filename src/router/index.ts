import { createRouter, createWebHistory } from 'vue-router'
import { toast } from 'vue3-toastify'
import { useAuthStore } from '@/stores/auth'
import { i18n } from '@/i18n'

// ── Navigation tracking for employee activity monitoring ──────────────
let navigationStart = Date.now()
let trackTimeout: ReturnType<typeof setTimeout> | null = null

async function trackNavigation(to: any) {
  if (to.meta.public || to.meta.layout === 'none' || to.meta.layout === 'auth') return
  if (!useAuthStore().isAuthenticated) return

  const duration = Math.round((Date.now() - navigationStart) / 1000)
  navigationStart = Date.now()

  // Skip tracking if duration < 1s (user bounced quickly)
  if (duration < 1) return

  // Debounce: batch tracking calls to avoid flooding the API
  if (trackTimeout) clearTimeout(trackTimeout)
  trackTimeout = setTimeout(async () => {
    try {
      const { activityService } = await import('@/services/activity.service')
      const titleKey = to.meta.titleKey as string | undefined
      await activityService.track({
        routePath: to.path,
        pageTitle: titleKey ? i18n.global.t(titleKey) : (to.meta.title as string) || to.name,
        durationSeconds: duration > 300 ? 300 : duration, // Cap at 5 min
        fullUrl: window.location.href,
        sessionId: sessionStorage.getItem('ct_session_id') || undefined,
      })
    } catch {
      // Silent fail — tracking should never break navigation
    }
  }, 2000)
}

// Generate session ID on first load
if (!sessionStorage.getItem('ct_session_id')) {
  sessionStorage.setItem('ct_session_id', crypto.randomUUID?.() || Date.now().toString(36))
}
// ──────────────────────────────────────────────────────────────────────

const router = createRouter({
  // Respect Vite `base` so deep links work when the app is served under a subpath
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/auth/LoginPage.vue'),
      meta: { layout: 'auth', public: true }
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('@/pages/auth/ForgotPasswordPage.vue'),
      meta: { layout: 'auth', public: true }
    },
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/pages/dashboard/DashboardPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.dashboard' }
    },
    {
      path: '/tickets',
      name: 'tickets',
      component: () => import('@/pages/tickets/TicketsPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.tickets', permission: 'ticket:read' }
    },
    {
      path: '/tickets/:id',
      name: 'ticket-detail',
      component: () => import('@/pages/tickets/TicketDetailPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.ticketDetail', permission: 'ticket:read' }
    },
    {
      path: '/pos-support',
      name: 'pos-support',
      component: () => import('@/pages/tickets/PosSupportPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.posSupport', permission: 'ticket:read' }
    },
    {
      path: '/clients',
      name: 'clients',
      component: () => import('@/pages/clients/ClientsPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.clients', permission: 'client:read' }
    },
    {
      path: '/clients/:id',
      name: 'client-detail',
      component: () => import('@/pages/clients/ClientDetailPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.clientDetail', permission: 'client:read' }
    },
    {
      path: '/health',
      name: 'health',
      component: () => import('@/pages/health/HealthPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.health', permission: 'health:read' }
    },
    {
      path: '/kanban',
      name: 'kanban',
      component: () => import('@/pages/kanban/KanbanBoardsPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.kanban', permission: 'kanban:read' }
    },
    {
      path: '/kanban/work',
      name: 'kanban-work',
      component: () => import('@/pages/kanban/KanbanWorkPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.kanbanWork', permission: 'kanban:read' }
    },
    {
      path: '/kanban/:id',
      name: 'kanban-board',
      component: () => import('@/pages/kanban/KanbanBoardPage.vue'),
      meta: { layout: 'app', titleKey: 'kanban.boardDetail', permission: 'kanban:read' }
    },
    {
      path: '/tenants',
      name: 'tenants',
      component: () => import('@/pages/tenants/TenantsPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.tenants', permission: 'tenant:read' }
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('@/pages/notifications/NotificationsPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.notifications', permission: 'notification:read' }
    },
    {
      path: '/licenses',
      name: 'licenses',
      component: () => import('@/pages/licenses/LicensesPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.licenses', permission: 'license:read' }
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/pages/users/UsersPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.users', permission: 'user:read' }
    },
    {
      path: '/roles',
      name: 'roles',
      component: () => import('@/pages/roles/RolesPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.roles', permission: 'user:read' }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/pages/settings/SettingsPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.settings' }
    },
    {
      path: '/audit',
      name: 'audit',
      component: () => import('@/pages/audit/AuditPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.audit', permission: 'audit:read' }
    },
    {
      path: '/billing',
      name: 'billing',
      component: () => import('@/pages/billing/BillingPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.billing', permission: 'billing:read' }
    },
    {
      path: '/integrations',
      name: 'integrations',
      component: () => import('@/pages/integrations/IntegrationsPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.integrations', permission: 'integration:read' }
    },
    {
      path: '/campaigns',
      name: 'campaigns',
      component: () => import('@/pages/campaigns/CampaignsPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.campaigns', permission: 'campaign:read' }
    },
    {
      path: '/activity',
      name: 'activity',
      component: () => import('@/pages/activity/ActivityPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.activity', permission: 'activity:read' }
    },
    {
      path: '/reports',
      name: 'reports',
      component: () => import('@/pages/reports/ReportsPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.reports', permission: 'report:read' }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/NotFoundPage.vue'),
      meta: { layout: 'none' }
    }
  ]
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  if (to.meta.public) {
    if (authStore.isAuthenticated && (to.name === 'login' || to.name === 'forgot-password')) {
      return next('/dashboard')
    }
    return next()
  }

  if (!authStore.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  const required = to.meta.permission as string | undefined
  if (required && !authStore.hasPermission(required)) {
    toast.error(i18n.global.t('errors.forbidden'))
    return next({ name: 'dashboard' })
  }

  const l = to.meta.layout as string | undefined
  if (l !== 'auth' && l !== 'none' && l !== 'app') {
    to.meta.layout = 'app'
  }

  next()
})

// Track navigation after route change
router.afterEach((to) => {
  trackNavigation(to)
})

export default router
