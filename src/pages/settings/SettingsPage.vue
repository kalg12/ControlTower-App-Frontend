<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
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
import { notificationsService } from '@/services/notifications.service'
import { calendarSettingsService } from '@/services/calendar-settings.service'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useToast } from '@/composables/useToast'
import { useSlaConfig, useTimeTrackingMutations } from '@/queries/time-tracking'

const { t } = useI18n()
const toast = useToast()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const activeTab = ref('profile')

const avatarUrl = ref(authStore.user?.avatarUrl ?? '')
const savingAvatar = ref(false)

async function saveAvatar() {
  savingAvatar.value = true
  try {
    await authStore.updateAvatar(avatarUrl.value.trim())
    toast.success('Foto de perfil actualizada')
  } catch {
    toast.error('No se pudo actualizar la foto de perfil')
  } finally {
    savingAvatar.value = false
  }
}
const queryClient = useQueryClient()

const { data: preferences } = useQuery({
  queryKey: ['notification-preferences'],
  queryFn: () => notificationsService.getPreferences(),
  staleTime: 30000,
})

const prefMap = computed(() => {
  const map: Record<string, boolean> = {}
  for (const p of preferences.value ?? []) map[p.notificationType] = p.enabled
  return map
})

function isEnabled(type: string): boolean {
  return prefMap.value[type] ?? true
}

const togglingTypes = ref<Set<string>>(new Set())

async function onToggle(type: string, enabled: boolean) {
  togglingTypes.value = new Set([...togglingTypes.value, type])
  try {
    await notificationsService.setPreference(type, enabled)
    await queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
  } catch {
    toast.error(t('settings.prefsFailed'))
  } finally {
    const next = new Set(togglingTypes.value)
    next.delete(type)
    togglingTypes.value = next
  }
}

const notifGroups = [
  {
    label: t('notifications.categories.tickets'),
    types: [
      { type: 'TICKET_ASSIGNED',         label: t('settings.notif.TICKET_ASSIGNED'),         desc: t('settings.notif.TICKET_ASSIGNED_desc') },
      { type: 'TICKET_ESCALATED',        label: t('settings.notif.TICKET_ESCALATED'),        desc: t('settings.notif.TICKET_ESCALATED_desc') },
      { type: 'TICKET_SLA_BREACHED',     label: t('settings.notif.TICKET_SLA_BREACHED'),     desc: t('settings.notif.TICKET_SLA_BREACHED_desc') },
      { type: 'SLA_WARNING',             label: t('settings.notif.SLA_WARNING'),             desc: t('settings.notif.SLA_WARNING_desc') },
      { type: 'CSAT_RESPONSE_RECEIVED',  label: t('settings.notif.CSAT_RESPONSE_RECEIVED'),  desc: t('settings.notif.CSAT_RESPONSE_RECEIVED_desc') },
      { type: 'CSAT_LOW_SCORE',          label: t('settings.notif.CSAT_LOW_SCORE'),          desc: t('settings.notif.CSAT_LOW_SCORE_desc') },
      { type: 'POS_TICKET',              label: t('settings.notif.POS_TICKET'),              desc: t('settings.notif.POS_TICKET_desc') },
    ],
  },
  {
    label: t('notifications.categories.kanban'),
    types: [
      { type: 'CARD_DUE_SOON',    label: t('settings.notif.CARD_DUE_SOON'),    desc: t('settings.notif.CARD_DUE_SOON_desc') },
      { type: 'CARD_OVERDUE',     label: t('settings.notif.CARD_OVERDUE'),     desc: t('settings.notif.CARD_OVERDUE_desc') },
      { type: 'ESTIMATE_EXCEEDED', label: t('settings.notif.ESTIMATE_EXCEEDED'), desc: t('settings.notif.ESTIMATE_EXCEEDED_desc') },
    ],
  },
  {
    label: t('notifications.categories.finance'),
    types: [
      { type: 'INVOICE_DUE_SOON', label: t('settings.notif.INVOICE_DUE_SOON'), desc: t('settings.notif.INVOICE_DUE_SOON_desc') },
      { type: 'INVOICE_OVERDUE',  label: t('settings.notif.INVOICE_OVERDUE'),  desc: t('settings.notif.INVOICE_OVERDUE_desc') },
    ],
  },
  {
    label: t('notifications.categories.system'),
    types: [
      { type: 'HEALTH_INCIDENT',       label: t('settings.notif.HEALTH_INCIDENT'),       desc: t('settings.notif.HEALTH_INCIDENT_desc') },
      { type: 'LICENSE_EXPIRING_SOON', label: t('settings.notif.LICENSE_EXPIRING_SOON'), desc: t('settings.notif.LICENSE_EXPIRING_SOON_desc') },
    ],
  },
]

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

