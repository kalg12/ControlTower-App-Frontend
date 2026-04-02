<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import AppDialog from '@/components/ui/AppDialog.vue'
import FormField from '@/components/ui/FormField.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import { clientsService } from '@/services/clients.service'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import type { Client } from '@/types/client'

const router = useRouter()
const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()

function confirmDeleteClient(client: Client) {
  confirm.require({
    message: `Delete "${client.name}"? This cannot be undone.`,
    header: 'Delete Client',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Delete', severity: 'danger' },
    accept: async () => {
      try {
        await clientsService.delete(client.id)
        await queryClient.invalidateQueries({ queryKey: ['clients'] })
        toast.success('Client deleted')
      } catch {
        toast.error('Failed to delete client')
      }
    }
  })
}

const page = ref(0)
const pageSize = 20
const globalFilter = ref('')
const appliedFilter = ref('')

let searchTimeout: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    appliedFilter.value = globalFilter.value
    page.value = 0
  }, 400)
}

const { data: result, isLoading, isError, refetch } = useQuery({
  queryKey: computed(() => ['clients', page.value, appliedFilter.value]),
  queryFn: () => clientsService.list({ page: page.value, size: pageSize, search: appliedFilter.value || undefined }),
  staleTime: 15000
})

const clients = computed(() => result.value?.content ?? [])
const totalRecords = computed(() => result.value?.totalElements ?? 0)

function statusSeverity(status?: string): 'success' | 'warn' | 'danger' | 'secondary' {
  if (!status) return 'secondary'
  if (status === 'ACTIVE') return 'success'
  if (status === 'INACTIVE') return 'secondary'
  if (status === 'SUSPENDED') return 'danger'
  return 'secondary'
}

function formatDate(dateStr: string) {
  return dayjs(dateStr).format('DD MMM YYYY')
}

function onPage(event: { page: number; first: number }) {
  page.value = event.page
}

// --- Create Client Modal ---
const showCreateDialog = ref(false)
const isSubmitting = ref(false)

const schema = z.object({
  name: z.string().min(2, 'Min 2 characters'),
  legalName: z.string().optional(),
  taxId: z.string().optional(),
  country: z.string().min(2, 'Country code (e.g. MX)').default('MX')
})

const createForm = useForm({
  validationSchema: toTypedSchema(schema),
  initialValues: { name: '', legalName: '', taxId: '', country: 'MX' }
})

const [nameValue, nameAttrs] = createForm.defineField('name')
const [legalNameValue, legalNameAttrs] = createForm.defineField('legalName')
const [taxIdValue, taxIdAttrs] = createForm.defineField('taxId')
const [countryValue, countryAttrs] = createForm.defineField('country')

function openCreateDialog() {
  createForm.resetForm()
  showCreateDialog.value = true
}

