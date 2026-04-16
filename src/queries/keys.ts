/** Centralized TanStack Query keys for cache invalidation */

export const qk = {
  boards: () => ['kanban', 'boards'] as const,
  board: (id: string) => ['kanban', 'board', id] as const,
  dashboard: () => ['dashboard'] as const,
  tenants: (page?: number) => ['tenants', page ?? 0] as const,
  users: (tenantId: string, page?: number) => ['users', tenantId, page ?? 0] as const,
  roles: (page?: number) => ['roles', page ?? 0] as const,
  permissions: () => ['permissions'] as const,
  notes: (linkedTo?: string, linkedId?: string) => ['notes', linkedTo ?? '', linkedId ?? ''] as const,
  usersWorkload: () => ['users-workload'] as const,
  reports: (type: string, from?: string, to?: string) => ['reports', type, from ?? '', to ?? ''] as const,
  kbArticles: (filters?: string) => ['kb-articles', filters ?? ''] as const,
  kbArticle: (id: string) => ['kb-article', id] as const,
  ticket: (id: string) => ['ticket', id] as const,
  tickets: (filters?: string) => ['tickets', filters ?? ''] as const,
  ticketAttachments: (ticketId: string) => ['ticket-attachments', ticketId] as const,
  timeSummary: (entityType: string, entityId: string) => ['time-summary', entityType, entityId] as const,
  timeEntries: (entityType: string, entityId: string) => ['time-entries', entityType, entityId] as const,
  activeTimer: () => ['time-active'] as const,
  slaConfig: () => ['sla-config'] as const,
  timeAnalytics: (from?: string, to?: string) => ['time-analytics', from ?? '', to ?? ''] as const,
}
