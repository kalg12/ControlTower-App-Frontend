<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toaster } from 'vue-sonner'
import AppLayout from '@/components/layout/AppLayout.vue'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import { useThemeStore } from '@/stores/theme'

const route = useRoute()
const router = useRouter()
const ready = ref(false)

// Initialize theme store here (not inside AppLayout) so dark class is applied
// immediately on every page — prevents light flash before AppHeader mounts
useThemeStore()

const layout = computed(() => route.meta.layout as string | undefined)

// Wait for the router to resolve the initial navigation before rendering.
// This prevents the brief "undefined layout" state on hard refresh where
// the sidebar and header disappear because AppLayout isn't rendered yet.
router.isReady().then(() => { ready.value = true })
</script>

<template>
  <Toaster position="top-right" richColors />

  <!-- Full-screen placeholder while the router resolves (~1 frame) -->
  <div v-if="!ready" class="min-h-screen bg-[var(--bg)]" />

  <template v-else>
    <AppLayout v-if="layout === 'app'" />
    <AuthLayout v-else-if="layout === 'auth'" />
    <RouterView v-else />
  </template>
</template>
