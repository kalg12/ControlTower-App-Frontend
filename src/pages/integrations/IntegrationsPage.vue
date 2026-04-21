<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useConfirm } from 'primevue/useconfirm'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import Drawer from 'primevue/drawer'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import Tabs from 'primevue/tabs'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import AppDialog from '@/components/ui/AppDialog.vue'
import FormField from '@/components/ui/FormField.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { integrationsService } from '@/services/integrations.service'
import { clientsService } from '@/services/clients.service'
import { useToast } from '@/composables/useToast'
import type { Integration, IntegrationEvent, WebhookDelivery } from '@/types/integration'
import { Plug, Link2, Copy, Check, Pencil, Zap, Play, Pause, Trash2, ChevronRight, RefreshCw } from 'lucide-vue-next'
import PageInfoButton from '@/components/ui/PageInfoButton.vue'

const { t } = useI18n()
const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()
const router = useRouter()

// ── Data ─────────────────────────────────────────────────────────────────────

const { data: result, isLoading, isFetching, isError, refetch } = useQuery({
  queryKey: ['integrations'],
  queryFn: () => integrationsService.list(0, 200),
  staleTime: 30000,
})

const integrations = computed(() => result.value?.content ?? [])

// ── Clients for branch selector ───────────────────────────────────────────────

const { data: clientsResult } = useQuery({
  queryKey: ['clients-all'],
  queryFn: () => clientsService.list({ size: 500 }),
  staleTime: 60000,
})
const allClients = computed(() => clientsResult.value?.content ?? [])

// When a client is selected in the dialog, load its branches
const selectedClientId = ref<string | undefined>(undefined)
const { data: clientBranchesData } = useQuery({
  queryKey: computed(() => ['client-branches', selectedClientId.value]),
  queryFn: () => clientsService.getBranches(selectedClientId.value!),
  enabled: computed(() => !!selectedClientId.value),
  staleTime: 60000,
})
const clientBranches = computed(() => clientBranchesData.value ?? [])

// ── Filter ────────────────────────────────────────────────────────────────────

type FilterType = 'ALL' | 'POS' | 'CUSTOM'
const activeFilter = ref<FilterType>('ALL')

const filteredIntegrations = computed(() => {
  if (activeFilter.value === 'ALL') return integrations.value
  return integrations.value.filter(i => i.type === activeFilter.value)
})

const filterTabs: { label: string; value: FilterType; key: string }[] = [
  { label: 'filterAll', value: 'ALL', key: 'ALL' },
  { label: 'filterPos', value: 'POS', key: 'POS' },
  { label: 'filterCustom', value: 'CUSTOM', key: 'CUSTOM' },
]

// ── Stats ─────────────────────────────────────────────────────────────────────

const stats = computed(() => ({
  total:    integrations.value.length,
  active:   integrations.value.filter(i => i.active).length,
  inactive: integrations.value.filter(i => !i.active).length,
  pos:      integrations.value.filter(i => i.type === 'POS').length,
  custom:   integrations.value.filter(i => i.type === 'CUSTOM').length,
}))

// ── Copy URL ─────────────────────────────────────────────────────────────────

const copiedId = ref<string | null>(null)
async function copyUrl(ep: Integration) {
  if (!ep.pullUrl) return
  try {
    await navigator.clipboard.writeText(ep.pullUrl)
    copiedId.value = ep.id
    setTimeout(() => { copiedId.value = null }, 1500)
  } catch { /* ignore */ }
}

// ── Check Now ────────────────────────────────────────────────────────────────

const checkingNow = ref<string | null>(null)
async function checkNow(ep: Integration) {
  checkingNow.value = ep.id
  try {
    await integrationsService.checkNow(ep.id)
    toast.success(t('integrations.checkNowSuccess'))
    setTimeout(() => queryClient.invalidateQueries({ queryKey: ['integrations'] }), 2000)
  } catch {
    toast.error(t('integrations.checkNowFailed'))
  } finally {
    checkingNow.value = null
  }
}

// ── Toggle Active ─────────────────────────────────────────────────────────────

