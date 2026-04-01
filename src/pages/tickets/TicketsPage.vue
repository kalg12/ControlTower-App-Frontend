<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ticketsService } from '@/services/tickets.service'
import { useToast } from '@/composables/useToast'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import Modal from '@/components/ui/Modal.vue'
import Input from '@/components/ui/Input.vue'
import DataTable from '@/components/ui/DataTable.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { Plus, Search, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type { Ticket, TicketStatus, TicketPriority, CreateTicketRequest } from '@/types/ticket'

const toast = useToast()

const loading = ref(true)
const tickets = ref<Ticket[]>([])
const total = ref(0)
const page = ref(0)
const pageSize = 20

const search = ref('')
const statusFilter = ref<TicketStatus | ''>('')
const priorityFilter = ref<TicketPriority | ''>('')

const showCreateModal = ref(false)
const creating = ref(false)

const createForm = reactive<CreateTicketRequest>({
  title: '',
  description: '',
  priority: 'MEDIUM'
})

const createErrors = reactive({ title: '', description: '' })

const statuses: { value: TicketStatus | ''; label: string }[] = [
  { value: '', label: 'All Status' },
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'PENDING_CUSTOMER', label: 'Pending Customer' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' }
]

const priorities: { value: TicketPriority | ''; label: string }[] = [
  { value: '', label: 'All Priority' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' }
]

const columns = [
  { key: 'title', label: 'Title', sortable: true },
  { key: 'status', label: 'Status', width: '140px' },
  { key: 'priority', label: 'Priority', width: '100px' },
  { key: 'clientName', label: 'Client' },
  { key: 'createdAt', label: 'Created', sortable: true, width: '120px', align: 'right' as const }
]

// Mock data for development
const mockTickets: Ticket[] = [
  { id: '1', title: 'POS system not printing receipts', status: 'OPEN', priority: 'HIGH', tenantId: 't1', clientName: 'Restaurante El Torito', createdAt: new Date(Date.now() - 3600000).toISOString(), updatedAt: new Date().toISOString(), description: 'The receipt printer stopped working after the last update.' },
  { id: '2', title: 'Inventory sync failing between branches', status: 'IN_PROGRESS', priority: 'CRITICAL', tenantId: 't1', clientName: 'Farmacia San Pablo', createdAt: new Date(Date.now() - 7200000).toISOString(), updatedAt: new Date().toISOString(), description: 'Inventory data is not syncing properly.' },
  { id: '3', title: 'Card reader not connecting via Bluetooth', status: 'PENDING_CUSTOMER', priority: 'MEDIUM', tenantId: 't1', clientName: 'Oxxo Sucursal Norte', createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date().toISOString(), description: 'BT card reader disconnects frequently.' },
  { id: '4', title: 'Wrong tax calculation on invoices', status: 'OPEN', priority: 'HIGH', tenantId: 't1', clientName: 'Auto Servicio Garza', createdAt: new Date(Date.now() - 172800000).toISOString(), updatedAt: new Date().toISOString(), description: 'Tax rates being applied incorrectly.' },
  { id: '5', title: 'Login issues after system update', status: 'RESOLVED', priority: 'LOW', tenantId: 't1', clientName: 'Boutique La Moda', createdAt: new Date(Date.now() - 259200000).toISOString(), updatedAt: new Date().toISOString(), description: 'Users unable to login after v2.1.0 update.' }
]

async function fetchTickets() {
  loading.value = true
  try {
    const res = await ticketsService.list({
      search: search.value || undefined,
      status: statusFilter.value || undefined,
      priority: priorityFilter.value || undefined,
      page: page.value,
      size: pageSize
    })
    tickets.value = res.content
    total.value = res.totalElements
  } catch {
    // Use mock data
    tickets.value = mockTickets
    total.value = mockTickets.length
  } finally {
    loading.value = false
  }
}

let searchTimeout: ReturnType<typeof setTimeout>
watch(search, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { page.value = 0; fetchTickets() }, 400)
})
watch([statusFilter, priorityFilter], () => { page.value = 0; fetchTickets() })

onMounted(fetchTickets)

function statusVariant(status: TicketStatus): string {
  const map: Record<TicketStatus, string> = {
    OPEN: 'info', IN_PROGRESS: 'purple', PENDING_CUSTOMER: 'warning', RESOLVED: 'success', CLOSED: 'default'
  }
  return map[status] ?? 'default'
}

function priorityVariant(priority: TicketPriority): string {
  const map: Record<TicketPriority, string> = {
    LOW: 'default', MEDIUM: 'warning', HIGH: 'danger', CRITICAL: 'danger'
  }
  return map[priority] ?? 'default'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })
}

