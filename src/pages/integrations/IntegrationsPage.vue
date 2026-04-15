<script setup lang="ts">
import { ref, computed } from 'vue'
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
import AppDialog from '@/components/ui/AppDialog.vue'
import FormField from '@/components/ui/FormField.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { integrationsService } from '@/services/integrations.service'
import { useToast } from '@/composables/useToast'
import type { Integration } from '@/types/integration'
import { Plug, Link2, Copy, Check, Pencil, Zap, Play, Pause, Trash2 } from 'lucide-vue-next'
import PageInfoButton from '@/components/ui/PageInfoButton.vue'

const { t } = useI18n()
const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()

// ── Data ─────────────────────────────────────────────────────────────────────

const { data: result, isLoading, isFetching, isError, refetch } = useQuery({
  queryKey: ['integrations'],
  queryFn: () => integrationsService.list(0, 200),
  staleTime: 30000,
})

const integrations = computed(() => result.value?.content ?? [])

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
  } catch {
    /* ignore */
  }
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
      ? t('integrations.activateConfirm', { name: ep.pullUrl || ep.id })
      : t('integrations.deactivateConfirm', { name: ep.pullUrl || ep.id }),
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

const registerSchema = computed(() => z.object({
  type: z.string().min(1),
  pullUrl: z.string().url(t('integrations.validUrl')).optional().or(z.literal('')),
  apiKey: z.string().optional(),
  heartbeatIntervalSeconds: z.number().int().min(30).max(86400),
  contractVersion: z.string().optional(),
}))

const registerForm = useForm({
  validationSchema: computed(() => toTypedSchema(registerSchema.value)),
  initialValues: { type: 'POS', pullUrl: '', apiKey: '', heartbeatIntervalSeconds: 300, contractVersion: '' },
})

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
  showRegisterDialog.value = true
}

const onRegisterSubmit = registerForm.handleSubmit(async (values) => {
  isRegistering.value = true
  try {
    await integrationsService.create({
      type: values.type as 'POS' | 'CUSTOM',
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

const editSchema = computed(() => z.object({
  pullUrl: z.string().url(t('integrations.validUrl')).optional().or(z.literal('')),
  apiKey: z.string().optional(),
  heartbeatIntervalSeconds: z.number().int().min(30).max(86400),
  contractVersion: z.string().optional(),
}))

const editForm = useForm({
  validationSchema: computed(() => toTypedSchema(editSchema.value)),
  initialValues: { pullUrl: '', apiKey: '', heartbeatIntervalSeconds: 300, contractVersion: '' },
})

const [editUrl, editUrlAttrs]      = editForm.defineField('pullUrl')
const [editKey, editKeyAttrs]      = editForm.defineField('apiKey')
const [editInterval]               = editForm.defineField('heartbeatIntervalSeconds')
const [editVersion, editVersionAttrs] = editForm.defineField('contractVersion')

function openEditDialog(ep: Integration) {
  editingId.value = ep.id
  editForm.resetForm({
    values: {
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
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
      <!-- Type -->
      <Column field="type" :header="t('integrations.type')" style="width: 110px">
        <template #body="{ data: row }: { data: Integration }">
          <Tag
            :value="row.type"
            :severity="row.type === 'POS' ? 'info' : 'secondary'"
          />
        </template>
      </Column>

      <!-- Poll URL -->
      <Column field="pullUrl" :header="t('integrations.pullUrl')" style="min-width: 220px">
        <template #body="{ data: row }: { data: Integration }">
          <div v-if="row.pullUrl" class="flex items-center gap-1.5 min-w-0">
            <Link2 class="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
            <span class="text-xs font-mono text-[var(--text-muted)] truncate max-w-[200px]" :title="row.pullUrl">
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
      <Column field="heartbeatIntervalSeconds" :header="t('integrations.interval')" style="width: 130px">
        <template #body="{ data: row }: { data: Integration }">
          <span class="text-sm text-[var(--text-muted)]">
            {{ t('integrations.heartbeatEvery', { interval: row.heartbeatIntervalSeconds }) }}
          </span>
        </template>
      </Column>

      <!-- Contract version -->
      <Column field="contractVersion" :header="t('integrations.contractVersion')" style="width: 120px">
        <template #body="{ data: row }: { data: Integration }">
          <span class="text-sm text-[var(--text-muted)]">{{ row.contractVersion || t('common.none') }}</span>
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

      <!-- Created -->
      <Column field="createdAt" :header="t('integrations.createdAt')" style="width: 120px">
        <template #body="{ data: row }: { data: Integration }">
          <span class="text-xs text-[var(--text-muted)]">{{ formatDate(row.createdAt) }}</span>
        </template>
      </Column>

      <!-- Actions -->
      <Column :header="t('common.actions')" style="width: 150px">
        <template #body="{ data: row }: { data: Integration }">
          <div class="flex items-center gap-0.5">
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
  >
    <form class="flex flex-col gap-4" @submit.prevent="onEditSubmit">
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
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined :disabled="isEditing" @click="showEditDialog = false" />
        <Button :label="t('common.save')" :loading="isEditing" @click="onEditSubmit" />
      </div>
    </template>
  </AppDialog>
</template>
