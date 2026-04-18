<script setup lang="ts">
import { computed, ref, watch, onMounted, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import DataTable from 'primevue/datatable'
import type DataTableGlobal from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Paginator from 'primevue/paginator'
import Card from '@/components/ui/Card.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import AppDialog from '@/components/ui/AppDialog.vue'
import FormField from '@/components/ui/FormField.vue'
import PageInfoButton from '@/components/ui/PageInfoButton.vue'
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-vue-next'
import { useConfirm } from 'primevue/useconfirm'
import { healthService } from '@/services/health.service'
import { integrationsService } from '@/services/integrations.service'
import { clientsService } from '@/services/clients.service'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import type { HealthCheck, HealthIncident, HealthStatus } from '@/types/health'
import type { Integration } from '@/types/integration'
import type { Client, ClientBranch } from '@/types/client'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'

dayjs.extend(relativeTime)

const { t, locale } = useI18n()

// Set dayjs locale to match app locale
watch(locale, (loc) => {
  dayjs.locale(loc === 'es' ? 'es' : 'en')
}, { immediate: true })

const toast = useToast()
const confirm = useConfirm()
const queryClient = useQueryClient()
const route = useRoute()

// ── Incident log with pagination ──────────────────────────────────────

const logOpenOnly = ref(false)
const incidentTableRef = ref<InstanceType<typeof DataTableGlobal> | null>(null)
const logBranchId = ref<string | undefined>(undefined)
const logPage = ref(0)
const logPageSize = 20

onMounted(() => {
  const incidentParam = route.query.incident as string | undefined
  if (incidentParam) {
    logOpenOnly.value = true
    setTimeout(() => {
      const row = incidents.value?.find(i => i.id === incidentParam)
      if (row && incidentTableRef.value) {
        incidentTableRef.value.toggleRowSelection(row, true)
      }
    }, 100)
  }
})

const { data: checks, isLoading, isError, refetch } = useQuery({
  queryKey: ['health-clients'],
  queryFn: () => healthService.getClients(),
  staleTime: 0,
  refetchInterval: 30000 // auto-refresh every 30s
})

const { data: incidentLogPage, isLoading: isLoadingIncidents, refetch: refetchLog } = useQuery({
  queryKey: computed(() => ['health-incident-log', logOpenOnly.value, logBranchId.value, logPage.value]),
  queryFn: () => healthService.getIncidentLog({
    page: logPage.value,
    size: logPageSize,
    openOnly: logOpenOnly.value,
    branchId: logBranchId.value,
  }),
  staleTime: 0,
  refetchInterval: 30000,
})

// Reset page when filters change
watch([logOpenOnly, logBranchId], () => {
  logPage.value = 0
})

const items = computed(() => checks.value ?? [])
const incidents = computed(() => incidentLogPage.value?.content ?? [])
const incidentTotalElements = computed(() => incidentLogPage.value?.totalElements ?? 0)

const summary = computed(() => {
  const arr = items.value
  return {
    total: arr.length,
    up: arr.filter(c => c.status === 'UP' || c.status === 'HEALTHY').length,
    degraded: arr.filter(c => c.status === 'DEGRADED').length,
    down: arr.filter(c => c.status === 'DOWN').length
  }
})

function statusSeverity(status: HealthStatus): 'success' | 'warn' | 'danger' | 'secondary' {
  if (status === 'UP' || status === 'HEALTHY') return 'success'
  if (status === 'DEGRADED') return 'warn'
  if (status === 'DOWN') return 'danger'
  return 'secondary'
}

function incidentSeverity(severity: string): 'danger' | 'warn' | 'info' | 'secondary' {
  const s = severity?.toUpperCase()
  if (s === 'CRITICAL' || s === 'HIGH') return 'danger'
  if (s === 'MEDIUM' || s === 'WARNING') return 'warn'
  if (s === 'LOW') return 'info'
  return 'secondary'
}

function formatTime(dateStr: string) {
  return dayjs(dateStr).fromNow()
}

function formatDateTime(dateStr: string) {
  return dayjs(dateStr).format('DD MMM YYYY, HH:mm')
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

function latencyClass(ms?: number) {
  if (!ms) return 'text-[var(--text-muted)]'
  if (ms > 500) return 'text-red-500 font-medium'
  if (ms > 200) return 'text-amber-500 font-medium'
  return 'text-green-500 font-medium'
}

function confirmResolveIncident(incident: HealthIncident) {
  if (!incident.id) return
  const where = incident.branchName ?? incident.branchId
  confirm.require({
    message: t('health.resolveConfirm', { branch: where }),
    header: t('health.resolveTitle'),
    icon: 'pi pi-check-circle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('health.resolve'), severity: 'success' },
    accept: async () => {
      try {
        await healthService.resolveIncident(incident.id!)
        queryClient.invalidateQueries({ queryKey: ['health-incident-log'] })
        queryClient.invalidateQueries({ queryKey: ['health-clients'] })
        toast.success(t('health.resolveSuccess'))
      } catch {
        toast.error(t('health.resolveFailed'))
      }
    }
  })
}

// ── Monitored POS Endpoints (paginated) ───────────────────────────────

const authStore = useAuthStore()
const canWriteIntegrations = computed(() => authStore.hasPermission('integration:write'))

const posPageNum = ref(0)
const posPageSize = 10

const { data: posPage, isLoading: isLoadingPos, refetch: refetchPos } = useQuery({
  queryKey: computed(() => ['integrations-pos', posPageNum.value]),
  queryFn: () => integrationsService.list(posPageNum.value, posPageSize, 'POS'),
  staleTime: 30000,
})
const posEndpoints = computed(() => posPage.value?.content ?? [])
const posTotalElements = computed(() => posPage.value?.totalElements ?? 0)

watch(posPageNum, () => {
  refetchPos()
})

// ── Register POS modal ────────────────────────────────────────────────

const showRegisterModal = ref(false)
const isSubmittingPos = ref(false)
const clients = ref<Client[]>([])
const branches = ref<ClientBranch[]>([])
const isLoadingClients = ref(false)
const isLoadingBranches = ref(false)

const posSchema = z.object({
  clientId:                  z.string().min(1, t('health.formClient')),
  clientBranchId:            z.string().min(1, t('health.formBranch')),
  pullUrl:                   z.string().url(t('health.formPullUrl')),
  apiKey:                    z.string().optional(),
  heartbeatIntervalSeconds:  z.number().int().min(30).max(86400),
})

const { handleSubmit: handlePosSubmit, errors: posErrors, resetForm: resetPosForm, defineField: definePosField } = useForm({
  validationSchema: toTypedSchema(posSchema),
  initialValues: { clientId: '', clientBranchId: '', pullUrl: '', apiKey: '', heartbeatIntervalSeconds: 300 },
})

const [clientIdValue]    = definePosField('clientId')
const [branchIdValue]    = definePosField('clientBranchId')
const [pullUrlValue]     = definePosField('pullUrl')
const [apiKeyValue]      = definePosField('apiKey')
const [heartbeatValue]   = definePosField('heartbeatIntervalSeconds')

watch(clientIdValue, async (newId) => {
  branchIdValue.value = ''
  branches.value = []
  if (!newId) return
  isLoadingBranches.value = true
  try {
    branches.value = await clientsService.getBranches(newId as string)
  } finally {
    isLoadingBranches.value = false
  }
})

async function openRegisterModal() {
  resetPosForm()
  branches.value = []
  isLoadingClients.value = true
  showRegisterModal.value = true
  try {
    const res = await clientsService.list({ size: 200 })
    clients.value = res.content
  } finally {
    isLoadingClients.value = false
  }
}

const onSubmitPos = handlePosSubmit(async (values) => {
  isSubmittingPos.value = true
  try {
    await integrationsService.create({
      type: 'POS',
      clientBranchId: values.clientBranchId,
      pullUrl: values.pullUrl,
      apiKey: values.apiKey || undefined,
      heartbeatIntervalSeconds: values.heartbeatIntervalSeconds,
    })
    await queryClient.invalidateQueries({ queryKey: ['integrations-pos'] })
    showRegisterModal.value = false
    toast.success(t('health.registerSuccess'))
  } catch {
    toast.error(t('health.registerFailed'))
  } finally {
    isSubmittingPos.value = false
  }
})

function confirmTogglePosEndpoint(ep: Integration) {
  const activating = !ep.active
  confirm.require({
    message: activating ? t('health.activateConfirm') : t('health.deactivateConfirm'),
    header: activating ? t('health.activateTitle') : t('health.deactivateTitle'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: activating ? t('health.activate') : t('health.deactivate'), severity: activating ? 'success' : 'warn' },
    accept: async () => {
      try {
        if (ep.active) await integrationsService.deactivate(ep.id)
        else await integrationsService.activate(ep.id)
        await queryClient.invalidateQueries({ queryKey: ['integrations-pos'] })
        toast.success(activating ? t('health.activateSuccess') : t('health.deactivateSuccess'))
      } catch {
        toast.error(t('health.updateFailed'))
      }
    }
  })
}

function confirmDeletePosEndpoint(ep: Integration) {
  confirm.require({
    message: t('health.removeConfirm'),
    header: t('health.removeTitle'),
    icon: 'pi pi-trash',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('health.remove'), severity: 'danger' },
    accept: async () => {
      try {
        await integrationsService.delete(ep.id)
        await queryClient.invalidateQueries({ queryKey: ['integrations-pos'] })
        toast.success(t('health.removeSuccess'))
      } catch {
        toast.error(t('health.removeFailed'))
      }
    }
  })
}

const isCheckingNow = ref<string | null>(null)

async function checkNow(ep: Integration) {
  isCheckingNow.value = ep.id
  try {
    await integrationsService.checkNow(ep.id)
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['health-clients'] })
      queryClient.invalidateQueries({ queryKey: ['health-incident-log'] })
      isCheckingNow.value = null
    }, 2500)
  } catch {
    toast.error(t('health.checkFailed'))
    isCheckingNow.value = null
  }
}

