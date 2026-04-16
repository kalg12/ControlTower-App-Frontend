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
import Button from 'primevue/button'
import AppDialog from '@/components/ui/AppDialog.vue'
import FormField from '@/components/ui/FormField.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import PageInfoButton from '@/components/ui/PageInfoButton.vue'
import { tenantsService } from '@/services/tenants.service'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import type { Tenant } from '@/types/tenant'

const { t } = useI18n()
const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()

const page = ref(0)
const pageSize = 20
const globalFilter = ref('')

const { data: result, isLoading, isError, refetch } = useQuery({
  queryKey: computed(() => ['tenants', page.value]),
  queryFn: () => tenantsService.list({ page: page.value, size: pageSize }),
  staleTime: 20000,
})

const tenants = computed(() => result.value?.content ?? [])
const totalRecords = computed(() => result.value?.totalElements ?? 0)

function formatDate(dateStr: string) {
  return dayjs(dateStr).format('DD MMM YYYY')
}

function onPage(event: { page: number }) {
  page.value = event.page
}

// --- Create ---
const showCreateDialog = ref(false)
const isSubmitting = ref(false)

const countryOptions = [
  { label: 'México', value: 'México' },
  { label: 'United States', value: 'United States' },
  { label: 'Otro', value: 'Otro' },
]

const timezoneOptions = [
  { label: 'America/Mexico_City (CDT)', value: 'America/Mexico_City' },
  { label: 'America/Monterrey (CDT)', value: 'America/Monterrey' },
  { label: 'America/Cancun (EST)', value: 'America/Cancun' },
  { label: 'America/Chihuahua (MDT)', value: 'America/Chihuahua' },
  { label: 'America/New_York (EDT)', value: 'America/New_York' },
  { label: 'America/Chicago (CDT)', value: 'America/Chicago' },
  { label: 'America/Denver (MDT)', value: 'America/Denver' },
  { label: 'America/Los_Angeles (PDT)', value: 'America/Los_Angeles' },
]

const currencyOptions = [
  { label: 'MXN — Peso Mexicano', value: 'MXN' },
  { label: 'USD — US Dollar', value: 'USD' },
]

const createSchema = z.object({
  name: z.string().min(2, t('tenants.nameMin')),
  slug: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  currency: z.string().optional(),
})

const createForm = useForm({
  validationSchema: toTypedSchema(createSchema),
  initialValues: { name: '', slug: '', country: 'México', timezone: 'America/Mexico_City', currency: 'MXN' },
})

const [cName, cNameAttrs] = createForm.defineField('name')
const [cSlug, cSlugAttrs] = createForm.defineField('slug')
const [cCountry] = createForm.defineField('country')
const [cTimezone] = createForm.defineField('timezone')
const [cCurrency] = createForm.defineField('currency')

function openCreateDialog() {
  createForm.resetForm()
  showCreateDialog.value = true
}

const onCreateSubmit = createForm.handleSubmit(async (values) => {
  isSubmitting.value = true
  try {
    await tenantsService.create({ name: values.name, slug: values.slug || undefined, country: values.country, timezone: values.timezone, currency: values.currency })
    await queryClient.invalidateQueries({ queryKey: ['tenants'] })
    showCreateDialog.value = false
    toast.success(t('tenants.createSuccess'))
  } catch {
    toast.error(t('tenants.createFailed'))
  } finally {
    isSubmitting.value = false
  }
})

// --- Edit ---
const showEditDialog = ref(false)
const editingTenant = ref<Tenant | null>(null)
const isEditSubmitting = ref(false)

const editForm = useForm({
  validationSchema: toTypedSchema(createSchema),
  initialValues: { name: '', slug: '', country: 'México', timezone: 'America/Mexico_City', currency: 'MXN' },
})

const [eName, eNameAttrs] = editForm.defineField('name')
const [eSlug, eSlugAttrs] = editForm.defineField('slug')
const [eCountry] = editForm.defineField('country')
const [eTimezone] = editForm.defineField('timezone')
const [eCurrency] = editForm.defineField('currency')

function openEditDialog(tenant: Tenant) {
  editingTenant.value = tenant
  editForm.setValues({ name: tenant.name, slug: tenant.slug ?? '', country: tenant.country ?? 'México', timezone: tenant.timezone ?? 'America/Mexico_City', currency: tenant.currency ?? 'MXN' })
  showEditDialog.value = true
}

