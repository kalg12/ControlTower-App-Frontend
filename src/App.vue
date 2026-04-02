<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import { useThemeStore } from '@/stores/theme'

const route = useRoute()
const router = useRouter()

// Initialize theme store at the root so the .dark class is applied
// before AppHeader (inside AppLayout) ever mounts — prevents light→dark flash.
useThemeStore()

// Wait for the initial navigation to complete before rendering any layout.
// Without this, on a direct URL refresh the route.meta.layout is briefly
// undefined while the router resolves guards, causing a blank/dark flash.
const routerReady = ref(false)
onMounted(async () => {
  await router.isReady()
  routerReady.value = true
})

/** Shell: only `none` and `auth` opt out; missing `layout` defaults to app (avoids empty RouterView shell). */
const layout = computed(() => {
  const raw = route.meta.layout as string | undefined
  if (raw === 'none' || raw === 'auth') return raw
  return 'app'
})
</script>

<template>
  <template v-if="routerReady">
    <AppLayout v-if="layout === 'app'" />
    <AuthLayout v-else-if="layout === 'auth'" />
    <RouterView v-else />
  </template>
  <!-- Spinner shown only during the first router resolution (~1 render tick) -->
  <div v-else class="flex h-screen items-center justify-center bg-[var(--bg)]">
    <div class="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
  </div>
</template>
