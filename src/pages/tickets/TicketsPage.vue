<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
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
import type { Ticket, TicketStatus, TicketPriority, TicketSource } from '@/types/ticket'
import SourceBadge from '@/components/tickets/SourceBadge.vue'

const { t } = useI18n()
const router = useRouter()
const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()

function confirmDeleteTicket(ticket: Ticket) {
  confirm.require({
    message: t('tickets.deleteConfirm', { title: ticket.title }),
    header: t('tickets.deleteHeader'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: async () => {
      try {
        await ticketsService.delete(ticket.id)
        await queryClient.invalidateQueries({ queryKey: ['tickets'] })
        toast.success(t('tickets.deleteSuccess'))
      } catch {
        toast.error(t('tickets.deleteFailed'))
      }
    }
  })
}

const page = ref(0)
/** Must stay in sync with DataTable paginator (rows per page). */
const pageSize = ref(20)
const statusFilter = ref<TicketStatus | null>(null)
const priorityFilter = ref<TicketPriority | null>(null)
const sourceFilter = ref<TicketSource | null>(null)
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
  queryKey: computed(() => ['tickets', page.value, pageSize.value, statusFilter.value, priorityFilter.value, sourceFilter.value]),
  queryFn: () => ticketsService.list({
    page: page.value,
    size: pageSize.value,
    status: statusFilter.value ?? undefined,
    priority: priorityFilter.value ?? undefined,
    source: sourceFilter.value ?? undefined
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

const statusOptionsFilter = computed(() => [
  { label: t('tickets.allStatus'), value: null as TicketStatus | null },
  { label: t('tickets.statusOpen'), value: 'OPEN' as TicketStatus },
  { label: t('tickets.statusInProgress'), value: 'IN_PROGRESS' as TicketStatus },
  { label: t('tickets.statusWaiting'), value: 'WAITING' as TicketStatus },
  { label: t('tickets.statusResolved'), value: 'RESOLVED' as TicketStatus },
  { label: t('tickets.statusClosed'), value: 'CLOSED' as TicketStatus }
])

const priorityOptionsFilter = computed(() => [
  { label: t('tickets.allPriority'), value: null as TicketPriority | null },
  { label: t('tickets.priorityLow'), value: 'LOW' as TicketPriority },
  { label: t('tickets.priorityMedium'), value: 'MEDIUM' as TicketPriority },
  { label: t('tickets.priorityHigh'), value: 'HIGH' as TicketPriority },
  { label: t('tickets.priorityCritical'), value: 'CRITICAL' as TicketPriority }
])

const sourceOptionsFilter = computed(() => [
  { label: t('tickets.allSources'), value: null as TicketSource | null },
  { label: t('tickets.sourcePos'), value: 'POS' as TicketSource },
  { label: t('tickets.sourceManual'), value: 'MANUAL' as TicketSource },
  { label: t('tickets.sourceHealthAlert'), value: 'HEALTH_ALERT' as TicketSource },
  { label: t('tickets.sourceWebhook'), value: 'WEBHOOK' as TicketSource },
  { label: t('tickets.sourceEmail'), value: 'EMAIL' as TicketSource }
])

const formPriorityOptions = computed(() => [
  { label: t('tickets.priorityLow'), value: 'LOW' as const },
  { label: t('tickets.priorityMedium'), value: 'MEDIUM' as const },
  { label: t('tickets.priorityHigh'), value: 'HIGH' as const },
  { label: t('tickets.priorityCritical'), value: 'CRITICAL' as const }
])

const formStatusOptions = computed(() => [
  { label: t('tickets.statusOpen'), value: 'OPEN' as const },
  { label: t('tickets.statusInProgress'), value: 'IN_PROGRESS' as const },
  { label: t('tickets.statusWaiting'), value: 'WAITING' as const },
  { label: t('tickets.statusResolved'), value: 'RESOLVED' as const },
  { label: t('tickets.statusClosed'), value: 'CLOSED' as const }
])

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
    toast.success(t('tickets.exportSuccess'))
  } catch {
    toast.error(t('tickets.exportFailed'))
  } finally {
    exporting.value = false
  }
}

// --- Create Ticket Modal ---
const showCreateDialog = ref(false)
const isSubmitting = ref(false)

const createSchema = z.object({
  title: z.string().min(3, 'Min 3 characters').max(200),
  description: z.string().min(10, 'Min 10 characters')
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
    toast.success(t('tickets.createSuccess'))
  } catch {
    toast.error(t('tickets.createFailed'))
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
    toast.success(t('tickets.updateSuccess'))
  } catch {
    toast.error(t('tickets.updateFailed'))
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
        <h2 class="text-lg font-semibold text-[var(--text)]">{{ t('tickets.title') }}</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ totalRecords }} {{ t('tickets.totalCount') }}</p>
      </div>
      <div class="flex gap-2">
        <Button
          :label="t('tickets.exportCsv')"
          icon="pi pi-download"
          severity="secondary"
          outlined
          :loading="exporting"
          @click="handleExport"
        />
        <Button :label="t('tickets.newTicket')" icon="pi pi-plus" @click="openCreateDialog" />
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3">
      <InputText
        v-model="globalFilter"
        :placeholder="t('tickets.searchPlaceholder')"
        class="flex-1"
        @input="onSearch"
      />
      <Select
        v-model="statusFilter"
        :options="statusOptionsFilter"
        option-label="label"
        option-value="value"
        :placeholder="t('tickets.allStatus')"
        class="w-48"
        @change="applyFilters"
      />
      <Select
        v-model="priorityFilter"
        :options="priorityOptionsFilter"
        option-label="label"
        option-value="value"
        :placeholder="t('tickets.allPriority')"
        class="w-44"
        @change="applyFilters"
      />
      <Select
        v-model="sourceFilter"
        :options="sourceOptionsFilter"
        option-label="label"
        option-value="value"
        :placeholder="t('tickets.allSources')"
        class="w-44"
        @change="applyFilters"
      />
      <Button icon="pi pi-refresh" severity="secondary" outlined @click="refetch()" />
    </div>

    <!-- Error state -->
    <div v-if="isError" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
      <span>{{ t('tickets.loadFailed') }}</span>
      <Button :label="t('common.retry')" size="small" severity="danger" text @click="refetch()" />
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
      <Column field="title" :header="t('tickets.formTitle')" sortable style="min-width: 240px">
        <template #body="{ data: row }: { data: Ticket }">
          <span class="font-medium text-[var(--text)] line-clamp-1">{{ row.title }}</span>
        </template>
      </Column>

      <Column field="status" :header="t('tickets.status')" style="width: 150px">
        <template #body="{ data: row }: { data: Ticket }">
          <Tag :severity="statusSeverity(row.status)" :value="row.status.replace('_', ' ')" />
        </template>
      </Column>

      <Column field="priority" :header="t('tickets.priority')" style="width: 110px">
        <template #body="{ data: row }: { data: Ticket }">
          <Tag :severity="prioritySeverity(row.priority)" :value="row.priority" />
        </template>
      </Column>

      <Column field="source" :header="t('tickets.source')" style="width: 140px">
        <template #body="{ data: row }: { data: Ticket }">
          <SourceBadge :source="row.source" />
        </template>
      </Column>

      <Column field="clientId" :header="t('tickets.client')" style="min-width: 140px">
        <template #body="{ data: row }: { data: Ticket }">
          <span class="text-[var(--text-muted)] text-sm">{{ row.clientName ?? row.clientId ?? '—' }}</span>
        </template>
      </Column>

      <Column field="createdAt" :header="t('tickets.createdAt')" sortable style="width: 130px">
        <template #body="{ data: row }: { data: Ticket }">
          <span class="text-[var(--text-muted)] text-sm">{{ formatDate(row.createdAt) }}</span>
        </template>
      </Column>

      <Column :header="t('common.actions')" style="width: 140px">
        <template #body="{ data: row }: { data: Ticket }">
          <div class="flex gap-1">
            <Button
              icon="pi pi-pencil"
              severity="secondary"
              text
              rounded
              v-tooltip.top="t('common.edit')"
              @click="openEditDialog(row)"
            />
            <Button
              icon="pi pi-eye"
              severity="secondary"
              text
              rounded
              v-tooltip.top="t('common.edit')"
              @click="router.push('/tickets/' + row.id)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              v-tooltip.top="t('common.delete')"
              @click="confirmDeleteTicket(row)"
            />
          </div>
        </template>
      </Column>

      <template #empty>
        <div class="text-center py-8 text-[var(--text-muted)]">{{ t('common.noRows') }}</div>
      </template>
    </DataTable>
  </div>

  <!-- Create Ticket Dialog -->
  <AppDialog
    v-model:visible="showCreateDialog"
    :title="t('tickets.createTitle')"
    :subtitle="t('tickets.createSubtitle')"
    :loading="isSubmitting"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
      <FormField :label="t('tickets.formTitle')" name="title" :error="createForm.errors.value.title" required>
        <InputText
          id="title"
          v-model="titleValue"
          v-bind="titleAttrs"
          :placeholder="t('tickets.formTitlePlaceholder')"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField :label="t('tickets.formDescription')" name="description" :error="createForm.errors.value.description" required>
        <Textarea
          id="description"
          v-model="descriptionValue"
          v-bind="descriptionAttrs"
          :placeholder="t('tickets.formDescriptionPlaceholder')"
          :rows="3"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField :label="t('tickets.priority')" name="priority" :error="createForm.errors.value.priority" required>
        <Select
          id="priority"
          v-model="priorityValue"
          v-bind="priorityAttrs"
          :options="formPriorityOptions"
          option-label="label"
          option-value="value"
          :placeholder="t('tickets.formPriorityPlaceholder')"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField :label="t('tickets.client')" name="clientId" :error="createForm.errors.value.clientId">
        <Select
          id="clientId"
          v-model="clientIdValue"
          v-bind="clientIdAttrs"
          :options="clientOptions"
          option-label="label"
          option-value="value"
          :placeholder="t('tickets.formClientPlaceholder')"
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
          :label="t('common.cancel')"
          severity="secondary"
          outlined
          :disabled="isSubmitting"
          @click="showCreateDialog = false"
        />
        <Button
          :label="t('tickets.newTicket')"
          :loading="isSubmitting"
          @click="onSubmit"
        />
      </div>
    </template>
  </AppDialog>

  <!-- Edit Ticket Dialog -->
  <AppDialog
    v-model:visible="showEditDialog"
    :title="t('tickets.editTitle')"
    :subtitle="t('tickets.editSubtitle')"
    :loading="isEditSubmitting"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onEditSubmit">
      <FormField :label="t('tickets.status')" name="edit-status" :error="editForm.errors.value.status" required>
        <Select
          id="edit-status"
          v-model="editStatus"
          v-bind="editStatusAttrs"
          :options="formStatusOptions"
          option-label="label"
          option-value="value"
          :placeholder="t('tickets.formStatusPlaceholder')"
          class="w-full"
          :disabled="isEditSubmitting"
        />
      </FormField>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          :label="t('common.cancel')"
          severity="secondary"
          outlined
          :disabled="isEditSubmitting"
          @click="showEditDialog = false"
        />
        <Button
          :label="t('tickets.saveChanges')"
          :loading="isEditSubmitting"
          @click="onEditSubmit"
        />
      </div>
    </template>
  </AppDialog>
</template>
