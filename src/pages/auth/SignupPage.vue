<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import Input from '@/components/ui/Input.vue'
import Button from '@/components/ui/Button.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { onboardingService } from '@/services/onboarding.service'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const isSubmitting = ref(false)
const slugTouched = ref(false)

const signupSchema = z.object({
  tenantName: z.string().min(2, t('auth.signup.tenantNameMin')),
  tenantSlug: z
    .string()
    .min(2, t('auth.signup.slugMin'))
    .max(63, t('auth.signup.slugMax'))
    .regex(/^[a-z0-9-]+$/, t('auth.signup.slugInvalid')),
  adminFullName: z.string().min(2, t('auth.signup.fullNameMin')),
  adminEmail: z.string().email(t('auth.emailValid')),
  adminPassword: z.string().min(8, t('auth.signup.passwordMin')),
  confirmPassword: z.string().min(8, t('auth.signup.passwordMin')),
}).refine(data => data.adminPassword === data.confirmPassword, {
  message: t('auth.signup.passwordMismatch'),
  path: ['confirmPassword'],
})

const signupForm = useForm({
  validationSchema: toTypedSchema(signupSchema),
  initialValues: {
    tenantName: '',
    tenantSlug: '',
    adminFullName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
  },
})

const [tenantName, tenantNameAttrs] = signupForm.defineField('tenantName')
const [tenantSlug, tenantSlugAttrs] = signupForm.defineField('tenantSlug')
const [adminFullName, adminFullNameAttrs] = signupForm.defineField('adminFullName')
const [adminEmail, adminEmailAttrs] = signupForm.defineField('adminEmail')
const [adminPassword, adminPasswordAttrs] = signupForm.defineField('adminPassword')
const [confirmPassword, confirmPasswordAttrs] = signupForm.defineField('confirmPassword')

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
}

watch(tenantName, (val) => {
  if (!slugTouched.value) {
    signupForm.setFieldValue('tenantSlug', slugify(val))
  }
})

function onSlugInput() {
  slugTouched.value = true
}

const onSubmit = signupForm.handleSubmit(async (values) => {
  isSubmitting.value = true
  try {
    await onboardingService.onboard({
      tenantName: values.tenantName,
      tenantSlug: values.tenantSlug,
      adminEmail: values.adminEmail,
      adminPassword: values.adminPassword,
      adminFullName: values.adminFullName,
    })
    await authStore.login({ email: values.adminEmail, password: values.adminPassword })
    toast.success(t('auth.signup.success'))
    router.push('/dashboard')
  } catch (err: any) {
    if (err?.response?.status === 409) {
      signupForm.setFieldError('tenantSlug', t('auth.signup.slugTaken'))
    } else {
      toast.error(t('auth.signup.failed'))
    }
  } finally {
    isSubmitting.value = false
  }
})
</script>

<template>
  <div class="space-y-6">
    <div class="text-center">
      <h1 class="text-2xl font-bold text-[var(--text)]">{{ t('auth.signup.title') }}</h1>
      <p class="text-sm text-[var(--text-muted)] mt-1">{{ t('auth.signup.subtitle') }}</p>
    </div>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <Input
        v-model="tenantName"
        v-bind="tenantNameAttrs"
        :label="t('auth.signup.orgName')"
        type="text"
        :placeholder="t('auth.signup.orgNamePlaceholder')"
        :error="signupForm.errors.value.tenantName"
        :disabled="isSubmitting"
        required
      />

      <div>
        <Input
          v-model="tenantSlug"
          v-bind="tenantSlugAttrs"
          :label="t('auth.signup.slug')"
          type="text"
          :placeholder="t('auth.signup.slugPlaceholder')"
          :error="signupForm.errors.value.tenantSlug"
          :disabled="isSubmitting"
          required
          @input="onSlugInput"
        />
        <p class="mt-1 text-xs text-[var(--text-muted)]">{{ t('auth.signup.slugHint') }}</p>
      </div>

      <Input
        v-model="adminFullName"
        v-bind="adminFullNameAttrs"
        :label="t('auth.signup.fullName')"
        type="text"
        :placeholder="t('auth.signup.fullNamePlaceholder')"
        :error="signupForm.errors.value.adminFullName"
        :disabled="isSubmitting"
        required
      />

      <Input
        v-model="adminEmail"
        v-bind="adminEmailAttrs"
        :label="t('auth.emailLabel')"
        type="email"
        :placeholder="t('auth.emailPlaceholder')"
        :error="signupForm.errors.value.adminEmail"
        :disabled="isSubmitting"
        required
      />

      <Input
        v-model="adminPassword"
        v-bind="adminPasswordAttrs"
        :label="t('auth.passwordLabel')"
        type="password"
        :placeholder="t('auth.signup.passwordPlaceholder')"
        :error="signupForm.errors.value.adminPassword"
        :disabled="isSubmitting"
        required
      />

      <Input
        v-model="confirmPassword"
        v-bind="confirmPasswordAttrs"
        :label="t('auth.signup.confirmPassword')"
        type="password"
        :placeholder="t('auth.signup.confirmPasswordPlaceholder')"
        :error="signupForm.errors.value.confirmPassword"
        :disabled="isSubmitting"
        required
      />

      <Button type="submit" variant="primary" size="md" full-width :loading="isSubmitting">
        {{ t('auth.signup.submit') }}
      </Button>

      <div class="text-center">
        <RouterLink to="/login" class="text-sm text-[var(--primary)] hover:underline">
          {{ t('auth.signIn') }}
        </RouterLink>
      </div>
    </form>
  </div>
</template>
