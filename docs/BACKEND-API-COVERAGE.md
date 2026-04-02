# Backend API coverage (frontend services)

| Area | Base path | Service module |
|------|-----------|----------------|
| Auth | `/api/v1/auth` | [`src/services/auth.service.ts`](../src/services/auth.service.ts) |
| Users | `/api/v1/users` | [`src/services/users.service.ts`](../src/services/users.service.ts) |
| Roles & permissions | `/api/v1/roles`, `/api/v1/permissions`, `/api/v1/users/.../roles` | [`src/services/users.service.ts`](../src/services/users.service.ts) (`rolesService`) |
| Tenants | `/api/v1/tenants` | [`src/services/tenants.service.ts`](../src/services/tenants.service.ts) |
| Onboarding | `/api/v1/tenants/onboard` | [`src/services/onboarding.service.ts`](../src/services/onboarding.service.ts) |
| Tickets | `/api/v1/tickets` | [`src/services/tickets.service.ts`](../src/services/tickets.service.ts) |
| Ticket attachments | `/api/v1/tickets/.../attachments`, `/api/v1/attachments/...` | [`src/services/ticket-attachments.service.ts`](../src/services/ticket-attachments.service.ts) |
| Clients | `/api/v1/clients` | [`src/services/clients.service.ts`](../src/services/clients.service.ts) |
| Dashboard | `/api/v1/dashboard` | [`src/services/dashboard.service.ts`](../src/services/dashboard.service.ts) |
| Health | `/api/v1/health` | [`src/services/health.service.ts`](../src/services/health.service.ts) |
| Licenses | `/api/v1/licenses` | [`src/services/licenses.service.ts`](../src/services/licenses.service.ts) |
| Notifications | `/api/v1/notifications` | [`src/services/notifications.service.ts`](../src/services/notifications.service.ts) |
| Audit | `/api/v1/audit` | [`src/services/audit.service.ts`](../src/services/audit.service.ts) |
| Billing | `/api/v1/billing` | [`src/services/billing.service.ts`](../src/services/billing.service.ts) |
| Integrations | `/api/v1/integrations` | [`src/services/integrations.service.ts`](../src/services/integrations.service.ts) |
| Notes | `/api/v1/notes` | [`src/services/notes.service.ts`](../src/services/notes.service.ts) |
| Kanban | `/api/v1/boards` | [`src/services/kanban.service.ts`](../src/services/kanban.service.ts) |
| Campaigns | (app-specific) | [`src/services/campaigns.service.ts`](../src/services/campaigns.service.ts) |
| Settings | (app-specific) | [`src/services/settings.service.ts`](../src/services/settings.service.ts) |

TanStack Query keys are centralized in [`src/queries/keys.ts`](../src/queries/keys.ts). Kanban-specific hooks live in [`src/queries/kanban.ts`](../src/queries/kanban.ts).
