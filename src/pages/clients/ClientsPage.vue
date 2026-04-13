<script setup lang="ts">
import { ref, computed, unref } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
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
import { clientsService } from '@/services/clients.service'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import type { Client } from '@/types/client'

const router = useRouter()
const { t } = useI18n()
const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()

function confirmDeleteClient(client: Client) {
  confirm.require({
    message: t('clientsPage.deleteConfirm', { name: client.name }),
    header: t('clientsPage.deleteHeader'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: async () => {
      try {
        await clientsService.delete(client.id)
        await queryClient.invalidateQueries({ queryKey: ['clients'] })
        toast.success(t('common.delete'))
      } catch {
        toast.error(t('errors.loadFailed'))
      }
    }
  })
}

const pageSize = 20
const globalFilter = ref('')
const appliedFilter = ref('')

let searchTimeout: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    appliedFilter.value = globalFilter.value
  }, 400)
}

/**
 * Same query as Tickets page dropdown: one fetch (page 0, size 200) so cache is shared
 * and the Clients view shows the same data you already see when picking a client elsewhere.
 */
const {
  data: result,
  isPending,
  isFetching,
  isError,
  error: queryError,
  refetch
} = useQuery({
  queryKey: ['clients', 'list'],
  queryFn: () => clientsService.list({ page: 0, size: 200 }),
  staleTime: 60000,
  placeholderData: undefined
})

const allClients = computed(() => result.value?.content ?? [])

const filteredClients = computed(() => {
  const q = appliedFilter.value.trim().toLowerCase()
  if (!q) return allClients.value
  return allClients.value.filter(
    c =>
      c.name.toLowerCase().includes(q) ||
      (c.legalName?.toLowerCase().includes(q) ?? false) ||
      (c.country?.toLowerCase().includes(q) ?? false) ||
      (c.taxId?.toLowerCase().includes(q) ?? false)
  )
})

const totalRecords = computed(() => filteredClients.value.length)

const queryErrorText = computed(() => {
  const e = unref(queryError)
  if (!e) return ''
  if (e instanceof Error) return e.message
  return String(e)
})

function statusSeverity(status?: string): 'success' | 'warn' | 'danger' | 'secondary' {
  if (!status) return 'secondary'
  if (status === 'ACTIVE') return 'success'
  if (status === 'INACTIVE') return 'secondary'
  if (status === 'SUSPENDED') return 'danger'
  return 'secondary'
}

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return '—'
  const d = dayjs(dateStr)
  return d.isValid() ? d.format('DD MMM YYYY') : '—'
}

// --- Create Client Modal ---
const showCreateDialog = ref(false)
const isSubmitting = ref(false)

// Do not use Zod .default() with toTypedSchema — Zod 4 breaks @vee-validate/zod; use initialValues.
const segmentOptions = [
  { label: '— None —',    value: '' },
  { label: 'SMB',         value: 'SMB' },
  { label: 'Mid-Market',  value: 'MID_MARKET' },
  { label: 'Enterprise',  value: 'ENTERPRISE' },
]

const schema = z.object({
  name:      z.string().min(2, 'Min 2 characters'),
  legalName: z.string().optional(),
  taxId:     z.string().optional(),
  country:   z.string().min(2, 'Country code (e.g. MX)'),
  website:   z.string().url('Must be a valid URL').optional().or(z.literal('')),
  industry:  z.string().optional(),
  segment:   z.string().optional(),
  notes:     z.string().optional(),
})

const createForm = useForm({
  validationSchema: toTypedSchema(schema),
  initialValues: { name: '', legalName: '', taxId: '', country: 'MX', website: '', industry: '', segment: '', notes: '' }
})

const [nameValue, nameAttrs]           = createForm.defineField('name')
const [legalNameValue, legalNameAttrs] = createForm.defineField('legalName')
const [taxIdValue, taxIdAttrs]         = createForm.defineField('taxId')
const [countryValue, countryAttrs]     = createForm.defineField('country')
const [websiteValue, websiteAttrs]     = createForm.defineField('website')
const [industryValue, industryAttrs]   = createForm.defineField('industry')
const [segmentValue]                   = createForm.defineField('segment')
const [notesValue, notesAttrs]         = createForm.defineField('notes')

