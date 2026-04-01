<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { clientsService } from '@/services/clients.service'
import { useToast } from '@/composables/useToast'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import Modal from '@/components/ui/Modal.vue'
import Input from '@/components/ui/Input.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Spinner from '@/components/ui/Spinner.vue'
import Avatar from '@/components/ui/Avatar.vue'
import { Plus, Search, Building2, GitBranch, Mail, Phone, Trash2 } from 'lucide-vue-next'
import type { Client, CreateClientRequest } from '@/types/client'

const toast = useToast()
const loading = ref(true)
const clients = ref<Client[]>([])
const total = ref(0)
const search = ref('')
const showCreateModal = ref(false)
const creating = ref(false)

const createForm = reactive<CreateClientRequest>({ name: '', slug: '', contactEmail: '', contactPhone: '' })
const createErrors = reactive({ name: '', slug: '', contactEmail: '' })

const mockClients: Client[] = [
  { id: '1', name: 'Restaurante El Torito', slug: 'el-torito', contactEmail: 'admin@eltorito.com.mx', contactPhone: '+52 55 1234 5678', tenantId: 't1', createdAt: new Date(Date.now() - 86400000 * 30).toISOString(), branchCount: 5 },
  { id: '2', name: 'Farmacia San Pablo', slug: 'farmacia-san-pablo', contactEmail: 'sistemas@sanpablo.mx', contactPhone: '+52 33 9876 5432', tenantId: 't1', createdAt: new Date(Date.now() - 86400000 * 60).toISOString(), branchCount: 12 },
  { id: '3', name: 'Oxxo Sucursal Norte', slug: 'oxxo-norte', contactEmail: 'norte@oxxo.mx', tenantId: 't1', createdAt: new Date(Date.now() - 86400000 * 90).toISOString(), branchCount: 1 },
  { id: '4', name: 'Auto Servicio Garza', slug: 'garza-auto', contactEmail: 'garza@autoservicio.mx', contactPhone: '+52 81 5555 4444', tenantId: 't1', createdAt: new Date(Date.now() - 86400000 * 120).toISOString(), branchCount: 3 },
  { id: '5', name: 'Boutique La Moda', slug: 'la-moda', contactEmail: 'info@lamoda.mx', tenantId: 't1', createdAt: new Date(Date.now() - 86400000 * 150).toISOString(), branchCount: 2 },
  { id: '6', name: 'Supermercado Familia', slug: 'super-familia', contactEmail: 'ti@superfamilia.mx', contactPhone: '+52 55 7777 8888', tenantId: 't1', createdAt: new Date(Date.now() - 86400000 * 180).toISOString(), branchCount: 8 }
]

async function fetchClients() {
  loading.value = true
  try {
    const res = await clientsService.list({ search: search.value || undefined, size: 50 })
    clients.value = res.content
    total.value = res.totalElements
  } catch {
    const filtered = search.value
      ? mockClients.filter((c: Client) => c.name.toLowerCase().includes(search.value.toLowerCase()))
      : mockClients
    clients.value = filtered
    total.value = filtered.length
  } finally {
    loading.value = false
  }
}

let searchTimeout: ReturnType<typeof setTimeout>
watch(search, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => fetchClients(), 400)
})

onMounted(fetchClients)

function generateSlug(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

watch(() => createForm.name, (val) => {
  if (!createForm.slug || createForm.slug === generateSlug(createForm.name.slice(0, -1))) {
    createForm.slug = generateSlug(val)
  }
})

function validateCreate(): boolean {
  createErrors.name = ''
  createErrors.slug = ''
  createErrors.contactEmail = ''
  if (!createForm.name.trim()) { createErrors.name = 'Name is required'; return false }
  if (!createForm.slug.trim()) { createErrors.slug = 'Slug is required'; return false }
  if (createForm.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.contactEmail)) {
    createErrors.contactEmail = 'Enter a valid email'
    return false
  }
  return true
}

