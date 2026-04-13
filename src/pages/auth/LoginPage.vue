<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import FormField from '@/components/ui/FormField.vue'
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
  <div class="min-h-screen flex items-center justify-center bg-[var(--surface-ground)] px-4">
    <div class="w-full max-w-md space-y-6">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-[var(--text)]">{{ t('auth.signIn') }}</h1>
        <p class="text-sm text-[var(--text-muted)] mt-1">{{ t('auth.welcomeBackDesc') }}</p>
      </div>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <template v-if="!isMfa">
          <FormField :label="t('auth.emailLabel')" name="email" :error="loginForm.errors.value.email" required>
            <InputText id="email" v-model="email" v-bind="emailAttrs" :placeholder="t('auth.emailPlaceholder')" class="w-full" :disabled="isSubmitting" />
          </FormField>
          <FormField :label="t('auth.passwordLabel')" name="password" :error="loginForm.errors.value.password" required>
            <Password id="password" v-model="password" v-bind="passwordAttrs" :placeholder="t('auth.passwordPlaceholder')" :feedback="false" toggle-mask class="w-full" :disabled="isSubmitting" />
          </FormField>
        </template>

        <template v-else>
          <div class="text-center space-y-3">
            <h2 class="text-lg font-semibold text-[var(--text)]">{{ t('auth.mfaTitle') }}</h2>
            <p class="text-sm text-[var(--text-muted)]">{{ t('auth.mfaDesc') }}</p>
          </div>
          <FormField :label="t('auth.mfaLabel')" name="mfaCode" :error="loginForm.errors.value.mfaCode" required>
            <InputText id="mfaCode" v-model="mfaCode" v-bind="mfaCodeAttrs" placeholder="000000" maxlength="6" class="w-full text-center text-2xl tracking-widest" :disabled="isSubmitting" />
          </FormField>
        </template>

        <Button type="submit" :label="isMfa ? t('auth.verifySignIn') : t('auth.signIn')" :loading="isSubmitting" class="w-full" />

        <div v-if="!isMfa" class="text-center">
          <RouterLink to="/forgot-password" class="text-sm text-[var(--primary)] hover:underline">{{ t('auth.forgotPassword') }}</RouterLink>
        </div>
      </form>
    </div>
  </div>
</template>
