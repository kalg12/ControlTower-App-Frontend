<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Card from '@/components/ui/Card.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import AppDialog from '@/components/ui/AppDialog.vue'
import FormField from '@/components/ui/FormField.vue'
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

dayjs.extend(relativeTime)

const toast = useToast()
const confirm = useConfirm()
const queryClient = useQueryClient()

const { data: checks, isLoading, isError, refetch } = useQuery({
  queryKey: ['health-clients'],
  queryFn: () => healthService.getClients(),
  staleTime: 0,
  refetchInterval: 30000 // auto-refresh every 30s
})

// Incident log filters
const logOpenOnly = ref(false)
const logBranchId = ref<string | undefined>(undefined)

const { data: incidentLogPage, isLoading: isLoadingIncidents, refetch: refetchLog } = useQuery({
  queryKey: computed(() => ['health-incident-log', logOpenOnly.value, logBranchId.value]),
  queryFn: () => healthService.getIncidentLog({
    page: 0, size: 50,
    openOnly: logOpenOnly.value,
    branchId: logBranchId.value,
  }),
  staleTime: 0,
  refetchInterval: 30000,
})

const items = computed(() => checks.value ?? [])
const incidents = computed(() => incidentLogPage.value?.content ?? [])

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
    message: `Mark this incident as resolved for ${where}?`,
    header: 'Resolve Incident',
    icon: 'pi pi-check-circle',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Resolve', severity: 'success' },
    accept: async () => {
      try {
        await healthService.resolveIncident(incident.id!)
        queryClient.invalidateQueries({ queryKey: ['health-incident-log'] })
        queryClient.invalidateQueries({ queryKey: ['health-clients'] })
        toast.success('Incident resolved successfully')
      } catch {
        toast.error('Failed to resolve incident')
      }
    }
  })
}

// ── Monitored POS Endpoints ───────────────────────────────────────────

const authStore = useAuthStore()
const canWriteIntegrations = computed(() => authStore.hasPermission('integration:write'))

const { data: posPage, isLoading: isLoadingPos, refetch: refetchPos } = useQuery({
  queryKey: ['integrations-pos'],
  queryFn: () => integrationsService.list(0, 50, 'POS'),
  staleTime: 30000,
})
const posEndpoints = computed(() => posPage.value?.content ?? [])

// ── Register POS modal ────────────────────────────────────────────────

const showRegisterModal = ref(false)
const isSubmittingPos = ref(false)
const clients = ref<Client[]>([])
const branches = ref<ClientBranch[]>([])
const isLoadingClients = ref(false)
const isLoadingBranches = ref(false)

const posSchema = z.object({
  clientId:                  z.string().min(1, 'Select a client'),
  clientBranchId:            z.string().min(1, 'Select a branch'),
  pullUrl:                   z.string().url('Must be a valid URL (e.g. http://pos-host:4000/health)'),
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
    toast.success('POS endpoint registered')
  } catch {
    toast.error('Failed to register POS endpoint')
  } finally {
    isSubmittingPos.value = false
  }
})

function confirmTogglePosEndpoint(ep: Integration) {
  const activating = !ep.active
  confirm.require({
    message: activating ? 'Activate this POS endpoint?' : 'Deactivate this POS endpoint?',
    header: activating ? 'Activate Endpoint' : 'Deactivate Endpoint',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: activating ? 'Activate' : 'Deactivate', severity: activating ? 'success' : 'warn' },
    accept: async () => {
      try {
        if (ep.active) await integrationsService.deactivate(ep.id)
        else await integrationsService.activate(ep.id)
        await queryClient.invalidateQueries({ queryKey: ['integrations-pos'] })
        toast.success(activating ? 'Endpoint activated' : 'Endpoint deactivated')
      } catch {
        toast.error('Failed to update endpoint')
      }
    }
  })
}

