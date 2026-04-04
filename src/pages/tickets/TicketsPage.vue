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
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Button from 'primevue/button'
import AppDialog from '@/components/ui/AppDialog.vue'
import FormField from '@/components/ui/FormField.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import { ticketsService } from '@/services/tickets.service'
import { clientsService } from '@/services/clients.service'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import type { Ticket, TicketStatus, TicketPriority } from '@/types/ticket'

const router = useRouter()
const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()

function confirmDeleteTicket(ticket: Ticket) {
  confirm.require({
    message: `Delete "${ticket.title}"? This cannot be undone.`,
    header: 'Delete Ticket',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Delete', severity: 'danger' },
    accept: async () => {
      try {
        await ticketsService.delete(ticket.id)
        await queryClient.invalidateQueries({ queryKey: ['tickets'] })
        toast.success('Ticket deleted')
      } catch {
        toast.error('Failed to delete ticket')
      }
    }
  })
}

const page = ref(0)
/** Must stay in sync with DataTable paginator (rows per page). */
const pageSize = ref(20)
const statusFilter = ref<TicketStatus | null>(null)
const priorityFilter = ref<TicketPriority | null>(null)
const globalFilter = ref('')

const { data: clientsData } = useQuery({
  queryKey: ['clients', 'list'],
  queryFn: () => clientsService.list({ page: 0, size: 200 }),
  staleTime: 60000
})
const clientOptions = computed(() =>
  clientsData.value?.content.map(c => ({ label: c.name, value: c.id })) ?? []
)

const { data: result, isLoading, isError, isFetching, refetch } = useQuery({
  queryKey: computed(() => ['tickets', page.value, pageSize.value, statusFilter.value, priorityFilter.value]),
  queryFn: () => ticketsService.list({
    page: page.value,
    size: pageSize.value,
    status: statusFilter.value ?? undefined,
    priority: priorityFilter.value ?? undefined
  }),
  staleTime: 15000
})

const ticketsPage = computed(() => result.value?.content ?? [])
const tickets = computed(() => {
  const q = globalFilter.value.trim().toLowerCase()
  if (!q) return ticketsPage.value
  return ticketsPage.value.filter(
    t =>
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q))
  )
})
const totalRecords = computed(() => result.value?.totalElements ?? 0)

const statuses: { label: string; value: TicketStatus | null }[] = [
  { label: 'All Status', value: null },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Waiting', value: 'WAITING' },
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

const statusOptions = [
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Waiting', value: 'WAITING' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' }
]

function statusSeverity(status: TicketStatus): 'info' | 'warn' | 'success' | 'danger' | 'secondary' {
  const map: Record<TicketStatus, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
    OPEN: 'info',
    IN_PROGRESS: 'warn',
    WAITING: 'warn',
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

function onPage(event: { page: number; rows?: number }) {
  page.value = event.page
  if (event.rows != null && event.rows !== pageSize.value) {
    pageSize.value = event.rows
  }
}

function applyFilters() {
  page.value = 0
  refetch()
}

let searchTimeout: ReturnType<typeof setTimeout>
/** Backend list has no text search; filter the current page in the UI only. */
function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page.value = 0
  }, 400)
}