function validateCreate(): boolean {
  createErrors.title = ''
  createErrors.description = ''
  if (!createForm.title.trim()) { createErrors.title = 'Title is required'; return false }
  if (!createForm.description.trim()) { createErrors.description = 'Description is required'; return false }
  return true
}

async function handleCreate() {
  if (!validateCreate()) return
  creating.value = true
  try {
    const ticket = await ticketsService.create(createForm)
    tickets.value.unshift(ticket)
    showCreateModal.value = false
    createForm.title = ''
    createForm.description = ''
    createForm.priority = 'MEDIUM'
    toast.success('Ticket created', `"${ticket.title}" has been created.`)
  } catch {
    toast.error('Failed to create ticket', 'Please try again.')
  } finally {
    creating.value = false
  }
}

const totalPages = computed(() => Math.ceil(total.value / pageSize))
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">Support Tickets</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ total }} total tickets</p>
      </div>
      <Button variant="primary" size="sm" @click="showCreateModal = true">
        <Plus class="w-4 h-4" />
        New Ticket
      </Button>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          v-model="search"
          type="text"
          placeholder="Search tickets..."
          class="w-full pl-9 pr-4 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] text-[var(--text)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all"
        />
      </div>

      <select
        v-model="statusFilter"
        class="px-3 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all"
      >
        <option v-for="s in statuses" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>

      <select
        v-model="priorityFilter"
        class="px-3 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all"
      >
        <option v-for="p in priorities" :key="p.value" :value="p.value">{{ p.label }}</option>
      </select>
    </div>

    <!-- Table -->
    <DataTable :columns="columns" :rows="tickets as any[]" :loading="loading">
      <template #cell-title="{ row }">
        <span class="font-medium text-[var(--text)] line-clamp-1">{{ row.title as string }}</span>
      </template>
      <template #cell-status="{ row }">
        <Badge :variant="(statusVariant(row.status as TicketStatus) as any)">
          {{ (row.status as string).replace('_', ' ') }}
        </Badge>
      </template>
      <template #cell-priority="{ row }">
        <Badge :variant="(priorityVariant(row.priority as TicketPriority) as any)" dot>
          {{ row.priority as string }}
        </Badge>
      </template>
      <template #cell-clientName="{ row }">
        <span class="text-[var(--text-muted)]">{{ row.clientName as string ?? '—' }}</span>
      </template>
      <template #cell-createdAt="{ row }">
        <span class="text-[var(--text-muted)]">{{ formatDate(row.createdAt as string) }}</span>
      </template>
    </DataTable>

    <!-- Empty state -->
    <EmptyState
      v-if="!loading && tickets.length === 0"
      title="No tickets found"
      description="Try adjusting your filters or create a new support ticket."
      action-label="Create Ticket"
      @action="showCreateModal = true"
    >
      <template #icon><MessageSquare class="w-6 h-6" /></template>
    </EmptyState>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between">
      <p class="text-sm text-[var(--text-muted)]">
        Page {{ page + 1 }} of {{ totalPages }}
      </p>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" :disabled="page === 0" @click="page--; fetchTickets()">
          <ChevronLeft class="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" :disabled="page >= totalPages - 1" @click="page++; fetchTickets()">
          <ChevronRight class="w-4 h-4" />
        </Button>
      </div>
    </div>

    <!-- Create Modal -->
    <Modal :open="showCreateModal" title="Create Ticket" size="md" @close="showCreateModal = false">
      <form class="space-y-4" @submit.prevent="handleCreate">
        <Input v-model="createForm.title" label="Title" placeholder="Brief description of the issue" :error="createErrors.title" required />

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-[var(--text)]">Description <span class="text-[var(--danger)]">*</span></label>
          <textarea
            v-model="createForm.description"
            placeholder="Detailed description of the problem..."
            rows="4"
            class="w-full px-3 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] text-[var(--text)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] resize-none transition-all"
            :class="createErrors.description ? 'border-[var(--danger)]' : ''"
          />
          <p v-if="createErrors.description" class="text-xs text-[var(--danger)]">{{ createErrors.description }}</p>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium text-[var(--text)]">Priority</label>
          <select
            v-model="createForm.priority"
            class="px-3 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </form>

      <template #footer>
        <Button variant="ghost" size="sm" @click="showCreateModal = false">Cancel</Button>
        <Button variant="primary" size="sm" :loading="creating" @click="handleCreate">
          Create Ticket
        </Button>
      </template>
    </Modal>
  </div>
</template>
