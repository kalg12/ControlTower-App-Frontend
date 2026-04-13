<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import Card from '@/components/ui/Card.vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import FormField from '@/components/ui/FormField.vue'
import AppDialog from '@/components/ui/AppDialog.vue'
import { settingsService } from '@/services/settings.service'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { Sun, Moon, Shield, Bell } from 'lucide-vue-next'

const { t } = useI18n()
const queryClient = useQueryClient()
const toast = useToast()
const authStore = useAuthStore()
const activeTab = ref('profile')

const { data: settings } = useQuery({
  queryKey: ['notification-settings'],
  queryFn: () => settingsService.getNotificationPreferences(),
  staleTime: 30000,
})

// Password change
const showPasswordDialog = ref(false)
const isChangingPassword = ref(false)

const passwordSchema = z.object({
  current: z.string().min(1, t('settings.currentPasswordRequired')),
  new: z.string().min(8, t('settings.passwordMin')),
  confirm: z.string().min(1, t('settings.passwordConfirmRequired')),
}).refine(d => d.new === d.confirm, { message: t('settings.passwordsDoNotMatch'), path: ['confirm'] })

const passwordForm = useForm({
  validationSchema: toTypedSchema(passwordSchema),
  initialValues: { current: '', new: '', confirm: '' },
})

const [pwCurrent, pwCurrentAttrs] = passwordForm.defineField('current')
const [pwNew, pwNewAttrs] = passwordForm.defineField('new')
const [pwConfirm, pwConfirmAttrs] = passwordForm.defineField('confirm')

const onChangePassword = passwordForm.handleSubmit(async (values) => {
  isChangingPassword.value = true
  try {
    await settingsService.changePassword({ currentPassword: values.current, newPassword: values.new })
    showPasswordDialog.value = false
    toast.success(t('settings.passwordSuccess'))
  } catch {
    toast.error(t('settings.passwordFailed'))
  } finally {
    isChangingPassword.value = false
  }
})

// 2FA
const show2faDialog = ref(false)
const is2faLoading = ref(false)
const twoFaSecret = ref('')
const twoFaQrUrl = ref('')
const twoFaCode = ref('')

async function start2faSetup() {
  is2faLoading.value = true
  try {
    const res = await settingsService.setup2fa()
    twoFaSecret.value = res.secret
    twoFaQrUrl.value = res.qrCodeUrl
    show2faDialog.value = true
  } catch {
    toast.error(t('settings.setupFailed'))
  } finally {
    is2faLoading.value = false
  }
}

const onEnable2fa = async () => {
  if (!twoFaCode.value || twoFaCode.value.length !== 6) {
    toast.error(t('settings.validCode'))
    return
  }
  is2faLoading.value = true
  try {
    await settingsService.enable2fa(twoFaCode.value)
    await authStore.fetchUser()
    show2faDialog.value = false
    toast.success(t('settings.enableSuccess'))
  } catch {
    toast.error(t('settings.invalidCode'))
  } finally {
    is2faLoading.value = false
  }
}

async function disable2fa() {
  is2faLoading.value = true
  try {
    await settingsService.disable2fa()
    await authStore.fetchUser()
    toast.success(t('settings.disableSuccess'))
  } catch {
    toast.error(t('settings.disableFailed'))
  } finally {
    is2faLoading.value = false
  }
}

// Notification preferences
const notifForm = useForm({
  initialValues: { emailAlerts: false, ticketUpdates: false, healthAlerts: false, licenseAlerts: false, weeklyDigest: false },
})

const [emailAlerts] = notifForm.defineField('emailAlerts')
const [ticketUpdates] = notifForm.defineField('ticketUpdates')
const [healthAlerts] = notifForm.defineField('healthAlerts')
const [licenseAlerts] = notifForm.defineField('licenseAlerts')
const [weeklyDigest] = notifForm.defineField('weeklyDigest')