function confirmDeletePosEndpoint(ep: Integration) {
  confirm.require({
    message: 'Remove this POS endpoint from monitoring?',
    header: 'Remove Endpoint',
    icon: 'pi pi-trash',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Remove', severity: 'danger' },
    accept: async () => {
      try {
        await integrationsService.delete(ep.id)
        await queryClient.invalidateQueries({ queryKey: ['integrations-pos'] })
        toast.success('Endpoint removed')
      } catch {
        toast.error('Failed to remove endpoint')
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
    toast.error('Check Now failed')
    isCheckingNow.value = null
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">Health Monitoring</h2>
        <p class="text-sm text-[var(--text-muted)]">Real-time status of all branch POS systems</p>
      </div>
      <Button icon="pi pi-refresh" severity="secondary" outlined @click="refetch()" />
    </div>

    <!-- Error -->
    <div v-if="isError && !isLoading" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
      <span>Failed to load health data. Check your connection or permissions.</span>
      <Button label="Retry" size="small" severity="danger" text @click="refetch()" />
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
              <p class="text-xs text-[var(--text-muted)] font-medium">Up / Healthy</p>
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
              <p class="text-xs text-[var(--text-muted)] font-medium">Degraded</p>
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
              <p class="text-xs text-[var(--text-muted)] font-medium">Down</p>
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
        <Column field="branchName" header="Branch" sortable style="min-width: 180px">
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

        <Column field="status" header="Status" style="width: 130px">
          <template #body="{ data: row }: { data: HealthCheck }">
            <Tag :severity="statusSeverity(row.status)" :value="row.status" />
          </template>
        </Column>

        <Column field="latencyMs" header="Latency" sortable style="width: 110px">
          <template #body="{ data: row }: { data: HealthCheck }">
            <span :class="latencyClass(row.latencyMs)">
              {{ row.latencyMs != null ? `${row.latencyMs}ms` : '—' }}
            </span>
          </template>
        </Column>

        <Column field="version" header="Version" style="width: 110px">
          <template #body="{ data: row }: { data: HealthCheck }">
            <span class="text-[var(--text-muted)] text-sm font-mono">{{ row.version ?? '—' }}</span>
          </template>
        </Column>

        <Column field="openIncidents" header="Open Incidents" style="width: 130px">
          <template #body="{ data: row }: { data: HealthCheck }">
            <Tag
              :severity="row.openIncidents > 0 ? 'danger' : 'success'"
              :value="String(row.openIncidents)"
            />
          </template>
        </Column>

        <Column field="lastCheckedAt" header="Last Check" sortable style="width: 140px">
          <template #body="{ data: row }: { data: HealthCheck }">
            <span class="text-[var(--text-muted)] text-sm">{{ formatTime(row.lastCheckedAt) }}</span>
          </template>
        </Column>

        <template #empty>
          <div class="text-center py-8 text-[var(--text-muted)]">No health data available</div>
        </template>
      </DataTable>

      <!-- Incident Log -->
      <div>
        <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h3 class="text-base font-semibold text-[var(--text)]">Incident Log</h3>
            <p class="text-xs text-[var(--text-muted)]">History of all detected failures — open and resolved</p>
          </div>
          <div class="flex items-center gap-2">
            <!-- Branch filter -->
            <Select
              v-model="logBranchId"
              :options="[{ label: 'All branches', value: undefined }, ...items.map(c => ({ label: c.branchName ?? c.branchId, value: c.branchId }))]"
              option-label="label"
              option-value="value"
              placeholder="All branches"
              size="small"
              class="w-44"
            />
            <!-- Status filter -->
            <Select
              v-model="logOpenOnly"
              :options="[{ label: 'All', value: false }, { label: 'Open only', value: true }]"
              option-label="label"
              option-value="value"
              size="small"
              class="w-32"
            />
            <Button icon="pi pi-refresh" severity="secondary" outlined size="small" @click="refetchLog()" />
          </div>
        </div>

        <SkeletonTable v-if="isLoadingIncidents" :rows="5" :cols="6" />

        <DataTable
          v-else
          :value="incidents"
          removable-sort
          striped-rows
          class="rounded-xl overflow-hidden"
        >
          <Column field="severity" header="Severity" style="width: 110px">
            <template #body="{ data: row }: { data: HealthIncident }">
              <Tag :severity="incidentSeverity(row.severity)" :value="row.severity" />
            </template>
          </Column>

          <Column field="branchName" header="Branch" style="width: 170px">
            <template #body="{ data: row }: { data: HealthIncident }">
              <div>
                <span class="text-sm font-medium text-[var(--text)]">{{ row.branchName ?? '—' }}</span>
                <span class="block text-xs text-[var(--text-muted)] font-mono truncate max-w-[140px]" :title="row.branchId">{{ row.branchId }}</span>
              </div>
            </template>
          </Column>

          <Column field="description" header="Description" style="min-width: 220px">
            <template #body="{ data: row }: { data: HealthIncident }">
              <span class="text-sm text-[var(--text)] break-words">{{ row.description }}</span>
            </template>
          </Column>

          <Column field="openedAt" header="Started" sortable style="width: 150px">
            <template #body="{ data: row }: { data: HealthIncident }">
              <div>
                <span class="text-sm text-[var(--text-muted)]">{{ formatDateTime(row.openedAt) }}</span>
                <span class="block text-xs text-[var(--text-muted)]">{{ formatTime(row.openedAt) }}</span>
              </div>
            </template>
          </Column>

          <Column field="durationSeconds" header="Duration" sortable style="width: 100px">
            <template #body="{ data: row }: { data: HealthIncident }">
              <span
                class="text-sm font-medium"
                :class="row.open ? 'text-red-500' : 'text-[var(--text-muted)]'"
              >
                {{ formatDuration(row.durationSeconds) }}
              </span>
            </template>
          </Column>

          <Column field="open" header="Status" style="width: 110px">
            <template #body="{ data: row }: { data: HealthIncident }">
              <Tag
                :severity="row.open ? 'danger' : 'success'"
                :value="row.open ? 'Open' : 'Resolved'"
              />
            </template>
          </Column>

          <Column header="" style="width: 110px">
            <template #body="{ data: row }: { data: HealthIncident }">
              <Button
                v-if="row.open && row.id"
                label="Resolve"
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
            <div class="text-center py-8 text-[var(--text-muted)]">No incidents recorded</div>
          </template>
        </DataTable>
      </div>

      <!-- Monitored POS Endpoints -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <div>
            <h3 class="text-base font-semibold text-[var(--text)]">Monitored POS Endpoints</h3>
            <p class="text-xs text-[var(--text-muted)]">POS systems polled every 60s by the pull scheduler</p>
          </div>
          <div class="flex gap-2">
            <Button icon="pi pi-refresh" severity="secondary" outlined size="small" @click="refetchPos()" />
            <Button
              v-if="canWriteIntegrations"
              label="Register POS"
              icon="pi pi-plus"
              size="small"
              @click="openRegisterModal"
            />
          </div>
        </div>

        <SkeletonTable v-if="isLoadingPos" :rows="3" :cols="5" />

        <DataTable
          v-else
          :value="posEndpoints"
          removable-sort
          striped-rows
          class="rounded-xl overflow-hidden"
        >
          <Column field="clientBranchId" header="Branch ID" style="min-width: 200px">
            <template #body="{ data: row }: { data: Integration }">
              <span class="text-xs text-[var(--text-muted)] font-mono">{{ row.clientBranchId ?? '—' }}</span>
            </template>
          </Column>

          <Column field="pullUrl" header="Pull URL" style="min-width: 240px">
            <template #body="{ data: row }: { data: Integration }">
              <span class="text-xs text-[var(--text-muted)] font-mono truncate block max-w-xs" :title="row.pullUrl">
                {{ row.pullUrl ?? '—' }}
              </span>
            </template>
          </Column>

          <Column field="heartbeatIntervalSeconds" header="Interval" sortable style="width: 100px">
            <template #body="{ data: row }: { data: Integration }">
              <span class="text-sm text-[var(--text-muted)]">{{ row.heartbeatIntervalSeconds }}s</span>
            </template>
          </Column>

          <Column field="active" header="Status" style="width: 110px">
            <template #body="{ data: row }: { data: Integration }">
              <Tag :severity="row.active ? 'success' : 'secondary'" :value="row.active ? 'Active' : 'Inactive'" />
            </template>
          </Column>

          <Column v-if="canWriteIntegrations" header="Actions" style="width: 130px">
            <template #body="{ data: row }: { data: Integration }">
              <div class="flex gap-1">
                <Button
                  icon="pi pi-refresh"
                  severity="info"
                  text rounded size="small"
                  :loading="isCheckingNow === row.id"
                  v-tooltip.top="'Check Now'"
                  @click="checkNow(row)"
                />
                <Button
                  :icon="row.active ? 'pi pi-pause' : 'pi pi-play'"
                  :severity="row.active ? 'warn' : 'success'"
                  text rounded size="small"
                  v-tooltip.top="row.active ? 'Deactivate' : 'Activate'"
                  @click="confirmTogglePosEndpoint(row)"
                />
                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  text rounded size="small"
                  v-tooltip.top="'Remove'"
                  @click="confirmDeletePosEndpoint(row)"
                />
              </div>
            </template>
          </Column>

          <template #empty>
            <div class="text-center py-6 text-[var(--text-muted)]">
              No POS endpoints registered — click "Register POS" to add one
            </div>
          </template>
        </DataTable>
      </div>
    </template>
  </div>

  <!-- Register POS Modal -->
  <AppDialog
    v-model:visible="showRegisterModal"
    title="Register POS Endpoint"
    :loading="isSubmittingPos"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onSubmitPos">
      <FormField label="Client" name="clientId" :error="posErrors.clientId" required>
        <Select
          v-model="clientIdValue"
          :options="clients"
          option-label="name"
          option-value="id"
          placeholder="Select a client"
          :loading="isLoadingClients"
          :disabled="isSubmittingPos"
          class="w-full"
          filter
        />
      </FormField>

      <FormField label="Branch" name="clientBranchId" :error="posErrors.clientBranchId" required>
        <Select
          v-model="branchIdValue"
          :options="branches"
          option-label="name"
          option-value="id"
          placeholder="Select a branch"
          :loading="isLoadingBranches"
          :disabled="!clientIdValue || isSubmittingPos"
          class="w-full"
        />
      </FormField>

      <FormField label="Pull URL" name="pullUrl" :error="posErrors.pullUrl" required>
        <InputText
          v-model="pullUrlValue"
          placeholder="http://pos-host:4000/health"
          :disabled="isSubmittingPos"
          class="w-full"
        />
      </FormField>

      <FormField label="API Key (optional)" name="apiKey" :error="posErrors.apiKey">
        <InputText
          v-model="apiKeyValue"
          placeholder="Leave empty if /health is public"
          :disabled="isSubmittingPos"
          class="w-full"
        />
      </FormField>

      <FormField label="Poll interval (seconds)" name="heartbeatIntervalSeconds" :error="posErrors.heartbeatIntervalSeconds">
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
        <Button label="Cancel" severity="secondary" outlined :disabled="isSubmittingPos" @click="showRegisterModal = false" />
        <Button label="Register" :loading="isSubmittingPos" @click="onSubmitPos" />
      </div>
    </template>
  </AppDialog>
</template>
