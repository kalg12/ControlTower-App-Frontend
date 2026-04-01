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
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Button from 'primevue/button'
import AppDialog from '@/components/ui/AppDialog.vue'
import FormField from '@/components/ui/FormField.vue'
import { ticketsService } from '@/services/tickets.service'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import type { Ticket, TicketStatus, TicketPriority } from '@/types/ticket'

const router = useRouter()
const queryClient = useQueryClient()
const toast = useToast()

const page = ref(0)
const pageSize = 20
const statusFilter = ref<TicketStatus | null>(null)
const priorityFilter = ref<TicketPriority | null>(null)
const globalFilter = ref('')

const { data: result, isLoading, refetch } = useQuery({
  queryKey: computed(() => ['tickets', page.value, statusFilter.value, priorityFilter.value]),
  queryFn: () => ticketsService.list({
    page: page.value,
    size: pageSize,
    status: statusFilter.value ?? undefined,
    priority: priorityFilter.value ?? undefined,
    search: globalFilter.value || undefined
  }),
  staleTime: 15000
})

const tickets = computed(() => result.value?.content ?? [])
const totalRecords = computed(() => result.value?.totalElements ?? 0)

const statuses: { label: string; value: TicketStatus | null }[] = [
  { label: 'All Status', value: null },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Pending Customer', value: 'PENDING_CUSTOMER' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' }
]

const priorities: { label: string; value: TicketPriority | null }[] = [
  { label: 'All Priority', value: null },
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Critical', value: 'CRITICAL' }
]

const priorityOptions = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Critical', value: 'CRITICAL' }
]

function statusSeverity(status: TicketStatus): 'info' | 'warn' | 'success' | 'danger' | 'secondary' {
  const map: Record<TicketStatus, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
    OPEN: 'info',
    IN_PROGRESS: 'warn',
    PENDING_CUSTOMER: 'warn',
    RESOLVED: 'success',
    CLOSED: 'secondary'
  }
  return map[status] ?? 'secondary'
}

function prioritySeverity(priority: TicketPriority): 'info' | 'warn' | 'success' | 'danger' | 'secondary' {
  const map: Record<TicketPriority, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
    LOW: 'secondary',
    MEDIUM: 'warn',
    HIGH: 'danger',
    CRITICAL: 'danger'
  }
  return map[priority] ?? 'secondary'
}

function formatDate(dateStr: string) {
  return dayjs(dateStr).format('DD MMM YYYY')
}

function onPage(event: { page: number }) {
  page.value = event.page
}

function applyFilters() {
  page.value = 0
  refetch()
}

let searchTimeout: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { page.value = 0; refetch() }, 400)
}

// --- Create Ticket Modal ---
const showCreateDialog = ref(false)
const isSubmitting = ref(false)

