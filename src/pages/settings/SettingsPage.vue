<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import { useForm } from 'vee-validate'
import Card from '@/components/ui/Card.vue'
import Avatar from '@/components/ui/Avatar.vue'
import PageInfoButton from '@/components/ui/PageInfoButton.vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import ToggleSwitch from 'primevue/toggleswitch'
import Tag from 'primevue/tag'
import { settingsService } from '@/services/settings.service'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useToast } from '@/composables/useToast'
import { useSlaConfig, useTimeTrackingMutations } from '@/queries/time-tracking'

const { t } = useI18n()
const toast = useToast()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const activeTab = ref('profile')

const { data: settings } = useQuery({
  queryKey: ['notification-settings'],
  queryFn: () => settingsService.getNotificationPreferences(),
  staleTime: 30000,
})

const notifForm = useForm({
  initialValues: { emailAlerts: false, ticketUpdates: false, healthAlerts: false, licenseAlerts: false, weeklyDigest: false },
})

const [emailAlerts] = notifForm.defineField('emailAlerts')
const [ticketUpdates] = notifForm.defineField('ticketUpdates')
const [healthAlerts] = notifForm.defineField('healthAlerts')
const [licenseAlerts] = notifForm.defineField('licenseAlerts')
const [weeklyDigest] = notifForm.defineField('weeklyDigest')

watch(settings, (val) => {
  if (val) {
    notifForm.setValues({
      emailAlerts: val.emailAlerts ?? false,
      ticketUpdates: val.ticketUpdates ?? false,
      healthAlerts: val.healthAlerts ?? false,
      licenseAlerts: val.licenseAlerts ?? false,
      weeklyDigest: val.weeklyDigest ?? false,
    })
  }
}, { immediate: true })

async function saveNotifSettings() {
  try {
    await settingsService.saveNotificationPreferences(notifForm.values)
    toast.success(t('settings.prefsSuccess'))
  } catch {
    toast.error(t('settings.prefsFailed'))
  }
}

// ── SLA Configuration ─────────────────────────────────────────────
const { data: slaConfig, isLoading: loadingSla } = useSlaConfig()
const { updateSlaConfig } = useTimeTrackingMutations()

const slaLow      = ref<number>(48)
const slaMedium   = ref<number>(24)
const slaHigh     = ref<number>(8)
const slaCritical = ref<number>(2)
const savingSla   = ref(false)

watch(slaConfig, (cfg) => {
  if (cfg) {
    slaLow.value      = cfg.low
    slaMedium.value   = cfg.medium
    slaHigh.value     = cfg.high
    slaCritical.value = cfg.critical
  }
}, { immediate: true })

async function saveSlaConfig() {
  savingSla.value = true
  try {
    await updateSlaConfig.mutateAsync({
      low:      slaLow.value,
      medium:   slaMedium.value,
      high:     slaHigh.value,
      critical: slaCritical.value,
    })
    toast.success('Configuración SLA guardada')
  } catch {
    toast.error('No se pudo guardar la configuración SLA')
  } finally {
    savingSla.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-2">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">{{ t('settings.title') }}</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ t('settings.subtitle') }}</p>
      </div>
      <PageInfoButton :title="t('settings.title')" :description="t('pageInfo.settings')" />
    </div>
    <Tabs v-model:value="activeTab">
      <TabList class="flex gap-1 rounded-xl bg-[var(--surface)] p-1">
        <Tab value="profile">{{ t('settings.tabProfile') }}</Tab>
        <Tab value="security">{{ t('settings.tabSecurity') }}</Tab>
        <Tab value="notifications">{{ t('settings.tabNotifications') }}</Tab>
        <Tab value="sla">Configuración SLA</Tab>
      </TabList>
      <TabPanels class="mt-4">
        <TabPanel value="profile">
          <Card>
            <div class="flex items-center gap-4 mb-6">
              <Avatar :name="authStore.user?.fullName || t('settings.avatarFallback')" size="lg" />
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
            <Card>
              <h3 class="text-sm font-semibold text-[var(--text)] mb-3">{{ t('settings.appearance') }}</h3>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium text-[var(--text)]">{{ t('settings.darkMode') }}</p>
                  <p class="text-xs text-[var(--text-muted)]">{{ t('settings.darkModeHint') }}</p>
                </div>
                <ToggleSwitch v-model="themeStore.isDark" />
              </div>
            </Card>
          </div>
        </TabPanel>
        <TabPanel value="notifications">
          <Card>
            <h3 class="text-sm font-semibold text-[var(--text)] mb-4">{{ t('settings.notifPrefs') }}</h3>
            <div class="space-y-4">
              <div v-for="pref in [
                { label: t('settings.emailAlerts'), desc: t('settings.emailAlertsDesc'), model: emailAlerts },
                { label: t('settings.ticketUpdates'), desc: t('settings.ticketUpdatesDesc'), model: ticketUpdates },
                { label: t('settings.healthAlerts'), desc: t('settings.healthAlertsDesc'), model: healthAlerts },
                { label: t('settings.licenseAlerts'), desc: t('settings.licenseAlertsDesc'), model: licenseAlerts },
                { label: t('settings.weeklyDigest'), desc: t('settings.weeklyDigestDesc'), model: weeklyDigest },
              ]" :key="pref.label" class="flex items-center justify-between py-2">
                <div><p class="text-sm font-medium text-[var(--text)]">{{ pref.label }}</p><p class="text-xs text-[var(--text-muted)]">{{ pref.desc }}</p></div>
                <ToggleSwitch v-model="pref.model" />
              </div>
            </div>
            <div class="flex justify-end mt-4"><Button :label="t('settings.savePrefs')" @click="saveNotifSettings" /></div>
          </Card>
        </TabPanel>

        <!-- SLA Configuration Tab -->
        <TabPanel value="sla">
          <Card>
            <div class="mb-4">
              <h3 class="text-sm font-semibold text-[var(--text)]">Ventanas SLA por prioridad</h3>
              <p class="text-xs text-[var(--text-muted)] mt-0.5">
                Define cuántas horas tienen los agentes para resolver un ticket según su prioridad.
                Los nuevos tickets usarán automáticamente estos valores.
              </p>
            </div>

            <div v-if="loadingSla" class="space-y-3">
              <div v-for="i in 4" :key="i" class="h-12 rounded-lg bg-muted/40 animate-pulse" />
            </div>

            <div v-else class="space-y-4">
              <div v-for="item in [
                { label: 'LOW — Baja prioridad',     desc: 'Para incidencias de baja urgencia',     model: slaLow,      placeholder: '48' },
                { label: 'MEDIUM — Prioridad media', desc: 'Para incidencias estándar',              model: slaMedium,   placeholder: '24' },
                { label: 'HIGH — Alta prioridad',    desc: 'Para incidencias urgentes',              model: slaHigh,     placeholder: '8' },
                { label: 'CRITICAL — Crítica',       desc: 'Para caídas del sistema o emergencias',  model: slaCritical, placeholder: '2' },
              ]" :key="item.label" class="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-[var(--text)]">{{ item.label }}</p>
                  <p class="text-xs text-[var(--text-muted)]">{{ item.desc }}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <InputText
                    v-model.number="item.model.value"
                    type="number"
                    min="1"
                    :placeholder="item.placeholder"
                    class="w-20 text-right"
                  />
                  <span class="text-sm text-[var(--text-muted)]">h</span>
                </div>
              </div>
            </div>

            <div class="flex justify-end mt-5">
              <Button
                label="Guardar configuración SLA"
                icon="pi pi-check"
                :loading="savingSla"
                @click="saveSlaConfig"
              />
            </div>
          </Card>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