function statusLabel(status: HealthStatus) {
  if (status === 'UP' || status === 'HEALTHY') return t('health.upHealthy')
  if (status === 'DEGRADED') return t('health.degraded')
  if (status === 'DOWN') return t('health.down')
  return status
}

function incidentStatusLabel(open: boolean) {
  return open ? t('health.open') : t('health.resolved')
}

function endpointStatusLabel(active: boolean) {
  return active ? t('health.active') : t('health.inactive')
}

const branchOptions = computed(() => {
  const base = items.value.map(c => ({ label: c.branchName ?? c.branchId, value: c.branchId }))
  return [{ label: t('health.allBranches'), value: undefined }, ...base]
})
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div>
          <h2 class="text-lg font-semibold text-[var(--text)]">{{ t('health.title') }}</h2>
          <p class="text-sm text-[var(--text-muted)]">{{ t('health.subtitle') }}</p>
        </div>
        <PageInfoButton :title="t('health.title')" :description="t('pageInfo.health')" />
      </div>
      <Button icon="pi pi-refresh" severity="secondary" outlined @click="refetch()" />
    </div>

    <!-- Error -->
    <div v-if="isError && !isLoading" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
      <span>{{ t('health.loadFailed') }}</span>
      <Button :label="t('common.retry')" size="small" severity="danger" text @click="refetch()" />
    </div>

    <!-- Loading -->
    <template v-if="isLoading">
      <div class="grid grid-cols-3 gap-4">
        <SkeletonCard v-for="i in 3" :key="i" />
      </div>
      <SkeletonTable :rows="5" :cols="5" />
    </template>

    <template v-else>
      <!-- Summary cards -->
      <div class="grid grid-cols-3 gap-4">
        <Card>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-950 flex items-center justify-center">
              <CheckCircle class="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p class="text-2xl font-bold text-[var(--text)]">{{ summary.up }}</p>
              <p class="text-xs text-[var(--text-muted)] font-medium">{{ t('health.upHealthy') }}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
              <AlertTriangle class="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p class="text-2xl font-bold text-[var(--text)]">{{ summary.degraded }}</p>
              <p class="text-xs text-[var(--text-muted)] font-medium">{{ t('health.degraded') }}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-red-50 dark:bg-red-950 flex items-center justify-center">
              <XCircle class="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p class="text-2xl font-bold text-[var(--text)]">{{ summary.down }}</p>
              <p class="text-xs text-[var(--text-muted)] font-medium">{{ t('health.down') }}</p>
            </div>
          </div>
        </Card>
      </div>

      <!-- Health checks table -->
      <DataTable
        :value="items"
        :loading="false"
        removable-sort
        striped-rows
        class="rounded-xl overflow-hidden"
      >
        <Column field="branchName" :header="t('health.branch')" sortable style="min-width: 180px">
          <template #body="{ data: row }: { data: HealthCheck }">
            <div>
              <span class="font-medium text-[var(--text)]">{{ row.branchName ?? '—' }}</span>
              <span class="block text-xs text-[var(--text-muted)] font-mono">{{ row.branchId }}</span>
              <span
                v-if="row.status === 'DOWN' && row.errorMessage"
                class="block text-xs text-red-400 mt-0.5 break-all"
                :title="row.errorMessage"
              >
                ⚠ {{ row.errorMessage.length > 80 ? row.errorMessage.slice(0, 80) + '…' : row.errorMessage }}
              </span>
            </div>
          </template>
        </Column>

        <Column field="status" :header="t('health.status')" style="width: 130px">
          <template #body="{ data: row }: { data: HealthCheck }">
            <Tag :severity="statusSeverity(row.status)" :value="statusLabel(row.status)" />
          </template>
        </Column>

        <Column field="latencyMs" :header="t('health.latency')" sortable style="width: 110px">
          <template #body="{ data: row }: { data: HealthCheck }">
            <span :class="latencyClass(row.latencyMs)">
              {{ row.latencyMs != null ? `${row.latencyMs}ms` : '—' }}
            </span>
          </template>
        </Column>

        <Column field="version" :header="t('health.version')" style="width: 110px">
          <template #body="{ data: row }: { data: HealthCheck }">
            <span class="text-[var(--text-muted)] text-sm font-mono">{{ row.version ?? '—' }}</span>
          </template>
        </Column>

        <Column field="openIncidents" :header="t('health.openIncidents')" style="width: 130px">
          <template #body="{ data: row }: { data: HealthCheck }">
            <Tag
              :severity="row.openIncidents > 0 ? 'danger' : 'success'"
              :value="String(row.openIncidents)"
            />
          </template>
        </Column>

        <Column field="lastCheckedAt" :header="t('health.lastCheck')" sortable style="width: 140px">
          <template #body="{ data: row }: { data: HealthCheck }">
            <span class="text-[var(--text-muted)] text-sm">{{ formatTime(row.lastCheckedAt) }}</span>
          </template>
        </Column>

        <template #empty>
          <div class="text-center py-8 text-[var(--text-muted)]">{{ t('health.noData') }}</div>
        </template>
      </DataTable>

      <!-- Incident Log -->
      <div>
        <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h3 class="text-base font-semibold text-[var(--text)]">{{ t('health.incidentLog') }}</h3>
            <p class="text-xs text-[var(--text-muted)]">{{ t('health.incidentLogSubtitle') }}</p>
          </div>
          <div class="flex items-center gap-2">
            <!-- Branch filter -->
            <Select
              v-model="logBranchId"
              :options="branchOptions"
              option-label="label"
              option-value="value"
              :placeholder="t('health.allBranches')"
              size="small"
              class="w-44"
            />
            <!-- Status filter -->
            <Select
              v-model="logOpenOnly"
              :options="[
                { label: t('health.all'), value: false },
                { label: t('health.openOnly'), value: true }
              ]"
              option-label="label"
              option-value="value"
              size="small"
              class="w-32"
            />
            <Button icon="pi pi-refresh" severity="secondary" outlined size="small" @click="refetchLog()" />
          </div>
        </div>

        <SkeletonTable v-if="isLoadingIncidents" :rows="5" :cols="6" />

        <template v-else>
          <DataTable
            ref="incidentTableRef"
            :value="incidents"
            removable-sort
            striped-rows
            class="rounded-xl overflow-hidden"
            scrollable
            scroll-height="400px"
          >
            <Column field="severity" :header="t('health.severity')" style="width: 110px">
              <template #body="{ data: row }: { data: HealthIncident }">
                <Tag :severity="incidentSeverity(row.severity)" :value="row.severity" />
              </template>
            </Column>

            <Column field="branchName" :header="t('health.branch')" style="width: 170px">
              <template #body="{ data: row }: { data: HealthIncident }">
                <div>
                  <span class="text-sm font-medium text-[var(--text)]">{{ row.branchName ?? '—' }}</span>
                  <span class="block text-xs text-[var(--text-muted)] font-mono truncate max-w-[140px]" :title="row.branchId">{{ row.branchId }}</span>
                </div>
              </template>
            </Column>

            <Column field="description" :header="t('health.description')" style="min-width: 220px">
              <template #body="{ data: row }: { data: HealthIncident }">
                <span class="text-sm text-[var(--text)] break-words">{{ row.description }}</span>
              </template>
            </Column>

            <Column field="openedAt" :header="t('health.started')" sortable style="width: 150px">
              <template #body="{ data: row }: { data: HealthIncident }">
                <div>
                  <span class="text-sm text-[var(--text-muted)]">{{ formatDateTime(row.openedAt) }}</span>
                  <span class="block text-xs text-[var(--text-muted)]">{{ formatTime(row.openedAt) }}</span>
                </div>
              </template>
            </Column>

            <Column field="durationSeconds" :header="t('health.duration')" sortable style="width: 100px">
              <template #body="{ data: row }: { data: HealthIncident }">
                <span
                  class="text-sm font-medium"
                  :class="row.open ? 'text-red-500' : 'text-[var(--text-muted)]'"
                >
                  {{ formatDuration(row.durationSeconds) }}
                </span>
              </template>
            </Column>

            <Column field="open" :header="t('health.status')" style="width: 110px">
              <template #body="{ data: row }: { data: HealthIncident }">
                <Tag
                  :severity="row.open ? 'danger' : 'success'"
                  :value="incidentStatusLabel(row.open)"
                />
              </template>
            </Column>

            <Column header="" style="width: 110px">
              <template #body="{ data: row }: { data: HealthIncident }">
                <Button
                  v-if="row.open && row.id"
                  :label="t('health.resolve')"
                  size="small"
                  severity="secondary"
                  outlined
                  @click="confirmResolveIncident(row)"
                />
                <span v-else-if="row.resolvedAt" class="text-xs text-[var(--text-muted)]">
                  {{ formatTime(row.resolvedAt) }}
                </span>
              </template>
            </Column>

            <template #empty>
              <div class="text-center py-8 text-[var(--text-muted)]">{{ t('health.noIncidents') }}</div>
            </template>
          </DataTable>

          <!-- Incident log paginator -->
          <Paginator
            v-if="incidentTotalElements > logPageSize"
            :rows="logPageSize"
            :total-records="incidentTotalElements"
            :page="logPage"
            @page="logPage = $event.page"
            class="rounded-xl mt-2"
          />
        </template>
      </div>

      <!-- Monitored POS Endpoints -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <div>
            <h3 class="text-base font-semibold text-[var(--text)]">{{ t('health.monitoredEndpoints') }}</h3>
            <p class="text-xs text-[var(--text-muted)]">{{ t('health.endpointsSubtitle') }}</p>
          </div>
          <div class="flex gap-2">
            <Button icon="pi pi-refresh" severity="secondary" outlined size="small" @click="refetchPos()" />
            <Button
              v-if="canWriteIntegrations"
              :label="t('health.registerPos')"
              icon="pi pi-plus"
              size="small"
              @click="openRegisterModal"
            />
          </div>
        </div>

        <SkeletonTable v-if="isLoadingPos" :rows="3" :cols="5" />

        <template v-else>
          <DataTable
            :value="posEndpoints"
            removable-sort
            striped-rows
            class="rounded-xl overflow-hidden"
          >
            <Column field="clientBranchId" :header="t('health.branchId')" style="min-width: 200px">
              <template #body="{ data: row }: { data: Integration }">
                <span class="text-xs text-[var(--text-muted)] font-mono">{{ row.clientBranchId ?? '—' }}</span>
              </template>
            </Column>

            <Column field="pullUrl" :header="t('health.pullUrl')" style="min-width: 240px">
              <template #body="{ data: row }: { data: Integration }">
                <span class="text-xs text-[var(--text-muted)] font-mono truncate block max-w-xs" :title="row.pullUrl">
                  {{ row.pullUrl ?? '—' }}
                </span>
              </template>
            </Column>

            <Column field="heartbeatIntervalSeconds" :header="t('health.interval')" sortable style="width: 100px">
              <template #body="{ data: row }: { data: Integration }">
                <span class="text-sm text-[var(--text-muted)]">{{ row.heartbeatIntervalSeconds }}s</span>
              </template>
            </Column>

            <Column field="active" :header="t('health.status')" style="width: 110px">
              <template #body="{ data: row }: { data: Integration }">
                <Tag :severity="row.active ? 'success' : 'secondary'" :value="endpointStatusLabel(row.active)" />
              </template>
            </Column>

            <Column v-if="canWriteIntegrations" :header="t('health.actions')" style="width: 130px">
              <template #body="{ data: row }: { data: Integration }">
                <div class="flex gap-1">
                  <Button
                    icon="pi pi-refresh"
                    severity="info"
                    text rounded size="small"
                    :loading="isCheckingNow === row.id"
                    v-tooltip.top="t('health.checkNow')"
                    @click="checkNow(row)"
                  />
                  <Button
                    :icon="row.active ? 'pi pi-pause' : 'pi pi-play'"
                    :severity="row.active ? 'warn' : 'success'"
                    text rounded size="small"
                    v-tooltip.top="row.active ? t('health.deactivate') : t('health.activate')"
                    @click="confirmTogglePosEndpoint(row)"
                  />
                  <Button
                    icon="pi pi-trash"
                    severity="danger"
                    text rounded size="small"
                    v-tooltip.top="t('health.remove')"
                    @click="confirmDeletePosEndpoint(row)"
                  />
                </div>
              </template>
            </Column>

            <template #empty>
              <div class="text-center py-6 text-[var(--text-muted)]">
                {{ t('health.noEndpoints') }}
              </div>
            </template>
          </DataTable>

          <!-- POS endpoints paginator -->
          <Paginator
            v-if="posTotalElements > posPageSize"
            :rows="posPageSize"
            :total-records="posTotalElements"
            :page="posPageNum"
            @page="posPageNum = $event.page"
            class="rounded-xl mt-2"
          />
        </template>
      </div>
    </template>
  </div>

  <!-- Register POS Modal -->
  <AppDialog
    v-model:visible="showRegisterModal"
    :title="t('health.registerTitle')"
    :loading="isSubmittingPos"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onSubmitPos">
      <FormField :label="t('health.formClient')" name="clientId" :error="posErrors.clientId" required>
        <Select
          v-model="clientIdValue"
          :options="clients"
          option-label="name"
          option-value="id"
          :placeholder="t('health.formClient')"
          :loading="isLoadingClients"
          :disabled="isSubmittingPos"
          class="w-full"
          filter
        />
      </FormField>

      <FormField :label="t('health.formBranch')" name="clientBranchId" :error="posErrors.clientBranchId" required>
        <Select
          v-model="branchIdValue"
          :options="branches"
          option-label="name"
          option-value="id"
          :placeholder="t('health.formBranch')"
          :loading="isLoadingBranches"
          :disabled="!clientIdValue || isSubmittingPos"
          class="w-full"
        />
      </FormField>

      <FormField :label="t('health.formPullUrl')" name="pullUrl" :error="posErrors.pullUrl" required>
        <InputText
          v-model="pullUrlValue"
          :placeholder="t('health.formPullUrl')"
          :disabled="isSubmittingPos"
          class="w-full"
        />
      </FormField>

      <FormField :label="t('health.formApiKey')" name="apiKey" :error="posErrors.apiKey">
        <InputText
          v-model="apiKeyValue"
          :placeholder="t('health.formApiKey')"
          :disabled="isSubmittingPos"
          class="w-full"
        />
      </FormField>

      <FormField :label="t('health.formInterval')" name="heartbeatIntervalSeconds" :error="posErrors.heartbeatIntervalSeconds">
        <InputNumber
          v-model="heartbeatValue"
          :min="30"
          :max="86400"
          :disabled="isSubmittingPos"
          class="w-full"
        />
      </FormField>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined :disabled="isSubmittingPos" @click="showRegisterModal = false" />
        <Button :label="t('health.registerPos')" :loading="isSubmittingPos" @click="onSubmitPos" />
      </div>
    </template>
  </AppDialog>
</template>
