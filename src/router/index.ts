import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
      meta: { layout: 'app', titleKey: 'nav.tickets' }
    },
    {
      path: '/tickets/:id',
      name: 'ticket-detail',
      component: () => import('@/pages/tickets/TicketDetailPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.ticketDetail' }
    },
    {
      path: '/clients',
      name: 'clients',
      component: () => import('@/pages/clients/ClientsPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.clients' }
    },
    {
      path: '/clients/:id',
      name: 'client-detail',
      component: () => import('@/pages/clients/ClientDetailPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.clientDetail' }
    },
    {
      path: '/health',
      name: 'health',
      component: () => import('@/pages/health/HealthPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.health' }
    },
    {
      path: '/kanban',
      name: 'kanban',
      component: () => import('@/pages/kanban/KanbanBoardsPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.kanban' }
    },
    {
      path: '/kanban/:id',
      name: 'kanban-board',
      component: () => import('@/pages/kanban/KanbanBoardPage.vue'),
      meta: { layout: 'app', titleKey: 'kanban.boardDetail' }
    },
    {
      path: '/tenants',
      name: 'tenants',
      component: () => import('@/pages/tenants/TenantsPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.tenants' }
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('@/pages/notifications/NotificationsPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.notifications' }
    },
    {
      path: '/licenses',
      name: 'licenses',
      component: () => import('@/pages/licenses/LicensesPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.licenses' }
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/pages/users/UsersPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.users' }
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
      meta: { layout: 'app', titleKey: 'nav.audit' }
    },
    {
      path: '/billing',
      name: 'billing',
      component: () => import('@/pages/billing/BillingPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.billing' }
    },
    {
      path: '/integrations',
      name: 'integrations',
      component: () => import('@/pages/integrations/IntegrationsPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.integrations' }
    },
    {
      path: '/campaigns',
      name: 'campaigns',
      component: () => import('@/pages/campaigns/CampaignsPage.vue'),
      meta: { layout: 'app', titleKey: 'nav.campaigns' }
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

  const l = to.meta.layout as string | undefined
  if (l !== 'auth' && l !== 'none' && l !== 'app') {
    to.meta.layout = 'app'
  }

  next()
})

export default router
