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
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Button from 'primevue/button'
import AppDialog from '@/components/ui/AppDialog.vue'
import FormField from '@/components/ui/FormField.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import { campaignsService } from '@/services/campaigns.service'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import type { Campaign } from '@/types/campaign'

const { t } = useI18n()
const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()

const { data: result, isLoading, isError, refetch } = useQuery({
  queryKey: ['campaigns'],
  queryFn: () => campaignsService.list({ page: 0, size: 200 }),
  staleTime: 30000,
})

const campaigns = computed(() => result.value?.content ?? [])
const totalRecords = computed(() => result.value?.totalElements ?? 0)

function formatDate(dateStr: string) {
  return dayjs(dateStr).format('DD MMM YYYY')
}

function statusSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
  const map: Record<string, any> = { ACTIVE: 'success', DRAFT: 'info', SENT: 'secondary', PAUSED: 'warn' }
  return map[status] || 'secondary'
}

const typeOptions = computed(() => [
  { label: t('campaigns.typeEmail'), value: 'EMAIL' },
  { label: t('campaigns.typeSms'), value: 'SMS' },
  { label: t('campaigns.typePush'), value: 'PUSH' },
  { label: t('campaigns.typeInApp'), value: 'IN_APP' },
])

// --- Create ---
const showCreateDialog = ref(false)
const isSubmitting = ref(false)

const createSchema = z.object({
  name: z.string().min(2, t('campaigns.nameMin')),
  type: z.string().min(1, t('campaigns.typeRequired')),
  subject: z.string().optional(),
  body: z.string().min(5, t('campaigns.bodyMin')),
  targetAudience: z.string().optional(),
})

const createForm = useForm({
  validationSchema: toTypedSchema(createSchema),
  initialValues: { name: '', type: 'EMAIL', subject: '', body: '', targetAudience: '' },
})

const [cName, cNameAttrs] = createForm.defineField('name')
const [cType] = createForm.defineField('type')
const [cSubject, cSubjectAttrs] = createForm.defineField('subject')
const [cBody, cBodyAttrs] = createForm.defineField('body')
const [cAudience, cAudienceAttrs] = createForm.defineField('targetAudience')

function openCreateDialog() {
  createForm.resetForm()
  showCreateDialog.value = true
}

const onCreateSubmit = createForm.handleSubmit(async (values) => {
  isSubmitting.value = true
  try {
    await campaignsService.create(values as any)
    await queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    showCreateDialog.value = false
    toast.success(t('campaigns.createSuccess'))
  } catch {
    toast.error(t('campaigns.createFailed'))
  } finally {
    isSubmitting.value = false
  }
})

function confirmSend(c: Campaign) {
  confirm.require({
    message: t('campaigns.sendConfirm', { name: c.name }),
    header: t('campaigns.sendTitle'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('campaigns.sendNow'), severity: 'success' },
    accept: async () => {
      try {
        await campaignsService.send(c.id)
        await queryClient.invalidateQueries({ queryKey: ['campaigns'] })
        toast.success(t('campaigns.sendSuccess'))
      } catch {
        toast.error(t('campaigns.sendFailed'))
      }
    }
  })
}

