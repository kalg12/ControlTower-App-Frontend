<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
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
import { clientsService } from '@/services/clients.service'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import type { Client } from '@/types/client'

const router = useRouter()
const queryClient = useQueryClient()
const toast = useToast()

const page = ref(0)
const pageSize = 20
const globalFilter = ref('')

const { data: result, isLoading, refetch } = useQuery({
  queryKey: computed(() => ['clients', page.value]),
  queryFn: () => clientsService.list({ page: page.value, size: pageSize }),
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

function onPage(event: { page: number }) {
  page.value = event.page
}

let searchTimeout: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { page.value = 0; refetch() }, 400)
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

const { handleSubmit, errors, resetForm, defineField } = useForm({
  validationSchema: toTypedSchema(schema),
  initialValues: { name: '', legalName: '', taxId: '', country: 'MX' }
})

const [nameValue, nameAttrs] = defineField('name')
const [legalNameValue, legalNameAttrs] = defineField('legalName')
const [taxIdValue, taxIdAttrs] = defineField('taxId')
const [countryValue, countryAttrs] = defineField('country')

function openCreateDialog() {
  resetForm()
  showCreateDialog.value = true
}

const onSubmit = handleSubmit(async (values) => {
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

    <!-- DataTable -->
    <DataTable
      :value="clients"
      :loading="isLoading"
      :rows="pageSize"
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

      <Column header="Actions" style="width: 80px">
        <template #body="{ data: row }: { data: Client }">
          <Button
            icon="pi pi-eye"
            severity="secondary"
            text
            rounded
            @click="router.push('/clients/' + row.id)"
          />
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
      <FormField label="Name" name="name" :error="errors.name" required>
        <InputText
          id="name"
          v-model="nameValue"
          v-bind="nameAttrs"
          placeholder="Client name"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField label="Legal Name" name="legalName" :error="errors.legalName">
        <InputText
          id="legalName"
          v-model="legalNameValue"
          v-bind="legalNameAttrs"
          placeholder="Legal name (optional)"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField label="Tax ID / RFC" name="taxId" :error="errors.taxId">
        <InputText
          id="taxId"
          v-model="taxIdValue"
          v-bind="taxIdAttrs"
          placeholder="Tax ID / RFC (optional)"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField label="Country" name="country" :error="errors.country" required>
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
</template>