// --- CSV Export ---
const exporting = ref(false)
async function handleExport() {
  exporting.value = true
  try {
    const blob = await ticketsService.exportCsv({
      status: statusFilter.value ?? undefined,
      priority: priorityFilter.value ?? undefined
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tickets-${dayjs().format('YYYY-MM-DD')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Tickets exported')
  } catch {
    toast.error('Export failed')
  } finally {
    exporting.value = false
  }
}

// --- Create Ticket Modal ---
const showCreateDialog = ref(false)
const isSubmitting = ref(false)

const createSchema = z.object({
  title: z.string().min(3, 'Min 3 characters').max(200),
  description: z.string().min(10, 'Min 10 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  clientId: z.string().optional()
})

const createForm = useForm({
  validationSchema: toTypedSchema(createSchema),
  initialValues: { title: '', description: '', priority: 'MEDIUM', clientId: '' }
})

const [titleValue, titleAttrs] = createForm.defineField('title')
const [descriptionValue, descriptionAttrs] = createForm.defineField('description')
const [priorityValue, priorityAttrs] = createForm.defineField('priority')
const [clientIdValue, clientIdAttrs] = createForm.defineField('clientId')

function openCreateDialog() {
  createForm.resetForm()
  showCreateDialog.value = true
}

const onSubmit = createForm.handleSubmit(async (values) => {
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

// --- Edit Ticket Modal ---
const showEditDialog = ref(false)
const editingTicket = ref<Ticket | null>(null)
const isEditSubmitting = ref(false)

const editSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'])
})

const editForm = useForm({
  validationSchema: toTypedSchema(editSchema),
  initialValues: { status: 'OPEN' as const }
})

const [editStatus, editStatusAttrs] = editForm.defineField('status')

function openEditDialog(ticket: Ticket) {
  editingTicket.value = ticket
  editForm.setValues({
    status: ticket.status
  })
  showEditDialog.value = true
}

const onEditSubmit = editForm.handleSubmit(async (values) => {
  if (!editingTicket.value) return
  isEditSubmitting.value = true
  try {
    await ticketsService.updateStatus(editingTicket.value.id, values.status)
    await queryClient.invalidateQueries({ queryKey: ['tickets'] })
    showEditDialog.value = false
    toast.success('Ticket updated')
  } catch {
    toast.error('Failed to update ticket')
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
        <h2 class="text-lg font-semibold text-[var(--text)]">Support Tickets</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ totalRecords }} total tickets</p>
      </div>
      <div class="flex gap-2">
        <Button
          label="Export CSV"
          icon="pi pi-download"
          severity="secondary"
          outlined
          :loading="exporting"
          @click="handleExport"
        />
        <Button label="New Ticket" icon="pi pi-plus" @click="openCreateDialog" />
      </div>
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

    <!-- Error state -->
    <div v-if="isError" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
      <span>Failed to load tickets. Check your connection or permissions.</span>
      <Button label="Retry" size="small" severity="danger" text @click="refetch()" />
    </div>

    <!-- Skeleton on first load -->
    <SkeletonTable v-if="isLoading && !result" :rows="5" :cols="5" />

    <!-- DataTable -->
    <DataTable
      v-else
      lazy
      :first="page * pageSize"
      :value="tickets"
      :loading="isFetching"
      :rows="pageSize"
      :total-records="totalRecords"
      paginator
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
          <span class="text-[var(--text-muted)] text-sm">{{ row.clientName ?? row.clientId ?? '—' }}</span>
        </template>
      </Column>

      <Column field="createdAt" header="Created" sortable style="width: 130px">
        <template #body="{ data: row }: { data: Ticket }">
          <span class="text-[var(--text-muted)] text-sm">{{ formatDate(row.createdAt) }}</span>
        </template>
      </Column>

      <Column header="Actions" style="width: 140px">
        <template #body="{ data: row }: { data: Ticket }">
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
              @click="router.push('/tickets/' + row.id)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              v-tooltip.top="'Delete'"
              @click="confirmDeleteTicket(row)"
            />
          </div>
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
      <FormField label="Title" name="title" :error="createForm.errors.value.title" required>
        <InputText
          id="title"
          v-model="titleValue"
          v-bind="titleAttrs"
          placeholder="Ticket title"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField label="Description" name="description" :error="createForm.errors.value.description" required>
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

      <FormField label="Priority" name="priority" :error="createForm.errors.value.priority" required>
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

      <FormField label="Client" name="clientId" :error="createForm.errors.value.clientId">
        <Select
          id="clientId"
          v-model="clientIdValue"
          v-bind="clientIdAttrs"
          :options="clientOptions"
          option-label="label"
          option-value="value"
          placeholder="Select client (optional)"
          filter
          show-clear
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

  <!-- Edit Ticket Dialog -->
  <AppDialog
    v-model:visible="showEditDialog"
    title="Edit Ticket"
    subtitle="Update ticket status (backend supports status changes only)."
    :loading="isEditSubmitting"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onEditSubmit">
      <FormField label="Status" name="edit-status" :error="editForm.errors.value.status" required>
        <Select
          id="edit-status"
          v-model="editStatus"
          v-bind="editStatusAttrs"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          placeholder="Select status"
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