function openCreateDialog() {
  createForm.resetForm()
  showCreateDialog.value = true
}

const onSubmit = createForm.handleSubmit(async (values) => {
  isSubmitting.value = true
  try {
    await clientsService.create({
      name:      values.name,
      legalName: values.legalName || undefined,
      taxId:     values.taxId || undefined,
      country:   values.country,
      website:   values.website || undefined,
      industry:  values.industry || undefined,
      segment:   values.segment || undefined,
      notes:     values.notes || undefined,
    })
    await queryClient.invalidateQueries({ queryKey: ['clients'] })
    showCreateDialog.value = false
    toast.success(t('common.create'))
  } catch {
    toast.error(t('errors.loadFailed'))
  } finally {
    isSubmitting.value = false
  }
})

// --- Edit Client Modal ---
const showEditDialog = ref(false)
const editingClient = ref<Client | null>(null)
const isEditSubmitting = ref(false)

const editForm = useForm({
  validationSchema: toTypedSchema(schema),
  initialValues: { name: '', legalName: '', taxId: '', country: 'MX', website: '', industry: '', segment: '', notes: '' }
})

const [editName, editNameAttrs]           = editForm.defineField('name')
const [editLegalName, editLegalNameAttrs] = editForm.defineField('legalName')
const [editTaxId, editTaxIdAttrs]         = editForm.defineField('taxId')
const [editCountry, editCountryAttrs]     = editForm.defineField('country')
const [editWebsite, editWebsiteAttrs]     = editForm.defineField('website')
const [editIndustry, editIndustryAttrs]   = editForm.defineField('industry')
const [editSegment]                       = editForm.defineField('segment')
const [editNotes, editNotesAttrs]         = editForm.defineField('notes')

function openEditDialog(client: Client) {
  editingClient.value = client
  editForm.setValues({
    name:      client.name,
    legalName: client.legalName ?? '',
    taxId:     client.taxId ?? '',
    country:   client.country ?? 'MX',
    website:   client.website ?? '',
    industry:  client.industry ?? '',
    segment:   client.segment ?? '',
    notes:     client.notes ?? '',
  })
  showEditDialog.value = true
}

