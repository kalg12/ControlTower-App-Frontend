<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { usersService } from '@/services/users.service'
import { authService } from '@/services/auth.service'
import { useToast } from '@/composables/useToast'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Card from '@/components/ui/Card.vue'
import Avatar from '@/components/ui/Avatar.vue'
import { User, Lock, Bell, Sun, Moon, Shield, ShieldOff } from 'lucide-vue-next'

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
  savingProfile.value = true
  try {
    await usersService.updateMe({ fullName: profileForm.fullName, email: profileForm.email })
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

// Notification prefs
const notifPrefs = reactive({
  emailAlerts: true,
  ticketUpdates: true,
  healthAlerts: true,
  licenseAlerts: true,
  weeklyDigest: false
})
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
                v-for="role in authStore.user?.roles"
                :key="role"
                class="text-[10px] font-medium px-1.5 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full uppercase tracking-wide"
              >
                {{ role }}
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

      <Card>
        <template #header>
          <h3 class="text-sm font-semibold text-[var(--text)]">Two-Factor Authentication</h3>
        </template>
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-3">
            <div :class="['w-9 h-9 rounded-lg flex items-center justify-center', authStore.user?.twoFactorEnabled ? 'bg-green-50 dark:bg-green-950' : 'bg-[var(--surface-raised)]']">
              <Shield v-if="authStore.user?.twoFactorEnabled" class="w-5 h-5 text-green-600 dark:text-green-400" />
              <ShieldOff v-else class="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <div>
              <p class="text-sm font-medium text-[var(--text)]">
                {{ authStore.user?.twoFactorEnabled ? '2FA is enabled' : '2FA is disabled' }}
              </p>
              <p class="text-xs text-[var(--text-muted)] mt-0.5">
                {{ authStore.user?.twoFactorEnabled
                  ? 'Your account is protected with two-factor authentication.'
                  : 'Add extra security with an authenticator app.' }}
              </p>
            </div>
          </div>
          <Button
            :variant="authStore.user?.twoFactorEnabled ? 'danger' : 'primary'"
            size="sm"
          >
            {{ authStore.user?.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA' }}
          </Button>
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
          <Button variant="primary" size="sm" @click="toast.success('Preferences saved')">
            Save Preferences
          </Button>
        </div>
      </Card>
    </div>
  </div>
</template>
