<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Toaster } from 'vue-sonner'
import AppLayout from '@/components/layout/AppLayout.vue'
import AuthLayout from '@/components/layout/AuthLayout.vue'

const authStore = useAuthStore()
const route = useRoute()

const layout = computed(() => route.meta.layout as string | undefined)

onMounted(() => authStore.loadFromStorage())
</script>

<template>
  <Toaster position="top-right" richColors />
  <AppLayout v-if="layout === 'app'">
    <RouterView />
  </AppLayout>
  <AuthLayout v-else-if="layout === 'auth'" />
  <RouterView v-else />
</template>