async function handleCreate() {
  if (!validateCreate()) return
  creating.value = true
  try {
    const client = await clientsService.create(createForm)
    clients.value.unshift(client)
    total.value++
    showCreateModal.value = false
    createForm.name = ''; createForm.slug = ''; createForm.contactEmail = ''; createForm.contactPhone = ''
    toast.success('Client created', `${client.name} has been added.`)
  } catch {
    toast.error('Failed to create client', 'Please try again.')
  } finally {
    creating.value = false
  }
}

async function handleDelete(client: Client) {
  if (!confirm(`Delete "${client.name}"? This action cannot be undone.`)) return
  try {
    await clientsService.delete(client.id)
    clients.value = clients.value.filter(c => c.id !== client.id)
    total.value--
    toast.success('Client deleted')
  } catch {
    toast.error('Failed to delete client')
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">Clients</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ total }} total clients</p>
      </div>
      <Button variant="primary" size="sm" @click="showCreateModal = true">
        <Plus class="w-4 h-4" />
        New Client
      </Button>
    </div>

    <!-- Search -->
    <div class="relative max-w-md">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
      <input
        v-model="search"
        type="text"
        placeholder="Search clients..."
        class="w-full pl-9 pr-4 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] text-[var(--text)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <Spinner class="w-7 h-7 text-[var(--primary)]" />
    </div>

    <!-- Grid -->
    <div v-else-if="clients.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <Card
        v-for="client in clients"
        :key="client.id"
        hover
        class="group"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <Avatar :name="client.name" size="sm" />
            <div>
              <h3 class="text-sm font-semibold text-[var(--text)]">{{ client.name }}</h3>
              <p class="text-xs text-[var(--text-muted)]">{{ client.slug }}</p>
            </div>
          </div>
          <!-- Actions dropdown placeholder -->
          <div class="flex items-center gap-1">
            <button
              class="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-950 transition-colors opacity-0 group-hover:opacity-100"
              title="Delete client"
              @click.stop="handleDelete(client)"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div class="space-y-1.5">
          <div v-if="client.contactEmail" class="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Mail class="w-3 h-3 flex-shrink-0" />
            <span class="truncate">{{ client.contactEmail }}</span>
          </div>
          <div v-if="client.contactPhone" class="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Phone class="w-3 h-3 flex-shrink-0" />
            <span>{{ client.contactPhone }}</span>
          </div>
          <div class="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <GitBranch class="w-3 h-3 flex-shrink-0" />
            <span>{{ client.branchCount ?? client.branches?.length ?? 0 }} branch(es)</span>
          </div>
        </div>
      </Card>
    </div>

    <!-- Empty state -->
    <EmptyState
      v-else
      title="No clients found"
      description="Add your first client to start managing their POS systems."
      action-label="Add Client"
      @action="showCreateModal = true"
    >
      <template #icon><Building2 class="w-6 h-6" /></template>
    </EmptyState>

    <!-- Create Modal -->
    <Modal :open="showCreateModal" title="New Client" size="md" @close="showCreateModal = false">
      <form class="space-y-4" @submit.prevent="handleCreate">
        <Input v-model="createForm.name" label="Business Name" placeholder="Restaurante El Torito" :error="createErrors.name" required />
        <Input v-model="createForm.slug" label="Slug" placeholder="restaurante-el-torito" :error="createErrors.slug" required hint="Unique identifier used in URLs (auto-generated)" />
        <Input v-model="createForm.contactEmail" label="Contact Email" type="email" placeholder="admin@business.com.mx" :error="createErrors.contactEmail" />
        <Input v-model="createForm.contactPhone" label="Contact Phone" placeholder="+52 55 1234 5678" />
      </form>

      <template #footer>
        <Button variant="ghost" size="sm" @click="showCreateModal = false">Cancel</Button>
        <Button variant="primary" size="sm" :loading="creating" @click="handleCreate">
          Create Client
        </Button>
      </template>
    </Modal>
  </div>
</template>