function confirmDelete(c: Campaign) {
  confirm.require({
    message: t('campaigns.deleteConfirm', { name: c.name }),
    header: t('campaigns.deleteTitle'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: async () => {
      try {
        await campaignsService.delete(c.id)
        await queryClient.invalidateQueries({ queryKey: ['campaigns'] })
        toast.success(t('campaigns.deleteSuccess'))
      } catch {
        toast.error(t('campaigns.deleteFailed'))
      }
    }
  })
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-start justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">{{ t('campaigns.title') }}</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ t('campaigns.totalCount', { count: totalRecords }) }}</p>
      </div>
      <div class="flex gap-2">
        <Button icon="pi pi-refresh" severity="secondary" outlined @click="refetch()" />
        <Button :label="t('campaigns.newCampaign')" icon="pi pi-plus" @click="openCreateDialog" />
      </div>
    </div>

    <div v-if="isError" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
      <span>{{ t('campaigns.loadFailed') }}</span>
      <Button :label="t('common.retry')" size="small" severity="danger" text @click="refetch()" />
    </div>

    <SkeletonTable v-else-if="isLoading" :rows="5" :cols="7" />

    <DataTable v-else :value="campaigns" striped-rows class="rounded-xl overflow-hidden">
      <Column field="name" :header="t('campaigns.campaign')" style="min-width: 180px">
        <template #body="{ data: row }: { data: Campaign }">
          <span class="font-medium text-[var(--text)]">{{ row.name }}</span>
        </template>
      </Column>
      <Column field="type" :header="t('campaigns.type')" style="width: 120px">
        <template #body="{ data: row }: { data: Campaign }">
          <span class="text-sm text-[var(--text-muted)]">{{ typeOptions.find(o => o.value === row.type)?.label ?? row.type }}</span>
        </template>
      </Column>
      <Column field="status" :header="t('campaigns.status')" style="width: 110px">
        <template #body="{ data: row }: { data: Campaign }">
          <Tag :severity="statusSeverity(row.status)" :value="row.status" />
        </template>
      </Column>
      <Column field="targetAudience" :header="t('campaigns.audience')" style="min-width: 160px">
        <template #body="{ data: row }: { data: Campaign }">
          <span class="text-sm text-[var(--text-muted)] truncate block max-w-xs">{{ row.targetAudience ?? '—' }}</span>
        </template>
      </Column>
      <Column field="createdAt" :header="t('campaigns.createdAt')" sortable style="width: 130px">
        <template #body="{ data: row }: { data: Campaign }">
          <span class="text-sm text-[var(--text-muted)]">{{ formatDate(row.createdAt) }}</span>
        </template>
      </Column>
      <Column :header="t('common.actions')" style="width: 130px">
        <template #body="{ data: row }: { data: Campaign }">
          <div class="flex gap-1">
            <Button v-if="row.status === 'DRAFT'" :label="t('campaigns.sendNow')" size="small" severity="success" outlined @click="confirmSend(row)" />
            <Button icon="pi pi-trash" severity="danger" text rounded size="small" @click="confirmDelete(row)" />
          </div>
        </template>
      </Column>
      <template #empty>
        <div class="text-center py-10 text-[var(--text-muted)]">{{ t('campaigns.noRows') }}</div>
      </template>
    </DataTable>

    <!-- Backend note -->
    <div class="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
      {{ t('campaigns.backendNote') }}
    </div>
  </div>

  <!-- Create Dialog -->
  <AppDialog v-model:visible="showCreateDialog" :title="t('campaigns.createTitle')" :subtitle="t('campaigns.createSubtitle')" :loading="isSubmitting">
    <form class="flex flex-col gap-4" @submit.prevent="onCreateSubmit">
      <FormField :label="t('campaigns.formName')" name="c-name" :error="createForm.errors.value.name" required>
        <InputText v-model="cName" v-bind="cNameAttrs" :placeholder="t('campaigns.formNamePlaceholder')" class="w-full" :disabled="isSubmitting" />
      </FormField>
      <FormField :label="t('campaigns.type')" name="c-type" :error="createForm.errors.value.type" required>
        <Select v-model="cType" :options="typeOptions" option-label="label" option-value="value" class="w-full" :disabled="isSubmitting" />
      </FormField>
      <FormField :label="t('campaigns.formSubject')" name="c-subject" :error="createForm.errors.value.subject">
        <InputText v-model="cSubject" v-bind="cSubjectAttrs" :placeholder="t('campaigns.formSubjectPlaceholder')" class="w-full" :disabled="isSubmitting" />
      </FormField>
      <FormField :label="t('campaigns.formBody')" name="c-body" :error="createForm.errors.value.body" required>
        <Textarea v-model="cBody" v-bind="cBodyAttrs" :placeholder="t('campaigns.formBodyPlaceholder')" :rows="4" class="w-full" :disabled="isSubmitting" />
      </FormField>
      <FormField :label="t('campaigns.formAudience')" name="c-audience" :error="createForm.errors.value.targetAudience">
        <InputText v-model="cAudience" v-bind="cAudienceAttrs" :placeholder="t('campaigns.formAudiencePlaceholder')" class="w-full" :disabled="isSubmitting" />
      </FormField>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined :disabled="isSubmitting" @click="showCreateDialog = false" />
        <Button :label="t('common.create')" :loading="isSubmitting" @click="onCreateSubmit" />
      </div>
    </template>
  </AppDialog>
</template>
