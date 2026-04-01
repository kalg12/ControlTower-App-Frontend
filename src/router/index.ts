import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
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
      meta: { layout: 'app', title: 'Dashboard' }
    },
    {
      path: '/tickets',
      name: 'tickets',
      component: () => import('@/pages/tickets/TicketsPage.vue'),
      meta: { layout: 'app', title: 'Tickets' }
    },
    {
      path: '/tickets/:id',
      name: 'ticket-detail',
      component: () => import('@/pages/tickets/TicketDetailPage.vue'),
      meta: { layout: 'app', title: 'Ticket Detail' }
    },
    {
      path: '/clients',
      name: 'clients',
      component: () => import('@/pages/clients/ClientsPage.vue'),
      meta: { layout: 'app', title: 'Clients' }
    },
    {
      path: '/clients/:id',
      name: 'client-detail',
      component: () => import('@/pages/clients/ClientDetailPage.vue'),
      meta: { layout: 'app', title: 'Client Detail' }
    },
    {
      path: '/health',
      name: 'health',
      component: () => import('@/pages/health/HealthPage.vue'),
      meta: { layout: 'app', title: 'Health' }
    },
    {
      path: '/tenants',
      name: 'tenants',
      component: () => import('@/pages/tenants/TenantsPage.vue'),
      meta: { layout: 'app', title: 'Tenants' }
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('@/pages/notifications/NotificationsPage.vue'),
      meta: { layout: 'app', title: 'Notifications' }
    },
    {
      path: '/licenses',
      name: 'licenses',
      component: () => import('@/pages/licenses/LicensesPage.vue'),
      meta: { layout: 'app', title: 'Licenses' }
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/pages/users/UsersPage.vue'),
      meta: { layout: 'app', title: 'Users' }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/pages/settings/SettingsPage.vue'),
      meta: { layout: 'app', title: 'Settings' }
    },
    {
      path: '/audit',
      name: 'audit',
      component: () => import('@/pages/audit/AuditPage.vue'),
      meta: { layout: 'app', title: 'Audit Log' }
    },
    {
      path: '/billing',
      name: 'billing',
      component: () => import('@/pages/billing/BillingPage.vue'),
      meta: { layout: 'app', title: 'Billing' }
    },
    {
      path: '/integrations',
      name: 'integrations',
      component: () => import('@/pages/integrations/IntegrationsPage.vue'),
      meta: { layout: 'app', title: 'Integrations' }
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

  next()
})

export default router