function loadNotifSettings() {
  if (settings.value) {
    notifForm.setValues({
      emailAlerts: settings.value.emailAlerts ?? false,
      ticketUpdates: settings.value.ticketUpdates ?? false,
      healthAlerts: settings.value.healthAlerts ?? false,
      licenseAlerts: settings.value.licenseAlerts ?? false,
      weeklyDigest: settings.value.weeklyDigest ?? false,
    })
  }
}

watch(settings, loadNotifSettings, { immediate: true })

async function saveNotifSettings() {
  try {
    await settingsService.saveNotificationPreferences(notifForm.values)
    toast.success(t('settings.prefsSuccess'))
  } catch {
    toast.error(t('settings.prefsFailed'))
  }
}

function toggle(name: string, model: any) {
  model.value = !model.value
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-lg font-semibold text-[var(--text)]">{{ t('settings.title') }}</h2>
      <p class="text-sm text-[var(--text-muted)]">{{ t('settings.subtitle') }}</p>
    </div>

    <Tabs v-model:value="activeTab">
      <TabList class="flex gap-1 rounded-xl bg-[var(--surface)] p-1">
        <Tab value="profile">{{ t('settings.tabProfile') }}</Tab>
        <Tab value="security">{{ t('settings.tabSecurity') }}</Tab>
        <Tab value="notifications">{{ t('settings.tabNotifications') }}</Tab>
      </TabList>

      <TabPanels class="mt-4">
        <TabPanel value="profile">
          <Card>
            <div class="flex items-center gap-4 mb-6">
              <div class="w-16 h-16 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xl font-semibold">
                {{ authStore.user?.fullName?.charAt(0)?.toUpperCase() || t('settings.avatarFallback') }}
              </div>
              <div>
                <h3 class="text-lg font-semibold text-[var(--text)]">{{ authStore.user?.fullName }}</h3>
                <p class="text-sm text-[var(--text-muted)]">{{ authStore.user?.email }}</p>
                <Tag value="User" severity="secondary" class="mt-1 text-xs" />
              </div>
            </div>
            <div class="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
              <p class="font-medium">{{ t('settings.readOnly') }}</p>
              <p class="text-xs mt-1">{{ t('settings.readOnlyHint') }}</p>
            </div>
          </Card>
        </TabPanel>

        <TabPanel value="security">
          <div class="space-y-6">
            <!-- Appearance -->
            <Card>
              <h3 class="text-sm font-semibold text-[var(--text)] mb-3">{{ t('settings.appearance') }}</h3>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-[var(--text)]">{{ t('settings.darkMode') }}</p>
                  <p class="text-xs text-[var(--text-muted)]">{{ t('settings.darkModeHint') }}</p>
                </div>
                <ThemeToggle />
              </div>
            </Card>

            <!-- Password -->
            <Card>
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-sm font-semibold text-[var(--text)]">{{ t('settings.changePassword') }}</h3>
                  <p class="text-xs text-[var(--text-muted)] mt-1">{{ t('settings.changePasswordHint') }}</p>
                </div>
                <Button :label="t('settings.changePassword')" icon="pi pi-key" size="small" @click="showPasswordDialog = true" />
              </div>
            </Card>

            <!-- 2FA -->
            <Card>
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-sm font-semibold text-[var(--text)]">{{ t('settings.twoFactor') }}</h3>
                  <p class="text-xs text-[var(--text-muted)] mt-1">
                    {{ authStore.user?.twoFaEnabled ? t('settings.twoFaEnabledDesc') : t('settings.twoFaDisabledDesc') }}
                  </p>
                </div>
                <Tag :severity="authStore.user?.twoFaEnabled ? 'success' : 'secondary'" :value="authStore.user?.twoFaEnabled ? t('settings.twoFaEnabled') : t('settings.twoFaDisabled')" />
              </div>
              <div class="flex gap-2 mt-3">
                <Button v-if="!authStore.user?.twoFaEnabled" :label="t('settings.enable2fa')" severity="success" size="small" @click="start2faSetup" />
                <Button v-else :label="t('settings.disable2fa')" severity="danger" outlined size="small" :loading="is2faLoading" @click="disable2fa" />
              </div>
            </Card>
          </div>
        </TabPanel>

        <TabPanel value="notifications">
          <Card>
            <h3 class="text-sm font-semibold text-[var(--text)] mb-4">{{ t('settings.notifPrefs') }}</h3>
            <div class="space-y-4">
              <div v-for="pref in [
                { key: 'emailAlerts', label: t('settings.emailAlerts'), desc: t('settings.emailAlertsDesc') },
                { key: 'ticketUpdates', label: t('settings.ticketUpdates'), desc: t('settings.ticketUpdatesDesc') },
                { key: 'healthAlerts', label: t('settings.healthAlerts'), desc: t('settings.healthAlertsDesc') },
                { key: 'licenseAlerts', label: t('settings.licenseAlerts'), desc: t('settings.licenseAlertsDesc') },
                { key: 'weeklyDigest', label: t('settings.weeklyDigest'), desc: t('settings.weeklyDigestDesc') },
              ]" :key="pref.key" class="flex items-center justify-between py-2">
                <div>
                  <p class="text-sm font-medium text-[var(--text)]">{{ pref.label }}</p>
                  <p class="text-xs text-[var(--text-muted)]">{{ pref.desc }}</p>
                </div>
                <ToggleSwitch v-model="pref.key === 'emailAlerts' ? emailAlerts : pref.key === 'ticketUpdates' ? ticketUpdates : pref.key === 'healthAlerts' ? healthAlerts : pref.key === 'licenseAlerts' ? licenseAlerts : weeklyDigest" />
              </div>
            </div>
            <div class="flex justify-end mt-4">
              <Button :label="t('settings.savePrefs')" @click="saveNotifSettings" />
            </div>
          </Card>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>

  <!-- Password Dialog -->
  <AppDialog v-model:visible="showPasswordDialog" :title="t('settings.changePassword')" :loading="isChangingPassword">
    <form class="flex flex-col gap-4" @submit.prevent="onChangePassword">
      <FormField :label="t('settings.currentPassword')" name="pw-current" :error="passwordForm.errors.value.current" required>
        <InputText v-model="pwCurrent" v-bind="pwCurrentAttrs" type="password" :placeholder="t('settings.currentPasswordPlaceholder')" class="w-full" :disabled="isChangingPassword" />
      </FormField>
      <FormField :label="t('settings.newPassword')" name="pw-new" :error="passwordForm.errors.value.new" required>
        <InputText v-model="pwNew" v-bind="pwNewAttrs" type="password" :placeholder="t('settings.newPasswordPlaceholder')" class="w-full" :disabled="isChangingPassword" />
      </FormField>
      <FormField :label="t('settings.confirmPassword')" name="pw-confirm" :error="passwordForm.errors.value.confirm" required>
        <InputText v-model="pwConfirm" v-bind="pwConfirmAttrs" type="password" :placeholder="t('settings.confirmPasswordPlaceholder')" class="w-full" :disabled="isChangingPassword" />
      </FormField>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined :disabled="isChangingPassword" @click="showPasswordDialog = false" />
        <Button :label="t('settings.updatePassword')" :loading="isChangingPassword" @click="onChangePassword" />
      </div>
    </template>
  </AppDialog>

  <!-- 2FA Setup Dialog -->
  <AppDialog v-model:visible="show2faDialog" :title="t('settings.enable2fa')" :loading="is2faLoading">
    <div class="space-y-4">
      <p class="text-sm text-[var(--text-muted)]">{{ t('settings.scanSecret') }}</p>
      <img v-if="twoFaQrUrl" :src="twoFaQrUrl" alt="QR" class="mx-auto w-48 h-48" />
      <code class="block text-xs bg-[var(--surface-raised)] p-3 rounded text-center select-all">{{ twoFaSecret }}</code>
      <FormField :label="t('settings.enterCode')" name="2fa-code">
        <InputText v-model="twoFaCode" placeholder="000000" maxlength="6" class="w-full text-center text-2xl tracking-widest" />
      </FormField>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined @click="show2faDialog = false" />
        <Button :label="t('settings.verifyEnable')" @click="onEnable2fa" />
      </div>
    </template>
  </AppDialog>
</template>