const schema = z.object({
  title: z.string().min(3, 'Min 3 characters').max(200),
  description: z.string().min(10, 'Min 10 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  clientId: z.string().optional()
})

const { handleSubmit, errors, resetForm, defineField } = useForm({
  validationSchema: toTypedSchema(schema),
  initialValues: { title: '', description: '', priority: 'MEDIUM', clientId: '' }
})

const [titleValue, titleAttrs] = defineField('title')
const [descriptionValue, descriptionAttrs] = defineField('description')
const [priorityValue, priorityAttrs] = defineField('priority')
const [clientIdValue, clientIdAttrs] = defineField('clientId')

function openCreateDialog() {
  resetForm()
  showCreateDialog.value = true
}

const onSubmit = handleSubmit(async (values) => {
  isSubmitting.value = true
  try {
    await ticketsService.create({
      title: values.title,
      description: values.description,
      priority: values.priority,
      clientId: values.clientId || undefined
    })
    await queryClient.invalidateQueries({ queryKey: ['tickets'] })
    showCreateDialog.value = false
    toast.success('Ticket created successfully')
  } catch {
    toast.error('Failed to create ticket')
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
        <h2 class="text-lg font-semibold text-[var(--text)]">Support Tickets</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ totalRecords }} total tickets</p>
      </div>
      <Button label="New Ticket" icon="pi pi-plus" @click="openCreateDialog" />
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3">
      <InputText
        v-model="globalFilter"
        placeholder="Search tickets..."
        class="flex-1"
        @input="onSearch"
      />
      <Select
        v-model="statusFilter"
        :options="statuses"
        option-label="label"
        option-value="value"
        placeholder="All Status"
        class="w-48"
        @change="applyFilters"
      />
      <Select
        v-model="priorityFilter"
        :options="priorities"
        option-label="label"
        option-value="value"
        placeholder="All Priority"
        class="w-44"
        @change="applyFilters"
      />
      <Button icon="pi pi-refresh" severity="secondary" outlined @click="refetch()" />
    </div>

    <!-- DataTable -->
    <DataTable
      :value="tickets"
      :loading="isLoading"
      :rows="pageSize"
      :total-records="totalRecords"
      paginator
      lazy
      :paginator-template="'PrevPageLink PageLinks NextPageLink RowsPerPageDropdown'"
      :rows-per-page-options="[10, 20, 50]"
      removable-sort
      striped-rows
      class="rounded-xl overflow-hidden"
      @page="onPage"
    >
      <Column field="title" header="Title" sortable style="min-width: 240px">
        <template #body="{ data: row }: { data: Ticket }">
          <span class="font-medium text-[var(--text)] line-clamp-1">{{ row.title }}</span>
        </template>
      </Column>

      <Column field="status" header="Status" style="width: 150px">
        <template #body="{ data: row }: { data: Ticket }">
          <Tag :severity="statusSeverity(row.status)" :value="row.status.replace('_', ' ')" />
        </template>
      </Column>

      <Column field="priority" header="Priority" style="width: 110px">
        <template #body="{ data: row }: { data: Ticket }">
          <Tag :severity="prioritySeverity(row.priority)" :value="row.priority" />
        </template>
      </Column>

      <Column field="clientId" header="Client" style="min-width: 140px">
        <template #body="{ data: row }: { data: Ticket }">
          <span class="text-[var(--text-muted)] text-sm">{{ row.clientId ?? '—' }}</span>
        </template>
      </Column>

      <Column field="branchId" header="Branch" style="width: 130px">
        <template #body="{ data: row }: { data: Ticket }">
          <span class="text-[var(--text-muted)] text-sm">{{ (row as any).branchId ?? '—' }}</span>
        </template>
      </Column>

      <Column field="createdAt" header="Created" sortable style="width: 130px">
        <template #body="{ data: row }: { data: Ticket }">
          <span class="text-[var(--text-muted)] text-sm">{{ formatDate(row.createdAt) }}</span>
        </template>
      </Column>

      <Column header="Actions" style="width: 80px">
        <template #body="{ data: row }: { data: Ticket }">
          <Button
            icon="pi pi-eye"
            severity="secondary"
            text
            rounded
            @click="router.push('/tickets/' + row.id)"
          />
        </template>
      </Column>

      <template #empty>
        <div class="text-center py-8 text-[var(--text-muted)]">No tickets found</div>
      </template>
    </DataTable>
  </div>

  <!-- Create Ticket Dialog -->
  <AppDialog
    v-model:visible="showCreateDialog"
    title="New Ticket"
    subtitle="Fill in the details to create a new support ticket."
    :loading="isSubmitting"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
      <FormField label="Title" name="title" :error="errors.title" required>
        <InputText
          id="title"
          v-model="titleValue"
          v-bind="titleAttrs"
          placeholder="Ticket title"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField label="Description" name="description" :error="errors.description" required>
        <Textarea
          id="description"
          v-model="descriptionValue"
          v-bind="descriptionAttrs"
          placeholder="Describe the issue..."
          :rows="3"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField label="Priority" name="priority" :error="errors.priority" required>
        <Select
          id="priority"
          v-model="priorityValue"
          v-bind="priorityAttrs"
          :options="priorityOptions"
          option-label="label"
          option-value="value"
          placeholder="Select priority"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField label="Client ID" name="clientId" :error="errors.clientId">
        <InputText
          id="clientId"
          v-model="clientIdValue"
          v-bind="clientIdAttrs"
          placeholder="Client UUID (optional)"
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
          label="Create Ticket"
          :loading="isSubmitting"
          @click="onSubmit"
        />
      </div>
    </template>
  </AppDialog>
</template>
