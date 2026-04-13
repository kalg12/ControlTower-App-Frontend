<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'

const { t } = useI18n()
const router = useRouter()
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[var(--surface-ground)]">
    <div class="text-center space-y-4 px-4">
      <h1 class="text-8xl font-bold text-[var(--primary)]">{{ t('notFound.code') }}</h1>
      <h2 class="text-2xl font-semibold text-[var(--text)]">{{ t('notFound.title') }}</h2>
      <p class="text-[var(--text-muted)] max-w-md mx-auto">{{ t('notFound.description') }}</p>
      <div class="flex items-center justify-center gap-3 pt-2">
        <Button :label="t('notFound.goBack')" severity="secondary" outlined @click="router.back()" />
        <Button :label="t('notFound.dashboard')" @click="router.push('/dashboard')" />
      </div>
    </div>
  </div>
</template>