// ── Google Calendar ─────────────────────────────────────────────────
const { data: googleStatus, refetch: refetchGoogle } = useQuery({
  queryKey: ['google-calendar-status'],
  queryFn: () => calendarSettingsService.getStatus(),
  enabled: computed(() => !!authStore.user?.id),
})

const googleConnected = computed(() => googleStatus.value?.connected ?? false)
const googleEmail = computed(() => googleStatus.value?.email)

// ── Translations for Google Calendar ─────────────────────────
const googleCalendarLabel = computed(() => googleConnected.value ? 'Conectado' : 'No conectado')

async function disconnectGoogle() {
  try {
    await calendarSettingsService.disconnect()
    await refetchGoogle()
    toast.success('Google Calendar desconectado')
  } catch {
    toast.error('No se pudo desconectar')
  }
}

async function syncGoogleNow() {
  try {
    await calendarSettingsService.syncNow()
    toast.success('Sincronización iniciada')
  } catch {
    toast.error('No se pudo iniciar sincronización')
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
        <Tab value="google">Google Calendar</Tab>
      </TabList>
      <TabPanels class="mt-4">
        <TabPanel value="profile">
          <div class="space-y-4">
            <Card>
              <div class="flex items-center gap-4 mb-6">
                <Avatar :name="authStore.user?.fullName || t('settings.avatarFallback')" :src="authStore.user?.avatarUrl" size="lg" />
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
            <Card>
              <h3 class="text-sm font-semibold text-[var(--text)] mb-3">Foto de perfil</h3>
              <div class="flex items-center gap-3 mb-3">
                <Avatar :name="authStore.user?.fullName || 'Usuario'" :src="avatarUrl || undefined" size="lg" />
                <p class="text-xs text-[var(--text-muted)]">Vista previa</p>
              </div>
              <div class="flex gap-2">
                <InputText v-model="avatarUrl" placeholder="https://..." class="flex-1 text-sm" />
                <Button label="Guardar" icon="pi pi-check" :loading="savingAvatar" @click="saveAvatar" />
              </div>
              <p class="text-xs text-[var(--text-muted)] mt-1">Ingresa la URL de tu foto de perfil (HTTPS recomendado).</p>
            </Card>
          </div>
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
          <div class="space-y-4">
            <Card v-for="group in notifGroups" :key="group.label">
              <h3 class="text-xs font-semibold uppercase tracking-widest text-[var(--text-placeholder)] mb-3">{{ group.label }}</h3>
              <div class="divide-y divide-[var(--border)]">
                <div
                  v-for="item in group.types"
                  :key="item.type"
                  class="flex items-center justify-between py-3"
                >
                  <div>
                    <p class="text-sm font-medium text-[var(--text)]">{{ item.label }}</p>
                    <p class="text-xs text-[var(--text-muted)]">{{ item.desc }}</p>
                  </div>
                  <ToggleSwitch
                    :model-value="isEnabled(item.type)"
                    :disabled="togglingTypes.has(item.type)"
                    @update:model-value="(val) => onToggle(item.type, val as boolean)"
                  />
                </div>
              </div>
            </Card>
          </div>
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
                    v-model="(item.model as any).value"
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

        <!-- Google Calendar Tab -->
        <TabPanel value="google">
          <Card>
            <div class="mb-4">
              <h3 class="text-sm font-semibold text-[var(--text)]">Integración con Google Calendar</h3>
              <p class="text-xs text-[var(--text-muted)] mt-0.5">
                Sincroniza tus eventos del calendario con Google Calendar. 
                Los eventos se bidireccional: los cambios en cualquiera de los calendarios se reflejarán en ambos.
              </p>
            </div>

            <div class="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <i class="pi pi-calendar text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p class="text-sm font-medium text-[var(--text)]">Google Calendar</p>
                  <p class="text-xs" :class="googleConnected ? 'text-green-600' : 'text-[var(--text-muted)]'">
                    {{ googleCalendarLabel }}
                  </p>
                </div>
                <Tag v-if="googleConnected" severity="success" value="Activo" class="ml-auto" />
              </div>

              <div v-if="googleEmail" class="text-xs text-[var(--text-muted)] mb-4">
                <p>Cuenta: {{ googleEmail }}</p>
              </div>

              <div class="flex gap-2">
                <Button
                  v-if="googleConnected"
                  label="Desconectar"
                  icon="pi pi-times"
                  severity="secondary"
                  outlined
                  size="small"
                  @click="disconnectGoogle"
                />
                <Button
                  v-if="googleConnected"
                  label="Sincronizar ahora"
                  icon="pi pi-sync"
                  size="small"
                  @click="syncGoogleNow"
                />
              </div>

              <div v-if="!googleConnected" class="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <p class="text-xs text-[var(--text-muted)]">
                  <strong>Para conectar:</strong> Crea credenciales OAuth en Google Cloud Console y configura las variables de entorno.
                </p>
              </div>
            </div>
          </Card>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
