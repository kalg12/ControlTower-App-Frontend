# SPA deployment (avoid blank page on refresh)

Vue Router uses **history mode** (`createWebHistory`). The server must serve `index.html` for unknown paths so client-side routes load after a full page refresh.

## Nginx

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

If the app lives under a subpath, set Vite `base` to that path (e.g. `/controltower/`) and use the same prefix in `location`.

## Apache

```apache
FallbackResource /index.html
```

## Spring Boot (static resources)

Add a controller that forwards non-API routes to `index.html`, or configure `ResourceResolver` for SPA fallback.

## Cannot change the server?

Switch the router to **hash mode** in `src/router/index.ts`:

```ts
import { createRouter, createWebHashHistory } from 'vue-router'
// ...
history: createWebHashHistory(),
```

URLs become `https://example.com/#/dashboard` but refresh always works without server rewrites.
