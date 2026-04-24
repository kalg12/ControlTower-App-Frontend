<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useConfirm } from 'primevue/useconfirm'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Dialog from 'primevue/dialog'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import { integrationsService } from '@/services/integrations.service'
import { healthService } from '@/services/health.service'
import { clientsService } from '@/services/clients.service'
import { useToast } from '@/composables/useToast'
import type { Integration, IntegrationCreateResponse } from '@/types/integration'
import type { HealthCheck, HealthIncident } from '@/types/health'
import type { Client, ClientBranch } from '@/types/client'

dayjs.extend(relativeTime)
dayjs.locale('es')

const qc = useQueryClient()
const toast = useToast()
const confirm = useConfirm()

const activeTab = ref('endpoints')
const ctBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/api\/v1$/, '')

// ── Data queries ─────────────────────────────────────────────────────────────

const { data: endpointsPage, isLoading: loadingEndpoints } = useQuery({
  queryKey: ['pos-endpoints'],
  queryFn: () => integrationsService.list(0, 100, 'POS'),
  staleTime: 30_000,
})
const endpoints = computed(() => endpointsPage.value?.content ?? [])

const { data: healthChecks } = useQuery({
  queryKey: ['pos-health-checks'],
  queryFn: () => healthService.getClients(),
  staleTime: 15_000,
  refetchInterval: 30_000,
})

const { data: incidentsPage, isLoading: loadingIncidents } = useQuery({
  queryKey: ['pos-incidents'],
  queryFn: () => healthService.getIncidentLog({ page: 0, size: 50 }),
  staleTime: 30_000,
})
const incidents = computed(() => incidentsPage.value?.content ?? [])

const { data: clientsPage } = useQuery({
  queryKey: ['pos-clients'],
  queryFn: () => clientsService.list({ page: 0, size: 200 } as any),
  staleTime: 60_000,
})
const allClients = computed(() => clientsPage.value?.content ?? [])

// ── Health join ───────────────────────────────────────────────────────────────

function healthForEndpoint(ep: Integration): HealthCheck | undefined {
  return healthChecks.value?.find(h => h.branchId === ep.clientBranchId)
}

// ── Summary cards ─────────────────────────────────────────────────────────────

const totalCount = computed(() => endpoints.value.length)
const activeCount = computed(() => endpoints.value.filter(e => e.active).length)
const incidentCount = computed(() => endpoints.value.filter(e => (healthForEndpoint(e)?.openIncidents ?? 0) > 0).length)
const noDataCount = computed(() => endpoints.value.filter(e => !healthForEndpoint(e)).length)

// ── Status helpers ─────────────────────────────────────────────────────────────

function statusSeverity(ep: Integration) {
  if (!ep.active) return 'secondary'
  const h = healthForEndpoint(ep)
  if (!h) return 'secondary'
  if (h.status === 'UP' || h.status === 'HEALTHY') return 'success'
  if (h.status === 'DEGRADED') return 'warn'
  if (h.status === 'DOWN') return 'danger'
  return 'secondary'
}

function statusLabel(ep: Integration) {
  if (!ep.active) return 'Inactivo'
  const h = healthForEndpoint(ep)
  if (!h) return 'Sin datos'
  if (h.status === 'UP' || h.status === 'HEALTHY') return 'Activo'
  if (h.status === 'DEGRADED') return 'Degradado'
  if (h.status === 'DOWN') return 'Caído'
  return h.status
}

function lastContact(ep: Integration) {
  const h = healthForEndpoint(ep)
  if (!h?.lastCheckedAt) return '—'
  return dayjs(h.lastCheckedAt).fromNow()
}

function intervalLabel(secs: number) {
  if (secs < 60) return `cada ${secs}s`
  return `cada ${Math.round(secs / 60)} min`
}

function incidentSeverity(s: string) {
  return s === 'CRITICAL' ? 'danger' : s === 'HIGH' ? 'warn' : 'secondary'
}

function formatDate(d?: string | null) {
  return d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '—'
}

// ── Copy helper ───────────────────────────────────────────────────────────────

const copiedKey = ref<string | null>(null)
async function copy(text: string, key: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key
    setTimeout(() => { copiedKey.value = null }, 2000)
  } catch { /* ignore */ }
}

// ── Register ──────────────────────────────────────────────────────────────────

const showRegister = ref(false)
const regClientId = ref<string | null>(null)
const regBranchId = ref<string | null>(null)
const regName = ref('')
const regUrl = ref('')
const regInterval = ref(300)
const regLoading = ref(false)

