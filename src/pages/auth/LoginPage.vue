<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import Input from '@/components/ui/Input.vue'
import Button from '@/components/ui/Button.vue'
import type { AxiosError } from 'axios'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToast()

const form = reactive({
  email: '',
  password: '',
  totpCode: ''
})

const errors = reactive({
  email: '',
  password: '',
  totpCode: '',
  general: ''
})

const showTotp = ref(false)
/** Set when backend returns requiresMfa + mfaToken on first login step */
const pendingMfaToken = ref<string | null>(null)
const loading = ref(false)

function validate(): boolean {
  errors.email = ''
  errors.password = ''
  errors.general = ''

  if (!form.email.trim()) {
    errors.email = 'Email is required'
    return false
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address'
    return false
  }
  if (!form.password) {
    errors.password = 'Password is required'
    return false
  }
  if (form.password.length < 6) {
    errors.password = 'Password must be at least 6 characters'
    return false
  }
  return true
}

async function handleLogin() {
  errors.totpCode = ''
  errors.general = ''

  // Step 2: MFA code + temporary token from step 1
  if (pendingMfaToken.value) {
    if (!form.totpCode || form.totpCode.length !== 6) {
      errors.totpCode = 'Enter the 6-digit code from your authenticator app'
      return
    }
    loading.value = true
    try {
      await authStore.completeMfaLogin(pendingMfaToken.value, form.totpCode)
      pendingMfaToken.value = null
      toast.success('Welcome back!', `Signed in as ${authStore.user?.fullName}`)
      const redirect = route.query.redirect as string | undefined
      router.push(redirect ?? '/dashboard')
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>
      errors.general =
        axiosErr.response?.data?.message ?? 'Invalid code or session expired. Try signing in again.'
    } finally {
      loading.value = false
    }
    return
  }

  if (!validate()) return

  loading.value = true
  errors.general = ''

  try {
    const response = await authStore.login({
      email: form.email,
      password: form.password
    })

    if (response.requiresMfa && response.mfaToken) {
      pendingMfaToken.value = response.mfaToken
      showTotp.value = true
      errors.general = 'Two-factor authentication is required. Enter the code from your app.'
      return
    }

    toast.success('Welcome back!', `Signed in as ${authStore.user?.fullName}`)
    const redirect = route.query.redirect as string | undefined
    router.push(redirect ?? '/dashboard')
  } catch (err) {
    const axiosErr = err as AxiosError<{ message?: string }>
    const status = axiosErr.response?.status
    const message = axiosErr.response?.data?.message ?? 'Login failed. Please try again.'

    if (status === 401) {
      errors.general = 'Invalid email or password.'
    } else {
      errors.general = message
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-[var(--text)] mb-1">Sign in</h1>
      <p class="text-sm text-[var(--text-muted)]">Welcome back to Control Tower</p>
    </div>

    <form class="space-y-4" @submit.prevent="handleLogin">
      <Input
        v-model="form.email"
        label="Email address"
        type="email"
        placeholder="you@company.com"
        :error="errors.email"
        required
        autocomplete="email"
      />

      <Input
        v-model="form.password"
        label="Password"
        type="password"
        placeholder="Enter your password"
        :error="errors.password"
        required
        autocomplete="current-password"
      />

      <div v-if="showTotp">
        <Input
          v-model="form.totpCode"
          label="Authenticator Code"
          type="text"
          placeholder="000000"
          :error="errors.totpCode"
          hint="Enter the 6-digit code from your authenticator app"
          autocomplete="one-time-code"
          maxlength="6"
        />
      </div>

      <!-- Error message -->
      <div
        v-if="errors.general"
        class="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-[var(--radius)] text-sm text-red-700 dark:text-red-400"
      >
        <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {{ errors.general }}
      </div>

      <div class="flex items-center justify-between">
        <RouterLink
          to="/forgot-password"
          class="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium transition-colors"
        >
          Forgot password?
        </RouterLink>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="md"
        full-width
        :loading="loading"
      >
        {{ loading ? 'Signing in...' : pendingMfaToken ? 'Verify & sign in' : 'Sign in' }}
      </Button>
    </form>
  </div>
</template>
