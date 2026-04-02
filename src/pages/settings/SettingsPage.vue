<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { usersService } from '@/services/users.service'
import { authService } from '@/services/auth.service'
import { settingsService } from '@/services/settings.service'
import { useToast } from '@/composables/useToast'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Card from '@/components/ui/Card.vue'
import Avatar from '@/components/ui/Avatar.vue'
import { User, Lock, Bell, Sun, Moon, ShieldOff, Shield } from 'lucide-vue-next'

const authStore = useAuthStore()
const themeStore = useThemeStore()
const toast = useToast()

const activeTab = ref<'profile' | 'security' | 'notifications'>('profile')

const tabs = [
  { id: 'profile' as const, label: 'Profile', icon: User },
  { id: 'security' as const, label: 'Security', icon: Lock },
  { id: 'notifications' as const, label: 'Notifications', icon: Bell }
]

// Profile form
const profileForm = reactive({
  fullName: authStore.user?.fullName ?? '',
  email: authStore.user?.email ?? ''
})
const profileErrors = reactive({ fullName: '', email: '' })
const savingProfile = ref(false)

async function handleSaveProfile() {
  profileErrors.fullName = ''
  profileErrors.email = ''
  if (!profileForm.fullName.trim()) { profileErrors.fullName = 'Name is required'; return }
  if (!profileForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email)) {
    profileErrors.email = 'Valid email required'; return
  }
  if (!authStore.user?.id) return
  savingProfile.value = true
  try {
    await usersService.update(authStore.user.id, { fullName: profileForm.fullName })
    if (authStore.user) {
      authStore.user.fullName = profileForm.fullName
      authStore.user.email = profileForm.email
      localStorage.setItem('user', JSON.stringify(authStore.user))
    }
    toast.success('Profile updated')
  } catch {
    toast.error('Failed to update profile')
  } finally {
    savingProfile.value = false
  }
}

// Password form
const passwordForm = reactive({ current: '', new: '', confirm: '' })
const passwordErrors = reactive({ current: '', new: '', confirm: '' })
const savingPassword = ref(false)

async function handleChangePassword() {
  passwordErrors.current = ''
  passwordErrors.new = ''
  passwordErrors.confirm = ''
  if (!passwordForm.current) { passwordErrors.current = 'Current password is required'; return }
  if (!passwordForm.new || passwordForm.new.length < 8) { passwordErrors.new = 'Min 8 characters'; return }
  if (passwordForm.new !== passwordForm.confirm) { passwordErrors.confirm = 'Passwords do not match'; return }
  savingPassword.value = true
  try {
    await authService.changePassword(passwordForm.current, passwordForm.new)
    passwordForm.current = ''; passwordForm.new = ''; passwordForm.confirm = ''
    toast.success('Password changed', 'Your password has been updated successfully.')
  } catch {
    toast.error('Failed to change password', 'Check your current password and try again.')
  } finally {
    savingPassword.value = false
  }
}

// 2FA
type TwoFaState = 'idle' | 'setup' | 'enabled' | 'disabling'
const twoFaState = ref<TwoFaState>('idle')
const twoFaLoading = ref(false)
const twoFaSecret = ref('')
const twoFaQrUrl = ref('')
const twoFaCode = ref('')

async function startSetup2FA() {
  twoFaLoading.value = true
  try {
    const res = await authService.setup2FA()
    twoFaSecret.value = res.secret
    twoFaQrUrl.value = res.qrUrl
    twoFaState.value = 'setup'
    twoFaCode.value = ''
  } catch {
    toast.error('Failed to start 2FA setup')
  } finally {
    twoFaLoading.value = false
  }
}

async function confirmEnable2FA() {
  if (!twoFaCode.value || twoFaCode.value.length !== 6) {
    toast.error('Enter a valid 6-digit code')
    return
  }
  twoFaLoading.value = true
  try {
    await authService.enable2FA(twoFaCode.value)
    twoFaState.value = 'enabled'
    twoFaCode.value = ''
    toast.success('2FA enabled', 'Your account is now protected with two-factor authentication.')
  } catch {
    toast.error('Invalid code', 'The code was incorrect. Please try again.')
  } finally {
    twoFaLoading.value = false
  }
}

async function confirmDisable2FA() {
  if (!twoFaCode.value || twoFaCode.value.length !== 6) {
    toast.error('Enter a valid 6-digit code')
    return
  }
  twoFaLoading.value = true
  try {
    await authService.disable2FA(twoFaCode.value)
    twoFaState.value = 'idle'
    twoFaCode.value = ''
    toast.success('2FA disabled')
  } catch {
    toast.error('Invalid code')
  } finally {
    twoFaLoading.value = false
  }
}