const onSubmit = createForm.handleSubmit(async (values) => {
  isSubmitting.value = true
  try {
    await clientsService.create({
      name: values.name,
      legalName: values.legalName || undefined,
      taxId: values.taxId || undefined,
      country: values.country
    })
    await queryClient.invalidateQueries({ queryKey: ['clients'] })
    showCreateDialog.value = false
    toast.success('Client created successfully')
  } catch {
    toast.error('Failed to create client')
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
  initialValues: { name: '', legalName: '', taxId: '', country: 'MX' }
})

const [editName, editNameAttrs] = editForm.defineField('name')
const [editLegalName, editLegalNameAttrs] = editForm.defineField('legalName')
const [editTaxId, editTaxIdAttrs] = editForm.defineField('taxId')
const [editCountry, editCountryAttrs] = editForm.defineField('country')

function openEditDialog(client: Client) {
  editingClient.value = client
  editForm.setValues({
    name: client.name,
    legalName: client.legalName ?? '',
    taxId: client.taxId ?? '',
    country: client.country ?? 'MX'
  })
  showEditDialog.value = true
}

const onEditSubmit = editForm.handleSubmit(async (values) => {
  if (!editingClient.value) return
  isEditSubmitting.value = true
  try {
    await clientsService.update(editingClient.value.id, {
      name: values.name,
      legalName: values.legalName || undefined,
      taxId: values.taxId || undefined,
      country: values.country
    })
    await queryClient.invalidateQueries({ queryKey: ['clients'] })
    showEditDialog.value = false
    toast.success('Client updated')
  } catch {
    toast.error('Failed to update client')
  } finally {
    isEditSubmitting.value = false
  }
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">Clients</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ totalRecords }} total clients</p>
      </div>
      <div class="flex gap-2">
        <Button icon="pi pi-refresh" severity="secondary" outlined @click="refetch()" />
        <Button label="New Client" icon="pi pi-plus" @click="openCreateDialog" />
      </div>
    </div>

    <!-- Search -->
    <div class="flex gap-3">
      <InputText
        v-model="globalFilter"
        placeholder="Search clients..."
        class="max-w-md"
        @input="onSearch"
      />
    </div>

    <!-- Error state -->
    <div v-if="isError && !isLoading" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
      <span>Failed to load clients. Check your connection or permissions.</span>
      <Button label="Retry" size="small" severity="danger" text @click="refetch()" />
    </div>

    <!-- Skeleton on first load -->
    <SkeletonTable v-if="isLoading && !result" :rows="5" :cols="6" />

    <!-- DataTable -->
    <DataTable
      v-else
      :value="clients"
      :loading="isLoading"
      :rows="pageSize"
      :first="page * pageSize"
      :total-records="totalRecords"
      paginator
      lazy
      removable-sort
      striped-rows
      class="rounded-xl overflow-hidden"
      @page="onPage"
    >
      <Column field="name" header="Name" sortable style="min-width: 180px">
        <template #body="{ data: row }: { data: Client }">
          <span class="font-medium text-[var(--text)]">{{ row.name }}</span>
        </template>
      </Column>

      <Column field="legalName" header="Legal Name" style="min-width: 160px">
        <template #body="{ data: row }: { data: Client }">
          <span class="text-[var(--text-muted)] text-sm">{{ row.legalName ?? '—' }}</span>
        </template>
      </Column>

      <Column field="country" header="Country" style="width: 110px">
        <template #body="{ data: row }: { data: Client }">
          <span class="text-[var(--text-muted)] text-sm">{{ row.country ?? '—' }}</span>
        </template>
      </Column>

      <Column field="status" header="Status" style="width: 110px">
        <template #body="{ data: row }: { data: Client }">
          <Tag :severity="statusSeverity(row.status)" :value="row.status ?? 'N/A'" />
        </template>
      </Column>

      <Column field="taxId" header="Tax ID" style="width: 130px">
        <template #body="{ data: row }: { data: Client }">
          <span class="text-[var(--text-muted)] text-sm font-mono">{{ row.taxId ?? '—' }}</span>
        </template>
      </Column>

      <Column field="createdAt" header="Created" sortable style="width: 130px">
        <template #body="{ data: row }: { data: Client }">
          <span class="text-[var(--text-muted)] text-sm">{{ formatDate(row.createdAt) }}</span>
        </template>
      </Column>

      <Column header="Actions" style="width: 140px">
        <template #body="{ data: row }: { data: Client }">
          <div class="flex gap-1">
            <Button
              icon="pi pi-pencil"
              severity="secondary"
              text
              rounded
              v-tooltip.top="'Edit'"
              @click="openEditDialog(row)"
            />
            <Button
              icon="pi pi-eye"
              severity="secondary"
              text
              rounded
              v-tooltip.top="'View detail'"
              @click="router.push('/clients/' + row.id)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              v-tooltip.top="'Delete'"
              @click="confirmDeleteClient(row)"
            />
          </div>
        </template>
      </Column>

      <template #empty>
        <div class="text-center py-8 text-[var(--text-muted)]">No clients found</div>
      </template>
    </DataTable>
  </div>

  <!-- Create Client Dialog -->
  <AppDialog
    v-model:visible="showCreateDialog"
    title="New Client"
    subtitle="Fill in the details to create a new client."
    :loading="isSubmitting"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
      <FormField label="Name" name="name" :error="createForm.errors.value.name" required>
        <InputText
          id="name"
          v-model="nameValue"
          v-bind="nameAttrs"
          placeholder="Client name"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField label="Legal Name" name="legalName" :error="createForm.errors.value.legalName">
        <InputText
          id="legalName"
          v-model="legalNameValue"
          v-bind="legalNameAttrs"
          placeholder="Legal name (optional)"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField label="Tax ID / RFC" name="taxId" :error="createForm.errors.value.taxId">
        <InputText
          id="taxId"
          v-model="taxIdValue"
          v-bind="taxIdAttrs"
          placeholder="Tax ID / RFC (optional)"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField label="Country" name="country" :error="createForm.errors.value.country" required>
        <InputText
          id="country"
          v-model="countryValue"
          v-bind="countryAttrs"
          placeholder="e.g. MX"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          :disabled="isSubmitting"
          @click="showCreateDialog = false"
        />
        <Button
          label="Create Client"
          :loading="isSubmitting"
          @click="onSubmit"
        />
      </div>
    </template>
  </AppDialog>

  <!-- Edit Client Dialog -->
  <AppDialog
    v-model:visible="showEditDialog"
    title="Edit Client"
    subtitle="Update client information."
    :loading="isEditSubmitting"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onEditSubmit">
      <FormField label="Name" name="edit-name" :error="editForm.errors.value.name" required>
        <InputText
          id="edit-name"
          v-model="editName"
          v-bind="editNameAttrs"
          placeholder="Client name"
          class="w-full"
          :disabled="isEditSubmitting"
        />
      </FormField>

      <FormField label="Legal Name" name="edit-legalName" :error="editForm.errors.value.legalName">
        <InputText
          id="edit-legalName"
          v-model="editLegalName"
          v-bind="editLegalNameAttrs"
          placeholder="Legal name (optional)"
          class="w-full"
          :disabled="isEditSubmitting"
        />
      </FormField>

      <FormField label="Tax ID / RFC" name="edit-taxId" :error="editForm.errors.value.taxId">
        <InputText
          id="edit-taxId"
          v-model="editTaxId"
          v-bind="editTaxIdAttrs"
          placeholder="Tax ID / RFC (optional)"
          class="w-full"
          :disabled="isEditSubmitting"
        />
      </FormField>

      <FormField label="Country" name="edit-country" :error="editForm.errors.value.country" required>
        <InputText
          id="edit-country"
          v-model="editCountry"
          v-bind="editCountryAttrs"
          placeholder="e.g. MX"
          class="w-full"
          :disabled="isEditSubmitting"
        />
      </FormField>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          :disabled="isEditSubmitting"
          @click="showEditDialog = false"
        />
        <Button
          label="Save Changes"
          :loading="isEditSubmitting"
          @click="onEditSubmit"
        />
      </div>
    </template>
  </AppDialog>
</template>
