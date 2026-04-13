<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { authService } from '@/services/auth.service'
import { useToast } from '@/composables/useToast'
import Input from '@/components/ui/Input.vue'
import Button from '@/components/ui/Button.vue'
import { CheckCircle, ArrowLeft } from 'lucide-vue-next'

const { t } = useI18n()
const toast = useToast()

const form = reactive({ email: '' })
const errors = reactive({ email: '' })
const loading = ref(false)
const submitted = ref(false)

function validate(): boolean {
  errors.email = ''
  if (!form.email.trim()) {
    errors.email = t('auth.emailRequired')
    return false
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = t('auth.emailValid')
    return false
  }
  return true
}

async function handleSubmit() {
  if (!validate()) return
  loading.value = true
  try {
    await authService.forgotPassword({ email: form.email })
    submitted.value = true
  } catch {
    toast.error(t('auth.resetEmailFailed'), t('auth.resetEmailFailedDesc'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <!-- Success state -->
    <div v-if="submitted" class="text-center">
      <div class="w-14 h-14 rounded-full bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 flex items-center justify-center mx-auto mb-5">
        <CheckCircle class="w-7 h-7 text-green-600 dark:text-green-400" />
      </div>
      <h1 class="text-xl font-bold text-[var(--text)] mb-2">{{ t('auth.checkEmail') }}</h1>
      <p class="text-sm text-[var(--text-muted)] mb-6">
        {{ t('auth.resetEmailSent', { email: form.email }) }}
      </p>
      <RouterLink
        to="/login"
        class="inline-flex items-center gap-1.5 text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium transition-colors"
      >
        <ArrowLeft class="w-4 h-4" />
        {{ t('auth.backToSignIn') }}
      </RouterLink>
    </div>

    <!-- Form -->
    <div v-else>
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-[var(--text)] mb-1">{{ t('auth.forgotPasswordTitle') }}</h1>
        <p class="text-sm text-[var(--text-muted)]">
          {{ t('auth.forgotPasswordSubtitle') }}
        </p>
      </div>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <Input
          v-model="form.email"
          :label="t('auth.emailAddress')"
          type="email"
          :placeholder="t('auth.emailPlaceholder')"
          :error="errors.email"
          required
          autocomplete="email"
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          full-width
          :loading="loading"
        >
          {{ loading ? t('auth.sending') : t('auth.sendResetLink') }}
        </Button>
      </form>

      <div class="mt-6 text-center">
        <RouterLink
          to="/login"
          class="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <ArrowLeft class="w-3.5 h-3.5" />
          {{ t('auth.backToSignIn') }}
        </RouterLink>
      </div>
    </div>
  </div>
</template>
