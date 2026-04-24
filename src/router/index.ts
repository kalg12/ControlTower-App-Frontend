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
      path: '/widget/chat',
      name: 'chat-widget',
      component: () => import('@/pages/widget/ChatWidgetPage.vue'),
      meta: { layout: 'none', public: true }
    },
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
      path: '/persons',
      name: 'persons',
      component: () => import('@/pages/persons/PersonsPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.persons', permission: 'client:read' }
    },
    {
      path: '/calendar',
      name: 'calendar',
      component: () => import('@/pages/calendar/CalendarPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.calendar', permission: 'client:read' }
    },
    {
      path: '/pos',
      name: 'pos',
      component: () => import('@/pages/pos/PosPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.pos', permission: 'health:read' }
    },
    { path: '/health', redirect: '/pos' },
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
      path: '/kanban/supervisor',
      name: 'kanban-supervisor',
      component: () => import('@/pages/kanban/KanbanSupervisorPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.kanbanSupervisor', permission: 'super:admin' }
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
      path: '/finance',
      name: 'finance',
      component: () => import('@/pages/finance/FinancePage.vue'),
      meta: { layout: 'app', titleKey: 'nav.finance', permission: 'finance:read' }
    },
    {
      path: '/proposals',
      name: 'proposals',
      component: () => import('@/pages/proposals/ProposalsListPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.proposals', permission: 'proposal:read' }
    },
    {
      path: '/proposals/new',
      name: 'proposal-new',
      component: () => import('@/pages/proposals/ProposalFormPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.proposalNew', permission: 'proposal:write' }
    },
    {
      path: '/proposals/:id',
      name: 'proposal-detail',
      component: () => import('@/pages/proposals/ProposalDetailPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.proposalDetail', permission: 'proposal:read' }
    },
    {
      path: '/proposals/:id/edit',
      name: 'proposal-edit',
      component: () => import('@/pages/proposals/ProposalFormPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.proposalEdit', permission: 'proposal:write' }
    },
    {
      path: '/reminders',
      name: 'reminders',
      component: () => import('@/pages/reminders/RemindersPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.reminders', permission: 'client:read' }
    },
    {
      path: '/nomina',
      name: 'nomina',
      component: () => import('@/pages/payroll/NominaPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.payroll', permission: 'payroll:read' }
    },
    {
      path: '/chat',
      name: 'chat',
      component: () => import('@/pages/chat/ChatPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.chat', permission: 'chat:read' }
    },
    { path: '/integrations', redirect: '/pos' },
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
      path: '/knowledge-base',
      name: 'knowledge-base',
      component: () => import('@/pages/knowledge-base/KnowledgeBasePage.vue'),
      meta: { layout: 'app', titleKey: 'nav.knowledgeBase', permission: 'kb:read' }
    },
    {
      path: '/knowledge-base/:id',
      name: 'kb-article',
      component: () => import('@/pages/knowledge-base/KbArticleDetailPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.knowledgeBase', permission: 'kb:read' }
    },
    {
      path: '/my-work',
      name: 'my-work',
      component: () => import('@/pages/my-work/MyWorkPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.myWork', permission: 'ticket:read' }
    },
    {
      path: '/templates',
      name: 'templates',
      component: () => import('@/pages/templates/ResponseTemplatesPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.templates', permission: 'template:read' }
    },
    {
      path: '/survey/:token',
      name: 'csat-survey',
      component: () => import('@/pages/survey/CsatSurveyPage.vue'),
      meta: { layout: 'none', public: true }
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