// Notification prefs
const queryClient = useQueryClient()
const { data: savedPrefs } = useQuery({
  queryKey: ['notification-prefs'],
  queryFn: settingsService.getNotificationPreferences,
  staleTime: 60000
})

const notifPrefs = reactive({
  emailAlerts: true,
  ticketUpdates: true,
  healthAlerts: true,
  licenseAlerts: true,
  weeklyDigest: false
})

watch(savedPrefs, v => { if (v) Object.assign(notifPrefs, v) }, { immediate: true })

const savingNotifications = ref(false)

async function saveNotificationSettings() {
  savingNotifications.value = true
  try {
    await settingsService.saveNotificationPreferences({ ...notifPrefs })
    await queryClient.invalidateQueries({ queryKey: ['notification-prefs'] })
    toast.success('Preferences saved')
  } catch {
    toast.error('Failed to save preferences')
  } finally {
    savingNotifications.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl space-y-6">
    <div>
      <h2 class="text-lg font-semibold text-[var(--text)]">Settings</h2>
      <p class="text-sm text-[var(--text-muted)]">Manage your account and preferences</p>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 border-b border-[var(--border)]">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="[
          'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-150 border-b-2 -mb-px',
          activeTab === tab.id
            ? 'border-[var(--primary)] text-[var(--primary)]'
            : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
        ]"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" class="w-4 h-4" />
        {{ tab.label }}
      </button>
    </div>

    <!-- Profile tab -->
    <div v-if="activeTab === 'profile'" class="space-y-4">
      <Card>
        <div class="flex items-center gap-4 mb-5">
          <Avatar :name="authStore.user?.fullName ?? 'User'" size="lg" />
          <div>
            <p class="font-semibold text-[var(--text)]">{{ authStore.user?.fullName }}</p>
            <p class="text-sm text-[var(--text-muted)]">{{ authStore.user?.email }}</p>
            <div class="flex flex-wrap gap-1 mt-1.5">
              <span
                class="text-[10px] font-medium px-1.5 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full uppercase tracking-wide"
              >
                User
              </span>
            </div>
          </div>
        </div>

        <form class="space-y-4" @submit.prevent="handleSaveProfile">
          <Input v-model="profileForm.fullName" label="Full Name" placeholder="Your full name" :error="profileErrors.fullName" required />
          <Input v-model="profileForm.email" label="Email Address" type="email" placeholder="you@company.com" :error="profileErrors.email" required />

          <div class="flex justify-end pt-2">
            <Button type="submit" variant="primary" size="sm" :loading="savingProfile">
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      <!-- Appearance -->
      <Card>
        <template #header>
          <h3 class="text-sm font-semibold text-[var(--text)]">Appearance</h3>
        </template>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-[var(--text)]">Dark Mode</p>
            <p class="text-xs text-[var(--text-muted)] mt-0.5">Switch between light and dark theme</p>
          </div>
          <button
            :class="[
              'relative w-11 h-6 rounded-full transition-colors duration-200',
              themeStore.isDark ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
            ]"
            @click="themeStore.toggle()"
          >
            <span :class="[
              'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 flex items-center justify-center',
              themeStore.isDark ? 'translate-x-5' : 'translate-x-0.5'
            ]">
              <Moon v-if="themeStore.isDark" class="w-2.5 h-2.5 text-indigo-600" />
              <Sun v-else class="w-2.5 h-2.5 text-amber-500" />
            </span>
          </button>
        </div>
      </Card>
    </div>

    <!-- Security tab -->
    <div v-if="activeTab === 'security'" class="space-y-4">
      <Card>
        <template #header>
          <h3 class="text-sm font-semibold text-[var(--text)]">Change Password</h3>
        </template>
        <form class="space-y-4" @submit.prevent="handleChangePassword">
          <Input v-model="passwordForm.current" label="Current Password" type="password" placeholder="Enter current password" :error="passwordErrors.current" required />
          <Input v-model="passwordForm.new" label="New Password" type="password" placeholder="Min 8 characters" :error="passwordErrors.new" required />
          <Input v-model="passwordForm.confirm" label="Confirm New Password" type="password" placeholder="Repeat new password" :error="passwordErrors.confirm" required />
          <div class="flex justify-end pt-2">
            <Button type="submit" variant="primary" size="sm" :loading="savingPassword">
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      <!-- 2FA card -->
      <Card>
        <template #header>
          <div class="flex items-center gap-2">
            <Shield class="w-4 h-4 text-[var(--primary)]" />
            <h3 class="text-sm font-semibold text-[var(--text)]">Two-Factor Authentication</h3>
          </div>
        </template>

        <!-- IDLE: 2FA disabled -->
        <div v-if="twoFaState === 'idle'" class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--surface-raised)]">
              <ShieldOff class="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <div>
              <p class="text-sm font-medium text-[var(--text)]">2FA is disabled</p>
              <p class="text-xs text-[var(--text-muted)] mt-0.5">Add extra security with an authenticator app (Google Authenticator, Authy, etc.).</p>
            </div>
          </div>
          <Button variant="primary" size="sm" :loading="twoFaLoading" @click="startSetup2FA">Enable 2FA</Button>
        </div>

        <!-- SETUP: Show secret + TOTP input -->
        <div v-else-if="twoFaState === 'setup'" class="space-y-4">
          <div class="p-3 bg-[var(--surface-raised)] rounded-lg border border-[var(--border)] space-y-2">
            <p class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">1. Scan this secret in your authenticator app</p>
            <p class="text-base font-mono font-bold tracking-widest text-[var(--primary)] select-all">{{ twoFaSecret }}</p>
            <p class="text-xs text-[var(--text-muted)]">Or copy the URL: <span class="font-mono text-[10px] break-all">{{ twoFaQrUrl }}</span></p>
          </div>
          <div>
            <p class="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">2. Enter the 6-digit code to confirm</p>
            <Input v-model="twoFaCode" type="text" placeholder="000000" maxlength="6" />
          </div>
          <div class="flex gap-2">
            <Button variant="primary" size="sm" :loading="twoFaLoading" @click="confirmEnable2FA">Verify &amp; Enable</Button>
            <Button variant="ghost" size="sm" @click="twoFaState = 'idle'">Cancel</Button>
          </div>
        </div>

        <!-- ENABLED: 2FA active -->
        <div v-else-if="twoFaState === 'enabled'" class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center bg-green-50 dark:bg-green-950">
              <Shield class="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p class="text-sm font-medium text-[var(--text)]">2FA is enabled</p>
              <p class="text-xs text-[var(--text-muted)] mt-0.5">Your account is protected with two-factor authentication.</p>
            </div>
          </div>
          <Button variant="danger" size="sm" @click="twoFaState = 'disabling'">Disable 2FA</Button>
        </div>

        <!-- DISABLING: prompt for code -->
        <div v-else-if="twoFaState === 'disabling'" class="space-y-3">
          <p class="text-sm text-[var(--text)]">Enter your authenticator code to disable 2FA:</p>
          <Input v-model="twoFaCode" type="text" placeholder="000000" maxlength="6" />
          <div class="flex gap-2">
            <Button variant="danger" size="sm" :loading="twoFaLoading" @click="confirmDisable2FA">Disable</Button>
            <Button variant="ghost" size="sm" @click="twoFaState = 'enabled'">Cancel</Button>
          </div>
        </div>
      </Card>
    </div>

    <!-- Notifications tab -->
    <div v-if="activeTab === 'notifications'" class="space-y-4">
      <Card>
        <template #header>
          <h3 class="text-sm font-semibold text-[var(--text)]">Notification Preferences</h3>
        </template>
        <div class="space-y-4">
          <div
            v-for="(pref, _key) in [
              { key: 'emailAlerts', label: 'Email Alerts', desc: 'Receive alerts via email', modelKey: 'emailAlerts' },
              { key: 'ticketUpdates', label: 'Ticket Updates', desc: 'Notify when tickets are updated', modelKey: 'ticketUpdates' },
              { key: 'healthAlerts', label: 'Health Alerts', desc: 'Notify when branches go down', modelKey: 'healthAlerts' },
              { key: 'licenseAlerts', label: 'License Alerts', desc: 'Notify when licenses expire', modelKey: 'licenseAlerts' },
              { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Receive a weekly summary email', modelKey: 'weeklyDigest' }
            ]"
            :key="pref.key"
            class="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-0"
          >
            <div>
              <p class="text-sm font-medium text-[var(--text)]">{{ pref.label }}</p>
              <p class="text-xs text-[var(--text-muted)]">{{ pref.desc }}</p>
            </div>
            <button
              :class="[
                'relative w-11 h-6 rounded-full transition-colors duration-200',
                notifPrefs[pref.modelKey as keyof typeof notifPrefs] ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
              ]"
              @click="notifPrefs[pref.modelKey as keyof typeof notifPrefs] = !notifPrefs[pref.modelKey as keyof typeof notifPrefs]"
            >
              <span :class="[
                'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                notifPrefs[pref.modelKey as keyof typeof notifPrefs] ? 'translate-x-5' : 'translate-x-0.5'
              ]" />
            </button>
          </div>
        </div>
        <div class="flex justify-end mt-4">
          <Button variant="primary" size="sm" :loading="savingNotifications" @click="saveNotificationSettings">
            Save Preferences
          </Button>
        </div>
      </Card>
    </div>
  </div>
</template>
