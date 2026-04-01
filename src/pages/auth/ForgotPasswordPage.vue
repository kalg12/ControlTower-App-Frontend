<script setup lang="ts">
import { ref, reactive } from 'vue'
import { authService } from '@/services/auth.service'
import { useToast } from '@/composables/useToast'
import Input from '@/components/ui/Input.vue'
import Button from '@/components/ui/Button.vue'
import { CheckCircle, ArrowLeft } from 'lucide-vue-next'

const toast = useToast()

const form = reactive({ email: '' })
const errors = reactive({ email: '' })
const loading = ref(false)
const submitted = ref(false)

function validate(): boolean {
  errors.email = ''
  if (!form.email.trim()) {
    errors.email = 'Email is required'
    return false
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Enter a valid email address'
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
    toast.error('Failed to send reset email', 'Please try again later.')
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
      <h1 class="text-xl font-bold text-[var(--text)] mb-2">Check your email</h1>
      <p class="text-sm text-[var(--text-muted)] mb-6">
        We sent a password reset link to <strong class="text-[var(--text)]">{{ form.email }}</strong>. It may take a minute to arrive.
      </p>
      <RouterLink
        to="/login"
        class="inline-flex items-center gap-1.5 text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium transition-colors"
      >
        <ArrowLeft class="w-4 h-4" />
        Back to sign in
      </RouterLink>
    </div>

    <!-- Form -->
    <div v-else>
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-[var(--text)] mb-1">Reset password</h1>
        <p class="text-sm text-[var(--text-muted)]">
          Enter your email and we'll send you a reset link.
        </p>
      </div>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <Input
          v-model="form.email"
          label="Email address"
          type="email"
          placeholder="you@company.com"
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
          {{ loading ? 'Sending...' : 'Send reset link' }}
        </Button>
      </form>

      <div class="mt-6 text-center">
        <RouterLink
          to="/login"
          class="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <ArrowLeft class="w-3.5 h-3.5" />
          Back to sign in
        </RouterLink>
      </div>
    </div>
  </div>
</template>