function confirmToggle(ep: Integration) {
  const activating = !ep.active
  confirm.require({
    message: activating
      ? t('integrations.activateConfirm', { name: ep.name || ep.pullUrl || ep.id })
      : t('integrations.deactivateConfirm', { name: ep.name || ep.pullUrl || ep.id }),
    header: activating ? t('integrations.activateTitle') : t('integrations.deactivateTitle'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps:  { label: t('common.cancel'),   severity: 'secondary', outlined: true },
    acceptProps:  { label: activating ? t('integrations.activate') : t('integrations.deactivate'), severity: activating ? 'success' : 'warn' },
    accept: async () => {
      try {
        if (ep.active) await integrationsService.deactivate(ep.id)
        else           await integrationsService.activate(ep.id)
        await queryClient.invalidateQueries({ queryKey: ['integrations'] })
        toast.success(activating ? t('integrations.activateSuccess') : t('integrations.deactivateSuccess'))
      } catch {
        toast.error(t('integrations.updateFailed'))
      }
    },
  })
}

// ── Delete ────────────────────────────────────────────────────────────────────

function confirmDelete(ep: Integration) {
  confirm.require({
    message: t('integrations.removeConfirm'),
    header:  t('integrations.removeTitle'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'),  severity: 'danger' },
    accept: async () => {
      try {
        await integrationsService.delete(ep.id)
        await queryClient.invalidateQueries({ queryKey: ['integrations'] })
        toast.success(t('integrations.removeSuccess'))
      } catch {
        toast.error(t('integrations.removeFailed'))
      }
    },
  })
}

// ── Register Dialog ───────────────────────────────────────────────────────────

const showRegisterDialog = ref(false)
const isRegistering = ref(false)
const regClientId = ref<string | undefined>(undefined)
const regBranchId = ref<string | undefined>(undefined)

watch(regClientId, () => {
  regBranchId.value = undefined
  selectedClientId.value = regClientId.value
})

const registerSchema = computed(() => z.object({
  name: z.string().optional(),
  type: z.string().min(1),
  pullUrl: z.string().url(t('integrations.validUrl')).optional().or(z.literal('')),
  apiKey: z.string().optional(),
  heartbeatIntervalSeconds: z.number().int().min(30).max(86400),
  contractVersion: z.string().optional(),
}))

const registerForm = useForm({
  validationSchema: computed(() => toTypedSchema(registerSchema.value)),
  initialValues: { name: '', type: 'POS', pullUrl: '', apiKey: '', heartbeatIntervalSeconds: 300, contractVersion: '' },
})

const [regName, regNameAttrs] = registerForm.defineField('name')
const [regType]     = registerForm.defineField('type')
const [regUrl, regUrlAttrs]  = registerForm.defineField('pullUrl')
const [regKey, regKeyAttrs]  = registerForm.defineField('apiKey')
const [regInterval] = registerForm.defineField('heartbeatIntervalSeconds')
const [regVersion, regVersionAttrs] = registerForm.defineField('contractVersion')

const typeOptions = computed(() => [
  { label: t('integrations.posSystem'), value: 'POS' },
  { label: t('integrations.custom'),    value: 'CUSTOM' },
])

function openRegisterDialog() {
  registerForm.resetForm()
  regClientId.value = undefined
  regBranchId.value = undefined
  selectedClientId.value = undefined
  showRegisterDialog.value = true
}

const onRegisterSubmit = registerForm.handleSubmit(async (values) => {
  isRegistering.value = true
  try {
    await integrationsService.create({
      name: values.name || undefined,
      type: values.type as 'POS' | 'CUSTOM',
      clientBranchId: regBranchId.value || undefined,
      pullUrl:  values.pullUrl   || undefined,
      apiKey:   values.apiKey    || undefined,
      heartbeatIntervalSeconds: values.heartbeatIntervalSeconds,
      contractVersion: values.contractVersion || undefined,
    })
    await queryClient.invalidateQueries({ queryKey: ['integrations'] })
    showRegisterDialog.value = false
    toast.success(t('integrations.registerSuccess'))
  } catch {
    toast.error(t('integrations.registerFailed'))
  } finally {
    isRegistering.value = false
  }
})

// ── Edit Dialog ───────────────────────────────────────────────────────────────

const showEditDialog = ref(false)
const editingId = ref<string | null>(null)
const isEditing = ref(false)
const editClientId = ref<string | undefined>(undefined)
const editBranchId = ref<string | undefined>(undefined)

watch(editClientId, (val) => {
  selectedClientId.value = val
  editBranchId.value = undefined
})

const editSchema = computed(() => z.object({
  name: z.string().optional(),
  pullUrl: z.string().url(t('integrations.validUrl')).optional().or(z.literal('')),
  apiKey: z.string().optional(),
  heartbeatIntervalSeconds: z.number().int().min(30).max(86400),
  contractVersion: z.string().optional(),
}))

const editForm = useForm({
  validationSchema: computed(() => toTypedSchema(editSchema.value)),
  initialValues: { name: '', pullUrl: '', apiKey: '', heartbeatIntervalSeconds: 300, contractVersion: '' },
})

const [editName, editNameAttrs]    = editForm.defineField('name')
const [editUrl, editUrlAttrs]      = editForm.defineField('pullUrl')
const [editKey, editKeyAttrs]      = editForm.defineField('apiKey')
const [editInterval]               = editForm.defineField('heartbeatIntervalSeconds')
const [editVersion, editVersionAttrs] = editForm.defineField('contractVersion')

function openEditDialog(ep: Integration) {
  editingId.value = ep.id
  editClientId.value = ep.clientId
  editBranchId.value = ep.clientBranchId
  selectedClientId.value = ep.clientId
  editForm.resetForm({
    values: {
      name: ep.name ?? '',
      pullUrl:  ep.pullUrl ?? '',
      apiKey:   '',
      heartbeatIntervalSeconds: ep.heartbeatIntervalSeconds,
      contractVersion: ep.contractVersion ?? '',
    },
  })
  showEditDialog.value = true
}

const onEditSubmit = editForm.handleSubmit(async (values) => {
  if (!editingId.value) return
  isEditing.value = true
  try {
    await integrationsService.update(editingId.value, {
      name: values.name || undefined,
      clientBranchId: editBranchId.value || undefined,
      pullUrl:  values.pullUrl  || undefined,
      apiKey:   values.apiKey   || undefined,
      heartbeatIntervalSeconds: values.heartbeatIntervalSeconds,
      contractVersion: values.contractVersion || undefined,
    })
    await queryClient.invalidateQueries({ queryKey: ['integrations'] })
    showEditDialog.value = false
    toast.success(t('integrations.editSuccess'))
  } catch {
    toast.error(t('integrations.updateFailed'))
  } finally {
    isEditing.value = false
  }
})

// ── Regenerate API Key ────────────────────────────────────────────────────────

const regeneratingKey = ref(false)
const newApiKey = ref<string | null>(null)
const copiedNewKey = ref(false)

async function regenerateKey() {
  if (!editingId.value) return
  regeneratingKey.value = true
  try {
    newApiKey.value = await integrationsService.regenerateApiKey(editingId.value)
  } catch {
    toast.error(t('integrations.regenKeyFailed'))
  } finally {
    regeneratingKey.value = false
  }
}

async function copyNewKey() {
  if (!newApiKey.value) return
  await navigator.clipboard.writeText(newApiKey.value)
  copiedNewKey.value = true
  setTimeout(() => { copiedNewKey.value = false }, 2000)
}

function closeEditDialog() {
  showEditDialog.value = false
  newApiKey.value = null
  copiedNewKey.value = false
}

// ── Details Drawer ────────────────────────────────────────────────────────────

const showDrawer = ref(false)
const drawerEndpoint = ref<Integration | null>(null)
const drawerTab = ref('0')
const eventsPage = ref(0)
const webhooksPage = ref(0)

const { data: eventsResult, isLoading: eventsLoading } = useQuery({
  queryKey: computed(() => ['integration-events', drawerEndpoint.value?.id, eventsPage.value]),
  queryFn: () => integrationsService.getEvents(drawerEndpoint.value!.id, eventsPage.value, 10),
  enabled: computed(() => !!drawerEndpoint.value && showDrawer.value),
  staleTime: 30000,
})

const { data: webhooksResult, isLoading: webhooksLoading } = useQuery({
  queryKey: computed(() => ['integration-webhooks', drawerEndpoint.value?.id, webhooksPage.value]),
  queryFn: () => integrationsService.getWebhooks(drawerEndpoint.value!.id, webhooksPage.value, 10),
  enabled: computed(() => !!drawerEndpoint.value && showDrawer.value),
  staleTime: 30000,
})

const events = computed<IntegrationEvent[]>(() => eventsResult.value?.content ?? [])
const webhooks = computed<WebhookDelivery[]>(() => webhooksResult.value?.content ?? [])

function openDrawer(ep: Integration) {
  drawerEndpoint.value = ep
  drawerTab.value = '0'
  eventsPage.value = 0
  webhooksPage.value = 0
  showDrawer.value = true
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDatetime(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function webhookSeverity(status: WebhookDelivery['status']) {
  if (status === 'DELIVERED') return 'success'
  if (status === 'FAILED')    return 'danger'
  return 'warn'
}
</script>

<template>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex items-start justify-between gap-4">
      <div class="flex items-center gap-2">
        <div>
          <h2 class="text-lg font-semibold text-[var(--text)]">{{ t('integrations.title') }}</h2>
          <p class="text-sm text-[var(--text-muted)]">{{ t('integrations.subtitle') }}</p>
        </div>
        <PageInfoButton :title="t('integrations.title')" :description="t('pageInfo.integrations')" />
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <Button
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          rounded
          v-tooltip.top="t('common.retry')"
          :loading="isFetching"
          @click="refetch()"
        />
        <Button
          :label="t('integrations.registerEndpoint')"
          icon="pi pi-plus"
          @click="openRegisterDialog"
        />
      </div>
    </div>

    <!-- Stats strip -->
    <div v-if="!isLoading && !isError" class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <p class="text-xs text-[var(--text-muted)] mb-1">{{ t('integrations.totalLabel') }}</p>
        <p class="text-2xl font-bold text-[var(--text)]">{{ stats.total }}</p>
      </div>
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <p class="text-xs text-[var(--text-muted)] mb-1">{{ t('integrations.activeLabel') }}</p>
        <p class="text-2xl font-bold text-emerald-500">{{ stats.active }}</p>
      </div>
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <p class="text-xs text-[var(--text-muted)] mb-1">POS</p>
        <p class="text-2xl font-bold text-[var(--primary)]">{{ stats.pos }}</p>
      </div>
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <p class="text-xs text-[var(--text-muted)] mb-1">{{ t('integrations.filterCustom') }}</p>
        <p class="text-2xl font-bold text-slate-400">{{ stats.custom }}</p>
      </div>
    </div>

    <!-- Filter tabs -->
    <div v-if="!isLoading && !isError && integrations.length > 0" class="flex items-center gap-1 p-1 rounded-lg bg-[var(--surface-alt,var(--surface))] border border-[var(--border)] w-fit">
      <button
        v-for="tab in filterTabs"
        :key="tab.key"
        class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
        :class="activeFilter === tab.value
          ? 'bg-[var(--primary)] text-white shadow-sm'
          : 'text-[var(--text-muted)] hover:text-[var(--text)]'"
        @click="activeFilter = tab.value"
      >
        {{ t(`integrations.${tab.label}`) }}
      </button>
    </div>

    <!-- Error -->
    <div
      v-if="isError"
      class="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between"
    >
      <span>{{ t('integrations.loadFailed') }}</span>
      <Button :label="t('common.retry')" size="small" severity="danger" text @click="refetch()" />
    </div>

    <!-- Loading skeleton -->
    <SkeletonTable v-else-if="isLoading" :rows="4" :cols="6" />

    <!-- Empty state -->
    <EmptyState
      v-else-if="filteredIntegrations.length === 0"
      :title="t('integrations.noRows')"
      :description="t('integrations.noRowsHint')"
      :action-label="activeFilter === 'ALL' ? t('integrations.registerEndpoint') : undefined"
      @action="openRegisterDialog"
    >
      <template #icon><Plug class="w-7 h-7 text-[var(--primary)]" /></template>
    </EmptyState>

    <!-- Table -->
    <DataTable
      v-else
      :value="filteredIntegrations"
      striped-rows
      class="rounded-xl overflow-hidden border border-[var(--border)]"
    >
      <!-- Name / Type -->
      <Column :header="t('integrations.nameType')" style="min-width: 160px">
        <template #body="{ data: row }: { data: Integration }">
          <div>
            <p class="text-sm font-medium text-[var(--text)]">{{ row.name || '—' }}</p>
            <Tag :value="row.type" :severity="row.type === 'POS' ? 'info' : 'secondary'" class="mt-1" />
          </div>
        </template>
      </Column>

      <!-- Client / Branch -->
      <Column :header="t('integrations.clientBranch')" style="min-width: 160px">
        <template #body="{ data: row }: { data: Integration }">
          <div v-if="row.clientName">
            <button
              class="text-sm font-medium text-[var(--primary)] hover:underline text-left"
              @click="router.push(`/clients/${row.clientId}`)"
            >
              {{ row.clientName }}
            </button>
            <p class="text-xs text-[var(--text-muted)]">{{ row.branchName }}</p>
          </div>
          <span v-else class="text-xs text-[var(--text-muted)] italic">{{ t('integrations.noClient') }}</span>
        </template>
      </Column>

      <!-- Poll URL -->
      <Column field="pullUrl" :header="t('integrations.pullUrl')" style="min-width: 200px">
        <template #body="{ data: row }: { data: Integration }">
          <div v-if="row.pullUrl" class="flex items-center gap-1.5 min-w-0">
            <Link2 class="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
            <span class="text-xs font-mono text-[var(--text-muted)] truncate max-w-[170px]" :title="row.pullUrl">
              {{ row.pullUrl }}
            </span>
            <button
              class="ml-1 p-0.5 rounded hover:bg-[var(--border)] transition-colors shrink-0"
              v-tooltip.top="t('common.copy', 'Copy')"
              @click="copyUrl(row)"
            >
              <Check v-if="copiedId === row.id" class="w-3 h-3 text-emerald-500" />
              <Copy v-else class="w-3 h-3 text-[var(--text-muted)]" />
            </button>
          </div>
          <span v-else class="text-xs text-[var(--text-muted)] italic">{{ t('integrations.noPullUrl') }}</span>
        </template>
      </Column>

      <!-- Interval -->
      <Column field="heartbeatIntervalSeconds" :header="t('integrations.interval')" style="width: 110px">
        <template #body="{ data: row }: { data: Integration }">
          <span class="text-sm text-[var(--text-muted)]">
            {{ t('integrations.heartbeatEvery', { interval: row.heartbeatIntervalSeconds }) }}
          </span>
        </template>
      </Column>

      <!-- Status -->
      <Column field="active" :header="t('integrations.status')" style="width: 100px">
        <template #body="{ data: row }: { data: Integration }">
          <Tag
            :severity="row.active ? 'success' : 'secondary'"
            :value="row.active ? t('integrations.activeLabel') : t('integrations.inactiveLabel')"
          />
        </template>
      </Column>

      <!-- Actions -->
      <Column :header="t('common.actions')" style="width: 180px">
        <template #body="{ data: row }: { data: Integration }">
          <div class="flex items-center gap-0.5">
            <!-- Details drawer -->
            <Button
              text rounded size="small" severity="secondary"
              v-tooltip.top="t('integrations.viewDetails')"
              @click="openDrawer(row)"
            >
              <template #icon><ChevronRight class="w-3.5 h-3.5" /></template>
            </Button>
            <!-- Edit -->
            <Button
              text rounded size="small" severity="secondary"
              v-tooltip.top="t('common.edit')"
              @click="openEditDialog(row)"
            >
              <template #icon><Pencil class="w-3.5 h-3.5" /></template>
            </Button>
            <!-- Check Now -->
            <Button
              text rounded size="small" severity="info"
              v-tooltip.top="t('integrations.checkNow')"
              :loading="checkingNow === row.id"
              @click="checkNow(row)"
            >
              <template #icon><Zap class="w-3.5 h-3.5" /></template>
            </Button>
            <!-- Toggle active -->
            <Button
              text rounded size="small"
              :severity="row.active ? 'warn' : 'success'"
              v-tooltip.top="row.active ? t('integrations.deactivate') : t('integrations.activate')"
              @click="confirmToggle(row)"
            >
              <template #icon>
                <Pause v-if="row.active"  class="w-3.5 h-3.5" />
                <Play  v-else             class="w-3.5 h-3.5" />
              </template>
            </Button>
            <!-- Delete -->
            <Button
              text rounded size="small" severity="danger"
              v-tooltip.top="t('integrations.remove')"
              @click="confirmDelete(row)"
            >
              <template #icon><Trash2 class="w-3.5 h-3.5" /></template>
            </Button>
          </div>
        </template>
      </Column>
    </DataTable>
  </div>

  <!-- ── Register Dialog ──────────────────────────────────────────────────── -->
  <AppDialog
    v-model:visible="showRegisterDialog"
    :title="t('integrations.registerTitle')"
    :subtitle="t('integrations.registerSubtitle')"
    :loading="isRegistering"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onRegisterSubmit">
      <FormField :label="t('integrations.name')" name="reg-name" :error="registerForm.errors.value.name">
        <InputText
          v-model="regName"
          v-bind="regNameAttrs"
          :placeholder="t('integrations.namePlaceholder')"
          class="w-full"
          :disabled="isRegistering"
        />
      </FormField>
      <FormField :label="t('integrations.type')" name="reg-type" :error="registerForm.errors.value.type" required>
        <Select
          v-model="regType"
          :options="typeOptions"
          option-label="label"
          option-value="value"
          :placeholder="t('integrations.selectType')"
          class="w-full"
          :disabled="isRegistering"
        />
      </FormField>
      <FormField :label="t('integrations.client')" name="reg-client">
        <Select
          v-model="regClientId"
          :options="allClients"
          option-label="name"
          option-value="id"
          :placeholder="t('integrations.selectClient')"
          class="w-full"
          :disabled="isRegistering"
          show-clear
        />
      </FormField>
      <FormField v-if="regClientId" :label="t('integrations.branch')" name="reg-branch">
        <Select
          v-model="regBranchId"
          :options="clientBranches"
          option-label="name"
          option-value="id"
          :placeholder="t('integrations.selectBranch')"
          class="w-full"
          :disabled="isRegistering"
          show-clear
        />
      </FormField>
      <FormField :label="t('integrations.pullUrl')" name="reg-url" :error="registerForm.errors.value.pullUrl">
        <InputText
          v-model="regUrl"
          v-bind="regUrlAttrs"
          placeholder="https://pos.example.com/api/health"
          class="w-full"
          :disabled="isRegistering"
        />
      </FormField>
      <FormField :label="t('integrations.apiKey')" name="reg-key" :error="registerForm.errors.value.apiKey">
        <InputText
          v-model="regKey"
          v-bind="regKeyAttrs"
          type="password"
          :placeholder="t('integrations.apiKeyHint')"
          class="w-full"
          :disabled="isRegistering"
        />
      </FormField>
      <FormField :label="t('integrations.interval')" name="reg-interval" :error="registerForm.errors.value.heartbeatIntervalSeconds">
        <InputNumber
          v-model="regInterval"
          :min="30"
          :max="86400"
          class="w-full"
          :disabled="isRegistering"
        />
        <p class="text-xs text-[var(--text-muted)] mt-1">{{ t('integrations.intervalHint') }}</p>
      </FormField>
      <FormField :label="t('integrations.contractVersion')" name="reg-version" :error="registerForm.errors.value.contractVersion">
        <InputText
          v-model="regVersion"
          v-bind="regVersionAttrs"
          :placeholder="t('integrations.contractVersionPlaceholder')"
          class="w-full"
          :disabled="isRegistering"
        />
      </FormField>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined :disabled="isRegistering" @click="showRegisterDialog = false" />
        <Button :label="t('integrations.register')" :loading="isRegistering" @click="onRegisterSubmit" />
      </div>
    </template>
  </AppDialog>

  <!-- ── Edit Dialog ──────────────────────────────────────────────────────── -->
  <AppDialog
    v-model:visible="showEditDialog"
    :title="t('integrations.editTitle')"
    :subtitle="t('integrations.editSubtitle')"
    :loading="isEditing"
    @update:visible="(val) => { if (!val) closeEditDialog() }"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onEditSubmit">
      <FormField :label="t('integrations.name')" name="edit-name" :error="editForm.errors.value.name">
        <InputText
          v-model="editName"
          v-bind="editNameAttrs"
          :placeholder="t('integrations.namePlaceholder')"
          class="w-full"
          :disabled="isEditing"
        />
      </FormField>
      <FormField :label="t('integrations.client')" name="edit-client">
        <Select
          v-model="editClientId"
          :options="allClients"
          option-label="name"
          option-value="id"
          :placeholder="t('integrations.selectClient')"
          class="w-full"
          :disabled="isEditing"
          show-clear
        />
      </FormField>
      <FormField v-if="editClientId" :label="t('integrations.branch')" name="edit-branch">
        <Select
          v-model="editBranchId"
          :options="clientBranches"
          option-label="name"
          option-value="id"
          :placeholder="t('integrations.selectBranch')"
          class="w-full"
          :disabled="isEditing"
          show-clear
        />
      </FormField>
      <FormField :label="t('integrations.pullUrl')" name="edit-url" :error="editForm.errors.value.pullUrl">
        <InputText
          v-model="editUrl"
          v-bind="editUrlAttrs"
          placeholder="https://pos.example.com/api/health"
          class="w-full"
          :disabled="isEditing"
        />
      </FormField>
      <FormField :label="t('integrations.apiKey')" name="edit-key" :error="editForm.errors.value.apiKey">
        <InputText
          v-model="editKey"
          v-bind="editKeyAttrs"
          type="password"
          :placeholder="t('integrations.apiKeyKeepHint')"
          class="w-full"
          :disabled="isEditing"
        />
      </FormField>
      <FormField :label="t('integrations.interval')" name="edit-interval" :error="editForm.errors.value.heartbeatIntervalSeconds">
        <InputNumber
          v-model="editInterval"
          :min="30"
          :max="86400"
          class="w-full"
          :disabled="isEditing"
        />
        <p class="text-xs text-[var(--text-muted)] mt-1">{{ t('integrations.intervalHint') }}</p>
      </FormField>
      <FormField :label="t('integrations.contractVersion')" name="edit-version" :error="editForm.errors.value.contractVersion">
        <InputText
          v-model="editVersion"
          v-bind="editVersionAttrs"
          :placeholder="t('integrations.contractVersionPlaceholder')"
          class="w-full"
          :disabled="isEditing"
        />
      </FormField>

      <!-- Regenerate API Key -->
      <div class="rounded-lg border border-[var(--border)] bg-[var(--surface-alt,var(--surface))] p-3 space-y-2">
        <p class="text-xs font-medium text-[var(--text-muted)]">{{ t('integrations.regenerateKeySection') }}</p>
        <Button
          :label="t('integrations.regenerateKey')"
          severity="warn"
          outlined
          size="small"
          :loading="regeneratingKey"
          @click.prevent="regenerateKey"
        >
          <template #icon><RefreshCw class="w-3.5 h-3.5 mr-1" /></template>
        </Button>
        <div v-if="newApiKey" class="mt-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
          <p class="text-xs text-amber-700 dark:text-amber-400 font-medium">{{ t('integrations.newKeyWarning') }}</p>
          <div class="flex items-center gap-2 font-mono text-xs bg-white dark:bg-zinc-900 border border-[var(--border)] rounded px-3 py-2">
            <span class="flex-1 break-all">{{ newApiKey }}</span>
            <button class="shrink-0 p-1 rounded hover:bg-[var(--border)]" @click.prevent="copyNewKey">
              <Check v-if="copiedNewKey" class="w-3.5 h-3.5 text-emerald-500" />
              <Copy v-else class="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </button>
          </div>
        </div>
      </div>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined :disabled="isEditing" @click="closeEditDialog" />
        <Button :label="t('common.save')" :loading="isEditing" @click="onEditSubmit" />
      </div>
    </template>
  </AppDialog>

  <!-- ── Details Drawer ──────────────────────────────────────────────────── -->
  <Drawer
    v-model:visible="showDrawer"
    :header="drawerEndpoint?.name || drawerEndpoint?.pullUrl || t('integrations.viewDetails')"
    position="right"
    style="width: 520px"
  >
    <div v-if="drawerEndpoint" class="space-y-4">
      <!-- Endpoint meta -->
      <div class="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 space-y-1">
        <div class="flex items-center gap-2">
          <Tag :value="drawerEndpoint.type" :severity="drawerEndpoint.type === 'POS' ? 'info' : 'secondary'" />
          <Tag :severity="drawerEndpoint.active ? 'success' : 'secondary'" :value="drawerEndpoint.active ? t('integrations.activeLabel') : t('integrations.inactiveLabel')" />
        </div>
        <p v-if="drawerEndpoint.clientName" class="text-sm text-[var(--text-muted)]">
          {{ drawerEndpoint.clientName }} <span class="opacity-60">›</span> {{ drawerEndpoint.branchName }}
        </p>
        <p v-if="drawerEndpoint.pullUrl" class="text-xs font-mono text-[var(--text-muted)] truncate">{{ drawerEndpoint.pullUrl }}</p>
      </div>

      <!-- Tabs: Events / Webhooks -->
      <Tabs v-model:value="drawerTab">
        <TabList>
          <Tab value="0">{{ t('integrations.eventsTab') }}</Tab>
          <Tab value="1">{{ t('integrations.webhooksTab') }}</Tab>
        </TabList>
        <TabPanels>
          <!-- Events -->
          <TabPanel value="0">
            <div v-if="eventsLoading" class="py-8 text-center text-sm text-[var(--text-muted)]">{{ t('common.loading') }}</div>
            <div v-else-if="events.length === 0" class="py-8 text-center text-sm text-[var(--text-muted)]">{{ t('integrations.noEvents') }}</div>
            <div v-else class="space-y-2 mt-2">
              <div
                v-for="ev in events"
                :key="ev.id"
                class="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 space-y-1"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-medium font-mono text-[var(--text)]">{{ ev.eventType }}</span>
                  <Tag
                    :value="ev.processedAt ? t('integrations.processed') : t('integrations.pending')"
                    :severity="ev.processedAt ? 'success' : 'warn'"
                    class="text-xs"
                  />
                </div>
                <p class="text-xs text-[var(--text-muted)]">{{ formatDatetime(ev.receivedAt) }}</p>
              </div>
              <div class="flex justify-between items-center pt-1">
                <Button text size="small" :disabled="eventsPage === 0" @click="eventsPage--">{{ t('common.previous') }}</Button>
                <span class="text-xs text-[var(--text-muted)]">{{ t('common.page') }} {{ eventsPage + 1 }}</span>
                <Button text size="small" :disabled="(eventsResult?.last ?? true)" @click="eventsPage++">{{ t('common.next') }}</Button>
              </div>
            </div>
          </TabPanel>

          <!-- Webhooks -->
          <TabPanel value="1">
            <div v-if="webhooksLoading" class="py-8 text-center text-sm text-[var(--text-muted)]">{{ t('common.loading') }}</div>
            <div v-else-if="webhooks.length === 0" class="py-8 text-center text-sm text-[var(--text-muted)]">{{ t('integrations.noWebhooks') }}</div>
            <div v-else class="space-y-2 mt-2">
              <div
                v-for="wh in webhooks"
                :key="wh.id"
                class="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 space-y-1"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="text-xs font-mono text-[var(--text-muted)] truncate max-w-[260px]" :title="wh.url">{{ wh.url }}</span>
                  <Tag :value="wh.status" :severity="webhookSeverity(wh.status)" class="text-xs shrink-0" />
                </div>
                <div class="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                  <span>{{ t('integrations.attempts') }}: {{ wh.attempts }}</span>
                  <span v-if="wh.responseStatus">HTTP {{ wh.responseStatus }}</span>
                  <span>{{ formatDatetime(wh.lastAttemptAt) }}</span>
                </div>
              </div>
              <div class="flex justify-between items-center pt-1">
                <Button text size="small" :disabled="webhooksPage === 0" @click="webhooksPage--">{{ t('common.previous') }}</Button>
                <span class="text-xs text-[var(--text-muted)]">{{ t('common.page') }} {{ webhooksPage + 1 }}</span>
                <Button text size="small" :disabled="(webhooksResult?.last ?? true)" @click="webhooksPage++">{{ t('common.next') }}</Button>
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </Drawer>
</template>