const { data: regBranchesData } = useQuery({
  queryKey: computed(() => ['pos-reg-branches', regClientId.value]),
  queryFn: () => clientsService.getBranches(regClientId.value!),
  enabled: computed(() => !!regClientId.value),
})
const regBranches = computed(() => regBranchesData.value ?? [])

watch(regClientId, () => { regBranchId.value = null })

function openRegister() {
  regClientId.value = null
  regBranchId.value = null
  regName.value = ''
  regUrl.value = ''
  regInterval.value = 300
  showRegister.value = true
}

async function submitRegister() {
  if (!regBranchId.value) { toast.error('Selecciona una sucursal'); return }
  if (!regUrl.value) { toast.error('Ingresa la URL del endpoint /health'); return }
  regLoading.value = true
  try {
    const result = await integrationsService.create({
      clientBranchId: regBranchId.value,
      name: regName.value || undefined,
      type: 'POS',
      pullUrl: regUrl.value,
      heartbeatIntervalSeconds: regInterval.value,
    })
    qc.invalidateQueries({ queryKey: ['pos-endpoints'] })
    showRegister.value = false
    openSetupGuide(result, true)
  } catch {
    toast.error('Error al registrar el POS')
  } finally {
    regLoading.value = false
  }
}

// ── Setup Guide ───────────────────────────────────────────────────────────────

const showGuide = ref(false)
const guideEndpoint = ref<Integration | null>(null)
const guideApiKey = ref<string | null>(null)
const guideIsNew = ref(false)

function openSetupGuide(result: IntegrationCreateResponse | Integration, isNew = false) {
  if ('endpoint' in result && 'generatedApiKey' in result) {
    guideEndpoint.value = (result as IntegrationCreateResponse).endpoint
    guideApiKey.value = (result as IntegrationCreateResponse).generatedApiKey
  } else {
    guideEndpoint.value = result as Integration
    guideApiKey.value = null
  }
  guideIsNew.value = isNew
  showGuide.value = true
}

const guideBranchSlug = computed(() => guideEndpoint.value?.clientBranchId ?? '')
const guideDotEnv = computed(() => {
  const ep = guideEndpoint.value
  if (!ep) return ''
  return `# Control Tower — Variables de conexión
CT_BASE_URL=${ctBaseUrl}
CT_API_KEY=${guideApiKey.value ?? '<regenera la clave desde Editar>'}
CT_ENDPOINT_ID=${ep.id}
CT_BRANCH_SLUG=${ep.clientBranchId ?? '<id-sucursal>'}`
})

const guideHealthFormat = `{
  "status": "ok",
  "version": "1.0.0",
  "uptimeSeconds": 3600,
  "checks": {
    "database":     { "status": "up" },
    "memory":       { "status": "up", "usagePercent": 60 },
    "controlTower": { "status": "up" }
  }
}`

const guideUrls = computed(() => {
  const ep = guideEndpoint.value
  if (!ep) return ''
  return `# Heartbeat (POS → CT, opcional)
POST ${ctBaseUrl}/api/v1/health/heartbeat/${ep.clientBranchId ?? '{branch-slug}'}

# Push de eventos (tickets, soporte)
POST ${ctBaseUrl}/api/v1/integrations/events
Header: X-Api-Key: {CT_API_KEY}

# Consultar estado de ticket
GET  ${ctBaseUrl}/api/v1/integrations/${ep.id}/pos-tickets/{ticketId}/status
Header: X-Api-Key: {CT_API_KEY}`
})

// ── Check now ─────────────────────────────────────────────────────────────────

const checkingId = ref<string | null>(null)

async function checkNow(ep: Integration) {
  checkingId.value = ep.id
  try {
    await integrationsService.checkNow(ep.id)
    await qc.invalidateQueries({ queryKey: ['pos-health-checks'] })
    toast.success('Verificación lanzada')
  } catch {
    toast.error('Error al verificar')
  } finally {
    checkingId.value = null
  }
}

// ── Toggle active ─────────────────────────────────────────────────────────────

const toggleMut = useMutation({
  mutationFn: (ep: Integration) =>
    ep.active ? integrationsService.deactivate(ep.id) : integrationsService.activate(ep.id),
  onSuccess: () => qc.invalidateQueries({ queryKey: ['pos-endpoints'] }),
  onError: () => toast.error('Error al cambiar estado'),
})

