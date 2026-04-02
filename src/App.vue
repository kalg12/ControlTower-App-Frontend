<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import AuthLayout from '@/components/layout/AuthLayout.vue'
import { useThemeStore } from '@/stores/theme'

const route = useRoute()

// Initialize theme store at the root so the .dark class is applied
// before AppHeader (inside AppLayout) ever mounts — prevents light→dark flash.
useThemeStore()

const layout = computed(() => route.meta.layout as string | undefined)
</script>

<template>
  <AppLayout v-if="layout === 'app'" />
  <AuthLayout v-else-if="layout === 'auth'" />
  <RouterView v-else />
</template>
