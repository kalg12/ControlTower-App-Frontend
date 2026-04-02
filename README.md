# Control Tower — Frontend

Vue 3 + TypeScript + Vite + PrimeVue + TanStack Query + Pinia.

## Scripts

- `npm run dev` — dev server (proxies `/api` → `http://localhost:8080`)
- `npm run build` — typecheck + production build
- `npm run preview` — preview production build

## i18n

English (default) and Spanish. Locale is stored in `localStorage` (`controltower.locale`). Switch from the header.

## SPA deployment

See [docs/SPA-DEPLOYMENT.md](docs/SPA-DEPLOYMENT.md) so **refresh on deep links** works (history mode + server fallback).

## API surface

See [docs/BACKEND-API-COVERAGE.md](docs/BACKEND-API-COVERAGE.md). Kanban gaps vs full editing: [docs/KANBAN-BACKEND-GAPS.md](docs/KANBAN-BACKEND-GAPS.md).
