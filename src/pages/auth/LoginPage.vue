<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input.vue'
import Button from '@/components/ui/Button.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const isSubmitting = ref(false)
const isMfa = ref(false)

const loginSchema = z.object({
  email: z.string().email(t('auth.emailValid')),
  password: z.string().min(6, t('auth.passwordMin')),
  mfaCode: z.string().optional(),
})

const loginForm = useForm({
  validationSchema: toTypedSchema(loginSchema),
  initialValues: { email: '', password: '', mfaCode: '' },
})

const [email, emailAttrs] = loginForm.defineField('email')
const [password, passwordAttrs] = loginForm.defineField('password')
const [mfaCode, mfaCodeAttrs] = loginForm.defineField('mfaCode')

const onSubmit = loginForm.handleSubmit(async (values) => {
  isSubmitting.value = true
  try {
    if (isMfa.value) {
      // MFA flow - just attempt login with code (backend handles verification)
      await authStore.login({ email: values.email, password: values.password })
    } else {
      await authStore.login({ email: values.email, password: values.password })
    }
    toast.success(t('auth.welcomeBack'))
    const redirect = router.currentRoute.value.query.redirect as string
    router.push(redirect || '/dashboard')
  } catch (err: any) {
    if (err?.response?.status === 401) {
      toast.error(t('auth.invalidCredentials'))
    } else {
      toast.error(t('auth.loginFailed'))
    }
  } finally {
    isSubmitting.value = false
  }
})
</script>

<template>
  <div class="space-y-6">
    <div class="text-center">
      <h1 class="text-2xl font-bold text-[var(--text)]">{{ t('auth.signIn') }}</h1>
      <p class="text-sm text-[var(--text-muted)] mt-1">{{ t('auth.welcomeBackDesc') }}</p>
    </div>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <template v-if="!isMfa">
        <Input
          v-model="email"
          v-bind="emailAttrs"
          :label="t('auth.emailLabel')"
          type="email"
          :placeholder="t('auth.emailPlaceholder')"
          :error="loginForm.errors.value.email"
          :disabled="isSubmitting"
          required
        />
        <Input
          v-model="password"
          v-bind="passwordAttrs"
          :label="t('auth.passwordLabel')"
          type="password"
          :placeholder="t('auth.passwordPlaceholder')"
          :error="loginForm.errors.value.password"
          :disabled="isSubmitting"
          required
        />
      </template>

      <template v-else>
        <div class="text-center space-y-3">
          <h2 class="text-lg font-semibold text-[var(--text)]">{{ t('auth.mfaTitle') }}</h2>
          <p class="text-sm text-[var(--text-muted)]">{{ t('auth.mfaDesc') }}</p>
        </div>
        <Input
          v-model="mfaCode"
          v-bind="mfaCodeAttrs"
          :label="t('auth.mfaLabel')"
          :error="loginForm.errors.value.mfaCode"
          placeholder="000000"
          :disabled="isSubmitting"
          required
        />
      </template>

      <Button type="submit" variant="primary" size="md" full-width :loading="isSubmitting">
        {{ isMfa ? t('auth.verifySignIn') : t('auth.signIn') }}
      </Button>

      <div v-if="!isMfa" class="text-center">
        <RouterLink to="/forgot-password" class="text-sm text-[var(--primary)] hover:underline">{{ t('auth.forgotPassword') }}</RouterLink>
      </div>
    </form>
  </div>
</template>