const onEditSubmit = editForm.handleSubmit(async (values) => {
  if (!editingClient.value) return
  isEditSubmitting.value = true
  try {
    await clientsService.update(editingClient.value.id, {
      name:      values.name,
      legalName: values.legalName || undefined,
      taxId:     values.taxId || undefined,
      country:   values.country,
      website:   values.website || undefined,
      industry:  values.industry || undefined,
      segment:   values.segment || undefined,
      notes:     values.notes || undefined,
    })
    await queryClient.invalidateQueries({ queryKey: ['clients'] })
    showEditDialog.value = false
    toast.success(t('common.save'))
  } catch {
    toast.error(t('errors.loadFailed'))
  } finally {
    isEditSubmitting.value = false
  }
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">{{ t('clientsPage.title') }}</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ t('clientsPage.totalCount', { count: totalRecords }) }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button
          :aria-label="t('common.retry')"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          @click="refetch()"
        />
        <Button :label="t('clientsPage.newClient')" icon="pi pi-plus" @click="openCreateDialog" />
      </div>
    </div>

    <div class="flex flex-wrap gap-3">
      <InputText
        v-model="globalFilter"
        :placeholder="t('clientsPage.searchPlaceholder')"
        class="max-w-md w-full bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] placeholder:text-[var(--text-placeholder)]"
        @input="onSearch"
      />
    </div>

    <section class="min-h-[min(360px,55vh)] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 md:p-4">
      <div
        v-if="isError"
        class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex flex-col gap-2"
      >
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span>{{ t('clientsPage.loadError') }}</span>
          <Button :label="t('common.retry')" size="small" severity="danger" text @click="refetch()" />
        </div>
        <p v-if="queryErrorText" class="text-xs font-mono opacity-90 break-all">{{ queryErrorText }}</p>
      </div>

      <SkeletonTable v-else-if="isPending" :rows="5" :cols="6" />

      <DataTable
        v-else
        :key="appliedFilter"
        :value="filteredClients"
        :loading="isFetching"
        :rows="pageSize"
        paginator
        removable-sort
        striped-rows
        class="rounded-lg overflow-hidden border-0 bg-transparent"
      >
        <Column field="name" :header="t('clientsPage.name')" sortable style="min-width: 180px">
          <template #body="{ data: row }: { data: Client }">
            <span class="font-medium text-[var(--text)]">{{ row.name }}</span>
          </template>
        </Column>

        <Column field="legalName" :header="t('clientsPage.legalName')" style="min-width: 160px">
          <template #body="{ data: row }: { data: Client }">
            <span class="text-[var(--text-muted)] text-sm">{{ row.legalName ?? t('common.none') }}</span>
          </template>
        </Column>

        <Column field="country" :header="t('clientsPage.country')" style="width: 110px">
          <template #body="{ data: row }: { data: Client }">
            <span class="text-[var(--text-muted)] text-sm">{{ row.country ?? t('common.none') }}</span>
          </template>
        </Column>

        <Column field="status" :header="t('clientsPage.status')" style="width: 110px">
          <template #body="{ data: row }: { data: Client }">
            <Tag :severity="statusSeverity(row.status)" :value="row.status ?? 'N/A'" />
          </template>
        </Column>

        <Column field="taxId" :header="t('clientsPage.taxId')" style="width: 130px">
          <template #body="{ data: row }: { data: Client }">
            <span class="text-[var(--text-muted)] text-sm font-mono">{{ row.taxId ?? t('common.none') }}</span>
          </template>
        </Column>

        <Column field="createdAt" :header="t('clientsPage.created')" sortable style="width: 130px">
          <template #body="{ data: row }: { data: Client }">
            <span class="text-[var(--text-muted)] text-sm">{{ formatDate(row.createdAt) }}</span>
          </template>
        </Column>

        <Column :header="t('common.actions')" style="width: 140px">
          <template #body="{ data: row }: { data: Client }">
            <div class="flex gap-1">
              <Button
                icon="pi pi-pencil"
                severity="secondary"
                text
                rounded
                :title="t('common.edit')"
                @click="openEditDialog(row)"
              />
              <Button
                icon="pi pi-eye"
                severity="secondary"
                text
                rounded
                :title="t('nav.clientDetail')"
                @click="router.push('/clients/' + row.id)"
              />
              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                rounded
                :title="t('common.delete')"
                @click="confirmDeleteClient(row)"
              />
            </div>
          </template>
        </Column>

        <template #empty>
          <div class="text-center py-10 text-[var(--text-muted)]">{{ t('clientsPage.noRows') }}</div>
        </template>
      </DataTable>
    </section>
  </div>

  <!-- Create Client Dialog -->
  <AppDialog
    v-model:visible="showCreateDialog"
    :title="t('clientsPage.newClient')"
    subtitle=""
    :loading="isSubmitting"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
      <FormField :label="t('clientsPage.name')" name="name" :error="createForm.errors.value.name" required>
        <InputText
          id="name"
          v-model="nameValue"
          v-bind="nameAttrs"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField :label="t('clientsPage.legalName')" name="legalName" :error="createForm.errors.value.legalName">
        <InputText
          id="legalName"
          v-model="legalNameValue"
          v-bind="legalNameAttrs"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField :label="t('clientsPage.taxId')" name="taxId" :error="createForm.errors.value.taxId">
        <InputText
          id="taxId"
          v-model="taxIdValue"
          v-bind="taxIdAttrs"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField :label="t('clientsPage.country')" name="country" :error="createForm.errors.value.country" required>
        <InputText id="country" v-model="countryValue" v-bind="countryAttrs" class="w-full" :disabled="isSubmitting" />
      </FormField>
      <FormField label="Website" name="website" :error="createForm.errors.value.website">
        <InputText id="website" v-model="websiteValue" v-bind="websiteAttrs" placeholder="https://example.com" class="w-full" :disabled="isSubmitting" />
      </FormField>
      <div class="grid grid-cols-2 gap-3">
        <FormField label="Industry" name="industry">
          <InputText id="industry" v-model="industryValue" v-bind="industryAttrs" placeholder="e.g. Restaurant" class="w-full" :disabled="isSubmitting" />
        </FormField>
        <FormField label="Segment" name="segment">
          <Select v-model="segmentValue" :options="segmentOptions" option-label="label" option-value="value" class="w-full" :disabled="isSubmitting" />
        </FormField>
      </div>
      <FormField label="Notes" name="notes">
        <Textarea v-model="notesValue" v-bind="notesAttrs" placeholder="Internal notes..." :rows="2" class="w-full" :disabled="isSubmitting" />
      </FormField>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          :label="t('common.cancel')"
          severity="secondary"
          outlined
          :disabled="isSubmitting"
          @click="showCreateDialog = false"
        />
        <Button
          :label="t('common.create')"
          :loading="isSubmitting"
          @click="onSubmit"
        />
      </div>
    </template>
  </AppDialog>

  <!-- Edit Client Dialog -->
  <AppDialog
    v-model:visible="showEditDialog"
    :title="t('common.edit')"
    subtitle=""
    :loading="isEditSubmitting"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onEditSubmit">
      <FormField :label="t('clientsPage.name')" name="edit-name" :error="editForm.errors.value.name" required>
        <InputText
          id="edit-name"
          v-model="editName"
          v-bind="editNameAttrs"
          class="w-full"
          :disabled="isEditSubmitting"
        />
      </FormField>

      <FormField :label="t('clientsPage.legalName')" name="edit-legalName" :error="editForm.errors.value.legalName">
        <InputText
          id="edit-legalName"
          v-model="editLegalName"
          v-bind="editLegalNameAttrs"
          class="w-full"
          :disabled="isEditSubmitting"
        />
      </FormField>

      <FormField :label="t('clientsPage.taxId')" name="edit-taxId" :error="editForm.errors.value.taxId">
        <InputText
          id="edit-taxId"
          v-model="editTaxId"
          v-bind="editTaxIdAttrs"
          class="w-full"
          :disabled="isEditSubmitting"
        />
      </FormField>

      <FormField :label="t('clientsPage.country')" name="edit-country" :error="editForm.errors.value.country" required>
        <InputText id="edit-country" v-model="editCountry" v-bind="editCountryAttrs" class="w-full" :disabled="isEditSubmitting" />
      </FormField>
      <FormField label="Website" name="edit-website" :error="editForm.errors.value.website">
        <InputText id="edit-website" v-model="editWebsite" v-bind="editWebsiteAttrs" placeholder="https://example.com" class="w-full" :disabled="isEditSubmitting" />
      </FormField>
      <div class="grid grid-cols-2 gap-3">
        <FormField label="Industry" name="edit-industry">
          <InputText id="edit-industry" v-model="editIndustry" v-bind="editIndustryAttrs" placeholder="e.g. Restaurant" class="w-full" :disabled="isEditSubmitting" />
        </FormField>
        <FormField label="Segment" name="edit-segment">
          <Select v-model="editSegment" :options="segmentOptions" option-label="label" option-value="value" class="w-full" :disabled="isEditSubmitting" />
        </FormField>
      </div>
      <FormField label="Notes" name="edit-notes">
        <Textarea v-model="editNotes" v-bind="editNotesAttrs" placeholder="Internal notes..." :rows="2" class="w-full" :disabled="isEditSubmitting" />
      </FormField>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined :disabled="isEditSubmitting" @click="showEditDialog = false" />
        <Button :label="t('common.save')" :loading="isEditSubmitting" @click="onEditSubmit" />
      </div>
    </template>
  </AppDialog>
</template>