function confirmToggle(ep: Integration) {
  confirm.require({
    message: ep.active ? `¿Pausar monitoreo de "${ep.name ?? ep.pullUrl}"?` : `¿Reactivar "${ep.name ?? ep.pullUrl}"?`,
    header: ep.active ? 'Pausar POS' : 'Reactivar POS',
    icon: ep.active ? 'pi pi-pause' : 'pi pi-play',
    accept: () => toggleMut.mutate(ep),
  })
}

// ── Delete ────────────────────────────────────────────────────────────────────

const deleteMut = useMutation({
  mutationFn: (id: string) => integrationsService.delete(id),
  onSuccess: () => { qc.invalidateQueries({ queryKey: ['pos-endpoints'] }); toast.success('POS eliminado') },
  onError: () => toast.error('Error al eliminar'),
})

function confirmDelete(ep: Integration) {
  confirm.require({
    message: `¿Eliminar el POS "${ep.name ?? ep.pullUrl}"? Esta acción no se puede deshacer.`,
    header: 'Eliminar POS',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteMut.mutate(ep.id),
  })
}

// ── Edit ──────────────────────────────────────────────────────────────────────

const showEdit = ref(false)
const editId = ref<string | null>(null)
const editName = ref('')
const editUrl = ref('')
const editInterval = ref(300)
const editLoading = ref(false)
const regenLoading = ref(false)
const regenKey = ref<string | null>(null)
const regenCopied = ref(false)

function openEdit(ep: Integration) {
  editId.value = ep.id
  editName.value = ep.name ?? ''
  editUrl.value = ep.pullUrl ?? ''
  editInterval.value = ep.heartbeatIntervalSeconds
  regenKey.value = null
  regenCopied.value = false
  showEdit.value = true
}

async function submitEdit() {
  if (!editId.value) return
  editLoading.value = true
  try {
    await integrationsService.update(editId.value, {
      name: editName.value || undefined,
      pullUrl: editUrl.value || undefined,
      heartbeatIntervalSeconds: editInterval.value,
    })
    qc.invalidateQueries({ queryKey: ['pos-endpoints'] })
    showEdit.value = false
    toast.success('POS actualizado')
  } catch {
    toast.error('Error al guardar')
  } finally {
    editLoading.value = false
  }
}

async function regenerateKey() {
  if (!editId.value) return
  regenLoading.value = true
  try {
    regenKey.value = await integrationsService.regenerateApiKey(editId.value)
  } catch {
    toast.error('Error al regenerar clave')
  } finally {
    regenLoading.value = false
  }
}

async function copyRegenKey() {
  if (!regenKey.value) return
  await navigator.clipboard.writeText(regenKey.value)
  regenCopied.value = true
  setTimeout(() => { regenCopied.value = false }, 2000)
}

// ── Resolve incident ──────────────────────────────────────────────────────────

const resolvingId = ref<string | null>(null)

async function resolveIncident(inc: HealthIncident) {
  if (!inc.id) return
  resolvingId.value = inc.id
  try {
    await healthService.resolveIncident(inc.id)
    qc.invalidateQueries({ queryKey: ['pos-incidents'] })
    toast.success('Incidente resuelto')
  } catch {
    toast.error('Error al resolver')
  } finally {
    resolvingId.value = null
  }
}
</script>

