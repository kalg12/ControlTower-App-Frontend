<script setup lang="ts">
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import { SearchX } from 'lucide-vue-next'

const router = useRouter()
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
    <div class="text-center max-w-md">
      <div class="w-20 h-20 rounded-2xl bg-[var(--surface-raised)] flex items-center justify-center mx-auto mb-6">
        <SearchX class="w-10 h-10 text-[var(--text-muted)]" />
      </div>
      <h1 class="text-6xl font-bold text-[var(--primary)] mb-2">404</h1>
      <h2 class="text-xl font-semibold text-[var(--text)] mb-2">Page not found</h2>
      <p class="text-sm text-[var(--text-muted)] mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div class="flex gap-3 justify-center">
        <Button
          label="Go Back"
          icon="pi pi-arrow-left"
          severity="secondary"
          outlined
          @click="router.back()"
        />
        <Button
          label="Dashboard"
          icon="pi pi-home"
          @click="router.push('/dashboard')"
        />
      </div>
    </div>
  </div>
</template>