const onEditSubmit = editForm.handleSubmit(async (values) => {
  if (!editingTenant.value) return
  isEditSubmitting.value = true
  try {
    await tenantsService.update(editingTenant.value.id, { name: values.name, slug: values.slug || undefined, country: values.country, timezone: values.timezone, currency: values.currency })
    await queryClient.invalidateQueries({ queryKey: ['tenants'] })
    showEditDialog.value = false
    toast.success(t('tenants.updateSuccess'))
  } catch {
    toast.error(t('tenants.updateFailed'))
  } finally {
    isEditSubmitting.value = false
  }
})

function confirmDelete(tenant: Tenant) {
  confirm.require({
    message: t('tenants.deleteConfirm', { name: tenant.name }),
    header: t('tenants.deleteTitle'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: async () => {
      try {
        await tenantsService.delete(tenant.id)
        await queryClient.invalidateQueries({ queryKey: ['tenants'] })
        toast.success(t('tenants.deleteSuccess'))
      } catch {
        toast.error(t('tenants.deleteFailed'))
      }
    }
  })
}

function confirmSuspend(tenant: Tenant) {
  const action = tenant.status === 'SUSPENDED' ? 'reactivate' : 'suspend'
  confirm.require({
    message: action === 'suspend' ? t('tenants.suspendConfirm', { name: tenant.name }) : t('tenants.reactivateConfirm', { name: tenant.name }),
    header: action === 'suspend' ? t('tenants.suspendTitle') : t('tenants.reactivateTitle'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: action === 'suspend' ? t('common.suspend') : t('common.reactivate'), severity: action === 'suspend' ? 'warn' : 'success' },
    accept: async () => {
      try {
        if (action === 'suspend') {
          await tenantsService.suspend(tenant.id)
          toast.success(t('tenants.suspendSuccess'))
        } else {
          await tenantsService.reactivate(tenant.id)
          toast.success(t('tenants.reactivateSuccess'))
        }
        await queryClient.invalidateQueries({ queryKey: ['tenants'] })
      } catch {
        toast.error(action === 'suspend' ? t('tenants.suspendFailed') : t('tenants.reactivateFailed'))
      }
    }
  })
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex items-center gap-2">
        <div>
          <h2 class="text-lg font-semibold text-[var(--text)]">{{ t('tenants.title') }}</h2>
          <p class="text-sm text-[var(--text-muted)]">{{ t('tenants.totalCount', { count: totalRecords }) }}</p>
        </div>
        <PageInfoButton :title="t('tenants.title')" :description="t('pageInfo.tenants')" />
      </div>
      <div class="flex flex-wrap gap-2">
        <Button icon="pi pi-refresh" severity="secondary" outlined @click="refetch()" />
        <Button :label="t('tenants.newTenant')" icon="pi pi-plus" @click="openCreateDialog" />
      </div>
    </div>

    <InputText v-model="globalFilter" :placeholder="t('tenants.searchPlaceholder')" class="max-w-md w-full" />

    <div v-if="isError" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
      <span>{{ t('tenants.loadFailed') }}</span>
      <Button :label="t('common.retry')" size="small" severity="danger" text @click="refetch()" />
    </div>

    <SkeletonTable v-else-if="isLoading" :rows="5" :cols="5" />

    <DataTable v-else lazy :first="page * pageSize" :value="tenants" :loading="isLoading" :rows="pageSize" :total-records="totalRecords" paginator paginator-template="PrevPageLink PageLinks NextPageLink" striped-rows class="rounded-xl overflow-hidden" @page="onPage">
      <Column field="name" :header="t('tenants.name')" sortable style="min-width: 180px">
        <template #body="{ data: row }: { data: Tenant }">
          <span class="font-medium text-[var(--text)]">{{ row.name }}</span>
        </template>
      </Column>
      <Column field="slug" :header="t('tenants.slug')" style="min-width: 140px">
        <template #body="{ data: row }: { data: Tenant }">
          <span class="text-[var(--text-muted)] text-sm font-mono">{{ row.slug ?? '—' }}</span>
        </template>
      </Column>
      <Column field="status" :header="t('tenants.status')" style="width: 120px">
        <template #body="{ data: row }: { data: Tenant }">
          <Tag :severity="row.status === 'ACTIVE' ? 'success' : row.status === 'SUSPENDED' ? 'danger' : 'warn'" :value="row.status" />
        </template>
      </Column>
      <Column field="createdAt" :header="t('tenants.createdAt')" sortable style="width: 130px">
        <template #body="{ data: row }: { data: Tenant }">
          <span class="text-[var(--text-muted)] text-sm">{{ formatDate(row.createdAt) }}</span>
        </template>
      </Column>
      <Column :header="t('common.actions')" style="width: 130px">
        <template #body="{ data: row }: { data: Tenant }">
          <div class="flex gap-1">
            <Button icon="pi pi-pencil" severity="secondary" text rounded size="small" v-tooltip.top="t('common.edit')" @click="openEditDialog(row)" />
            <Button :icon="row.status === 'SUSPENDED' ? 'pi pi-play' : 'pi pi-pause'" :severity="row.status === 'SUSPENDED' ? 'success' : 'warn'" text rounded size="small" v-tooltip.top="row.status === 'SUSPENDED' ? t('common.reactivate') : t('common.suspend')" @click="confirmSuspend(row)" />
            <Button icon="pi pi-trash" severity="danger" text rounded size="small" v-tooltip.top="t('common.delete')" @click="confirmDelete(row)" />
          </div>
        </template>
      </Column>
      <template #empty>
        <div class="text-center py-10 text-[var(--text-muted)]">{{ t('tenants.noRows') }}</div>
      </template>
    </DataTable>
  </div>

  <!-- Create Dialog -->
  <AppDialog v-model:visible="showCreateDialog" :title="t('tenants.createTitle')" :subtitle="t('tenants.createSubtitle')" :loading="isSubmitting">
    <form class="flex flex-col gap-4" @submit.prevent="onCreateSubmit">
      <FormField :label="t('tenants.formName')" name="c-name" :error="createForm.errors.value.name" required>
        <InputText v-model="cName" v-bind="cNameAttrs" :placeholder="t('tenants.formNamePlaceholder')" class="w-full" :disabled="isSubmitting" />
      </FormField>
      <FormField :label="t('tenants.formSlug')" name="c-slug" :error="createForm.errors.value.slug">
        <InputText v-model="cSlug" v-bind="cSlugAttrs" :placeholder="t('tenants.formSlugPlaceholder')" class="w-full" :disabled="isSubmitting" />
      </FormField>
      <div class="grid grid-cols-2 gap-4">
        <FormField :label="t('tenants.formCountry')" name="c-country">
          <Select v-model="cCountry" :options="countryOptions" option-label="label" option-value="value" class="w-full" :disabled="isSubmitting" />
        </FormField>
        <FormField :label="t('tenants.formCurrency')" name="c-currency">
          <Select v-model="cCurrency" :options="currencyOptions" option-label="label" option-value="value" class="w-full" :disabled="isSubmitting" />
        </FormField>
      </div>
      <FormField :label="t('tenants.formTimezone')" name="c-timezone">
        <Select v-model="cTimezone" :options="timezoneOptions" option-label="label" option-value="value" class="w-full" :disabled="isSubmitting" />
      </FormField>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined :disabled="isSubmitting" @click="showCreateDialog = false" />
        <Button :label="t('common.create')" :loading="isSubmitting" @click="onCreateSubmit" />
      </div>
    </template>
  </AppDialog>

  <!-- Edit Dialog -->
  <AppDialog v-model:visible="showEditDialog" :title="t('tenants.editTitle')" :subtitle="t('tenants.editSubtitle')" :loading="isEditSubmitting">
    <form class="flex flex-col gap-4" @submit.prevent="onEditSubmit">
      <FormField :label="t('tenants.formName')" name="e-name" :error="editForm.errors.value.name" required>
        <InputText v-model="eName" v-bind="eNameAttrs" class="w-full" :disabled="isEditSubmitting" />
      </FormField>
      <FormField :label="t('tenants.formSlug')" name="e-slug" :error="editForm.errors.value.slug">
        <InputText v-model="eSlug" v-bind="eSlugAttrs" class="w-full" :disabled="isEditSubmitting" />
      </FormField>
      <div class="grid grid-cols-2 gap-4">
        <FormField :label="t('tenants.formCountry')" name="e-country">
          <Select v-model="eCountry" :options="countryOptions" option-label="label" option-value="value" class="w-full" :disabled="isEditSubmitting" />
        </FormField>
        <FormField :label="t('tenants.formCurrency')" name="e-currency">
          <Select v-model="eCurrency" :options="currencyOptions" option-label="label" option-value="value" class="w-full" :disabled="isEditSubmitting" />
        </FormField>
      </div>
      <FormField :label="t('tenants.formTimezone')" name="e-timezone">
        <Select v-model="eTimezone" :options="timezoneOptions" option-label="label" option-value="value" class="w-full" :disabled="isEditSubmitting" />
      </FormField>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined :disabled="isEditSubmitting" @click="showEditDialog = false" />
        <Button :label="t('tenants.saveChanges')" :loading="isEditSubmitting" @click="onEditSubmit" />
      </div>
    </template>
  </AppDialog>
</template>