<template>
  <div class="space-y-4 p-4">
    <!-- Header -->
    <div class="flex items-start justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-xl font-bold text-[var(--text)]">Puntos de Venta</h1>
        <p class="text-sm text-[var(--text-muted)]">Registra, monitorea y obtén la guía de conexión para cada POS de tus clientes.</p>
      </div>
      <Button label="Registrar POS" icon="pi pi-plus" @click="openRegister" />
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
        <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Total</p>
        <p class="text-2xl font-bold text-[var(--text)]">{{ totalCount }}</p>
      </div>
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
        <p class="text-xs text-green-600 uppercase tracking-wide mb-1">Activos</p>
        <p class="text-2xl font-bold text-green-600">{{ activeCount }}</p>
      </div>
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
        <p class="text-xs text-amber-600 uppercase tracking-wide mb-1">Con incidente</p>
        <p class="text-2xl font-bold text-amber-600">{{ incidentCount }}</p>
      </div>
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
        <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Sin datos</p>
        <p class="text-2xl font-bold text-[var(--text-muted)]">{{ noDataCount }}</p>
      </div>
    </div>

    <!-- Tabs -->
    <Tabs v-model:value="activeTab">
      <TabList>
        <Tab value="endpoints">Mis POS</Tab>
        <Tab value="incidents">Incidentes</Tab>
      </TabList>
      <TabPanels class="mt-3">

        <!-- ── Mis POS ──────────────────────────────────────────── -->
        <TabPanel value="endpoints">
          <DataTable :value="endpoints" :loading="loadingEndpoints" stripedRows>

            <template #empty>
              <div class="text-center py-10 text-[var(--text-muted)]">
                <i class="pi pi-shop text-3xl mb-2 block opacity-30" />
                <p class="text-sm">Aún no hay POS registrados.</p>
                <Button label="Registrar primer POS" icon="pi pi-plus" class="mt-3" size="small" @click="openRegister" />
              </div>
            </template>

            <Column header="POS / Cliente" style="min-width: 200px">
              <template #body="{ data: ep }: { data: Integration }">
                <div class="font-medium text-sm text-[var(--text)]">{{ ep.name ?? '—' }}</div>
                <div class="text-xs text-[var(--text-muted)]">{{ ep.branchName ?? ep.clientBranchId }}</div>
              </template>
            </Column>

            <Column header="URL de salud" style="min-width: 220px">
              <template #body="{ data: ep }: { data: Integration }">
                <div v-if="ep.pullUrl" class="flex items-center gap-1">
                  <span class="text-xs font-mono text-[var(--text-muted)] truncate max-w-[170px]" :title="ep.pullUrl">{{ ep.pullUrl }}</span>
                  <button class="p-0.5 rounded hover:bg-[var(--border)]" @click="copy(ep.pullUrl!, 'url-' + ep.id)">
                    <i :class="copiedKey === 'url-' + ep.id ? 'pi pi-check text-green-500' : 'pi pi-copy text-[var(--text-muted)]'" class="text-xs" />
                  </button>
                </div>
                <span v-else class="text-xs text-[var(--text-muted)] italic">Sin URL</span>
              </template>
            </Column>

            <Column header="Estado" style="width: 120px">
              <template #body="{ data: ep }: { data: Integration }">
                <Tag :severity="statusSeverity(ep)" :value="statusLabel(ep)" />
              </template>
            </Column>

            <Column header="Último contacto" style="width: 140px">
              <template #body="{ data: ep }: { data: Integration }">
                <span class="text-xs text-[var(--text-muted)]">{{ lastContact(ep) }}</span>
              </template>
            </Column>

            <Column header="Frecuencia" style="width: 110px">
              <template #body="{ data: ep }: { data: Integration }">
                <span class="text-xs text-[var(--text-muted)]">{{ intervalLabel(ep.heartbeatIntervalSeconds) }}</span>
              </template>
            </Column>

            <Column header="Acciones" style="width: 180px">
              <template #body="{ data: ep }: { data: Integration }">
                <div class="flex items-center gap-1">
                  <Button
                    icon="pi pi-refresh"
                    text rounded size="small"
                    severity="info"
                    :loading="checkingId === ep.id"
                    v-tooltip.top="'Verificar ahora'"
                    @click="checkNow(ep)"
                  />
                  <Button
                    icon="pi pi-book"
                    text rounded size="small"
                    severity="secondary"
                    v-tooltip.top="'Guía de conexión'"
                    @click="openSetupGuide(ep, false)"
                  />
                  <Button
                    icon="pi pi-pencil"
                    text rounded size="small"
                    severity="secondary"
                    v-tooltip.top="'Editar'"
                    @click="openEdit(ep)"
                  />
                  <Button
                    :icon="ep.active ? 'pi pi-pause' : 'pi pi-play'"
                    text rounded size="small"
                    :severity="ep.active ? 'warn' : 'success'"
                    v-tooltip.top="ep.active ? 'Pausar' : 'Reactivar'"
                    @click="confirmToggle(ep)"
                  />
                  <Button
                    icon="pi pi-trash"
                    text rounded size="small"
                    severity="danger"
                    v-tooltip.top="'Eliminar'"
                    @click="confirmDelete(ep)"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </TabPanel>

        <!-- ── Incidentes ───────────────────────────────────────── -->
        <TabPanel value="incidents">
          <DataTable :value="incidents" :loading="loadingIncidents" stripedRows>
            <template #empty>
              <div class="text-center py-10 text-[var(--text-muted)] text-sm">Sin incidentes registrados.</div>
            </template>
            <Column field="branchName" header="Sucursal" />
            <Column field="severity" header="Severidad" style="width: 110px">
              <template #body="{ data: inc }: { data: HealthIncident }">
                <Tag :severity="incidentSeverity(inc.severity)" :value="inc.severity" />
              </template>
            </Column>
            <Column field="description" header="Descripción" />
            <Column header="Inicio" style="width: 150px">
              <template #body="{ data: inc }: { data: HealthIncident }">
                {{ formatDate(inc.openedAt) }}
              </template>
            </Column>
            <Column header="Estado" style="width: 110px">
              <template #body="{ data: inc }: { data: HealthIncident }">
                <Tag :severity="inc.open ? 'danger' : 'success'" :value="inc.open ? 'Abierto' : 'Resuelto'" />
              </template>
            </Column>
            <Column header="" style="width: 110px">
              <template #body="{ data: inc }: { data: HealthIncident }">
                <Button
                  v-if="inc.open && inc.id"
                  label="Resolver"
                  size="small"
                  severity="secondary"
                  outlined
                  :loading="resolvingId === inc.id"
                  @click="resolveIncident(inc)"
                />
              </template>
            </Column>
          </DataTable>
        </TabPanel>

      </TabPanels>
    </Tabs>
  </div>

  <!-- ── Register Dialog ────────────────────────────────────────────── -->
  <Dialog v-model:visible="showRegister" header="Registrar punto de venta" modal :style="{ width: '480px' }">
    <div class="flex flex-col gap-4 pt-2">
      <div class="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3 text-xs text-blue-700 dark:text-blue-300">
        Se generará una clave API automáticamente. Podrás verla una sola vez al terminar el registro.
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--text)]">Cliente <span class="text-red-500">*</span></label>
        <Select v-model="regClientId" :options="allClients" option-label="name" option-value="id"
          placeholder="Selecciona un cliente" class="w-full" filter show-clear />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--text)]">Sucursal <span class="text-red-500">*</span></label>
        <Select v-model="regBranchId" :options="regBranches" option-label="name" option-value="id"
          placeholder="Selecciona una sucursal" class="w-full" :disabled="!regClientId" show-clear />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--text)]">Nombre del POS (opcional)</label>
        <InputText v-model="regName" placeholder="Ej: Caja 1 — Sucursal Norte" class="w-full" />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--text)]">URL del endpoint /health del POS <span class="text-red-500">*</span></label>
        <InputText v-model="regUrl" placeholder="https://pos.tucliente.com/api/health" class="w-full" />
        <p class="text-xs text-[var(--text-muted)]">CT consultará esta URL periódicamente para verificar que el POS esté en línea.</p>
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--text)]">Verificar cada (segundos)</label>
        <InputNumber v-model="regInterval" :min="30" :max="86400" class="w-full" />
        <p class="text-xs text-[var(--text-muted)]">Mínimo 30 s · recomendado 300 s (5 min) · máximo 86,400 s (1 día)</p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Cancelar" severity="secondary" outlined :disabled="regLoading" @click="showRegister = false" />
        <Button label="Registrar POS" icon="pi pi-check" :loading="regLoading" @click="submitRegister" />
      </div>
    </template>
  </Dialog>

  <!-- ── Setup Guide Dialog ─────────────────────────────────────────── -->
  <Dialog v-model:visible="showGuide" :header="guideIsNew ? '¡POS registrado! Configura tu sistema' : 'Guía de conexión'" modal :style="{ width: '620px' }">
    <div class="flex flex-col gap-5 pt-2">

      <!-- API Key (only on new registration) -->
      <div v-if="guideApiKey" class="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-2">
        <p class="text-sm font-semibold text-amber-800 dark:text-amber-300">
          <i class="pi pi-exclamation-triangle mr-1" />
          Copia esta clave ahora — no se vuelve a mostrar
        </p>
        <div class="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-[var(--border)] rounded px-3 py-2">
          <code class="flex-1 text-xs font-mono break-all text-[var(--text)]">{{ guideApiKey }}</code>
          <button class="shrink-0 p-1 rounded hover:bg-[var(--border)]" @click="copy(guideApiKey!, 'apikey')">
            <i :class="copiedKey === 'apikey' ? 'pi pi-check text-green-500' : 'pi pi-copy text-[var(--text-muted)]'" />
          </button>
        </div>
      </div>
      <div v-else class="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--text-muted)]">
        <i class="pi pi-info-circle mr-1" />
        La clave API ya no es visible. Si la perdiste, usa <strong>Editar → Regenerar clave</strong>.
      </div>

      <!-- .env block -->
      <div class="space-y-1">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-[var(--text)]">Archivo .env para tu POS</p>
          <button class="text-xs text-[var(--primary)] hover:underline flex items-center gap-1" @click="copy(guideDotEnv, 'dotenv')">
            <i :class="copiedKey === 'dotenv' ? 'pi pi-check text-green-500' : 'pi pi-copy'" class="text-xs" />
            {{ copiedKey === 'dotenv' ? 'Copiado' : 'Copiar .env' }}
          </button>
        </div>
        <pre class="text-xs font-mono bg-zinc-900 text-green-300 rounded-lg p-4 overflow-x-auto whitespace-pre">{{ guideDotEnv }}</pre>
      </div>

      <!-- Expected /health format -->
      <div class="space-y-1">
        <p class="text-sm font-semibold text-[var(--text)]">Formato que debe responder tu endpoint /health</p>
        <pre class="text-xs font-mono bg-zinc-900 text-blue-300 rounded-lg p-4 overflow-x-auto whitespace-pre">{{ guideHealthFormat }}</pre>
        <p class="text-xs text-[var(--text-muted)]">El campo <code class="font-mono">status</code> acepta: <code class="font-mono">"ok"</code>, <code class="font-mono">"degraded"</code> o <code class="font-mono">"down"</code>.</p>
      </div>

      <!-- URLs -->
      <div class="space-y-1">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-[var(--text)]">URLs para llamar a Control Tower</p>
          <button class="text-xs text-[var(--primary)] hover:underline flex items-center gap-1" @click="copy(guideUrls, 'urls')">
            <i :class="copiedKey === 'urls' ? 'pi pi-check text-green-500' : 'pi pi-copy'" class="text-xs" />
            {{ copiedKey === 'urls' ? 'Copiado' : 'Copiar URLs' }}
          </button>
        </div>
        <pre class="text-xs font-mono bg-zinc-900 text-yellow-300 rounded-lg p-4 overflow-x-auto whitespace-pre">{{ guideUrls }}</pre>
      </div>
    </div>

    <template #footer>
      <Button label="Entendido" icon="pi pi-check" @click="showGuide = false" />
    </template>
  </Dialog>

  <!-- ── Edit Dialog ────────────────────────────────────────────────── -->
  <Dialog v-model:visible="showEdit" header="Editar POS" modal :style="{ width: '480px' }">
    <div class="flex flex-col gap-4 pt-2">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--text)]">Nombre del POS</label>
        <InputText v-model="editName" placeholder="Ej: Caja 1 — Sucursal Norte" class="w-full" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--text)]">URL del endpoint /health</label>
        <InputText v-model="editUrl" placeholder="https://pos.tucliente.com/api/health" class="w-full" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--text)]">Frecuencia de monitoreo (segundos)</label>
        <InputNumber v-model="editInterval" :min="30" :max="86400" class="w-full" />
      </div>

      <!-- Regenerar clave -->
      <div class="rounded-lg border border-[var(--border)] p-3 space-y-2">
        <p class="text-xs font-medium text-[var(--text-muted)]">Regenerar clave API</p>
        <Button label="Generar nueva clave" icon="pi pi-refresh" severity="warn" outlined size="small"
          :loading="regenLoading" @click.prevent="regenerateKey" />
        <div v-if="regenKey" class="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
          <p class="text-xs text-amber-700 dark:text-amber-400 font-medium">
            <i class="pi pi-exclamation-triangle mr-1" />Copia esta clave — no se vuelve a mostrar
          </p>
          <div class="flex items-center gap-2 font-mono text-xs bg-white dark:bg-zinc-900 border border-[var(--border)] rounded px-3 py-2">
            <span class="flex-1 break-all">{{ regenKey }}</span>
            <button class="shrink-0 p-1 rounded hover:bg-[var(--border)]" @click.prevent="copyRegenKey">
              <i :class="regenCopied ? 'pi pi-check text-green-500' : 'pi pi-copy text-[var(--text-muted)]'" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Cancelar" severity="secondary" outlined :disabled="editLoading" @click="showEdit = false" />
        <Button label="Guardar" icon="pi pi-check" :loading="editLoading" @click="submitEdit" />
      </div>
    </template>
  </Dialog>
</template>
