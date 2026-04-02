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
  ticket: (id: string) => ['ticket', id] as const,
  tickets: (filters?: string) => ['tickets', filters ?? ''] as const,
  ticketAttachments: (ticketId: string) => ['ticket-attachments', ticketId] as const
}
