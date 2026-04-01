<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { usersService } from '@/services/users.service'
import { useToast } from '@/composables/useToast'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import DataTable from '@/components/ui/DataTable.vue'
import Modal from '@/components/ui/Modal.vue'
import Input from '@/components/ui/Input.vue'
import Spinner from '@/components/ui/Spinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Avatar from '@/components/ui/Avatar.vue'
import { Plus, Search, Users, Shield, ShieldOff, Trash2 } from 'lucide-vue-next'
import type { User, CreateUserRequest } from '@/types/user'

const toast = useToast()
const loading = ref(true)
const users = ref<User[]>([])
const total = ref(0)
const search = ref('')
const showCreateModal = ref(false)
const creating = ref(false)

const createForm = reactive<CreateUserRequest>({
  email: '',
  fullName: '',
  password: '',
  roleIds: []
})
const createErrors = reactive({ email: '', fullName: '', password: '' })

const mockUsers: User[] = [
  { id: '1', email: 'admin@controltower.mx', fullName: 'Carlos Mendoza', status: 'ACTIVE', twoFactorEnabled: true, tenantId: 't1', roles: [{ id: 'r1', name: 'ADMIN', permissions: ['*'] }], createdAt: new Date(Date.now() - 86400000 * 180).toISOString() },
  { id: '2', email: 'soporte@controltower.mx', fullName: 'Ana García', status: 'ACTIVE', twoFactorEnabled: false, tenantId: 't1', roles: [{ id: 'r2', name: 'SUPPORT', permissions: ['tickets:read', 'tickets:write'] }], createdAt: new Date(Date.now() - 86400000 * 90).toISOString() },
  { id: '3', email: 'billing@controltower.mx', fullName: 'Roberto Silva', status: 'ACTIVE', twoFactorEnabled: true, tenantId: 't1', roles: [{ id: 'r3', name: 'BILLING', permissions: ['licenses:read', 'licenses:write'] }], createdAt: new Date(Date.now() - 86400000 * 45).toISOString() },
  { id: '4', email: 'tech@controltower.mx', fullName: 'María López', status: 'INACTIVE', twoFactorEnabled: false, tenantId: 't1', roles: [{ id: 'r2', name: 'SUPPORT', permissions: ['tickets:read'] }], createdAt: new Date(Date.now() - 86400000 * 20).toISOString() }
]

const columns = [
  { key: 'name', label: 'User', sortable: true },
  { key: 'status', label: 'Status', width: '100px' },
  { key: 'twoFactorEnabled', label: '2FA', width: '80px', align: 'center' as const },
  { key: 'roles', label: 'Roles' },
  { key: 'createdAt', label: 'Joined', width: '120px', align: 'right' as const },
  { key: 'actions', label: '', width: '80px', align: 'right' as const }
]

async function fetchUsers() {
  loading.value = true
  try {
    const res = await usersService.list({ search: search.value || undefined, size: 50 })
    users.value = res.content
    total.value = res.totalElements
  } catch {
    const filtered = search.value
      ? mockUsers.filter(u => u.fullName.toLowerCase().includes(search.value.toLowerCase()) || u.email.toLowerCase().includes(search.value.toLowerCase()))
      : mockUsers
    users.value = filtered
    total.value = filtered.length
  } finally {
    loading.value = false
  }
}

let searchTimeout: ReturnType<typeof setTimeout>
watch(search, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => fetchUsers(), 400)
})

onMounted(fetchUsers)

function statusVariant(status: User['status']): string {
  const map: Record<string, string> = { ACTIVE: 'success', INACTIVE: 'default', SUSPENDED: 'danger' }
  return map[status] ?? 'default'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' })
}

function validateCreate(): boolean {
  createErrors.email = ''
  createErrors.fullName = ''
  createErrors.password = ''
  if (!createForm.fullName.trim()) { createErrors.fullName = 'Full name is required'; return false }
  if (!createForm.email.trim()) { createErrors.email = 'Email is required'; return false }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) { createErrors.email = 'Invalid email'; return false }
  if (!createForm.password || createForm.password.length < 8) { createErrors.password = 'Password must be at least 8 characters'; return false }
  return true
}

async function handleCreate() {
  if (!validateCreate()) return
  creating.value = true
  try {
    const user = await usersService.create(createForm)
    users.value.unshift(user)
    total.value++
    showCreateModal.value = false
    createForm.email = ''; createForm.fullName = ''; createForm.password = ''; createForm.roleIds = []
    toast.success('User created', `${user.fullName} has been added.`)
  } catch {
    toast.error('Failed to create user', 'Please try again.')
  } finally {
    creating.value = false
  }
}

async function handleDelete(user: User) {
  if (!confirm(`Delete user "${user.fullName}"?`)) return
  try {
    await usersService.delete(user.id)
    users.value = users.value.filter(u => u.id !== user.id)
    total.value--
    toast.success('User deleted')
  } catch {
    toast.error('Failed to delete user')
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">Users</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ total }} total users</p>
      </div>
      <Button variant="primary" size="sm" @click="showCreateModal = true">
        <Plus class="w-4 h-4" />
        New User
      </Button>
    </div>

    <!-- Search -->
    <div class="relative max-w-md">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
      <input
        v-model="search"
        type="text"
        placeholder="Search users..."
        class="w-full pl-9 pr-4 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] text-[var(--text)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] transition-all"
      />
    </div>

    <div v-if="loading" class="flex items-center justify-center py-16">
      <Spinner class="w-7 h-7 text-[var(--primary)]" />
    </div>

    <template v-else>
      <DataTable :columns="columns" :rows="users as any[]" :loading="false">
        <template #cell-name="{ row }">
          <div class="flex items-center gap-2.5">
            <Avatar :name="(row as unknown as User).fullName" size="xs" />
            <div>
              <p class="text-sm font-medium text-[var(--text)]">{{ (row as unknown as User).fullName }}</p>
              <p class="text-xs text-[var(--text-muted)]">{{ (row as unknown as User).email }}</p>
            </div>
          </div>
        </template>
        <template #cell-status="{ row }">
          <Badge :variant="(statusVariant((row as unknown as User).status) as any)" dot>{{ (row as unknown as User).status }}</Badge>
        </template>
        <template #cell-twoFactorEnabled="{ row }">
          <div class="flex justify-center">
            <Shield v-if="(row as unknown as User).twoFactorEnabled" class="w-4 h-4 text-green-500" title="2FA enabled" />
            <ShieldOff v-else class="w-4 h-4 text-[var(--text-muted)]" title="2FA disabled" />
          </div>
        </template>
        <template #cell-roles="{ row }">
          <div class="flex flex-wrap gap-1">
            <Badge v-for="role in (row as unknown as User).roles" :key="role.id" variant="purple" size="sm">
              {{ role.name }}
            </Badge>
          </div>
        </template>
        <template #cell-createdAt="{ row }">
          <span class="text-[var(--text-muted)]">{{ formatDate((row as unknown as User).createdAt) }}</span>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex justify-end">
            <button
              class="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
              title="Delete user"
              @click="handleDelete(row as unknown as User)"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </template>
      </DataTable>

      <EmptyState
        v-if="users.length === 0"
        title="No users found"
        description="Add team members to give them access to Control Tower."
        action-label="Add User"
        @action="showCreateModal = true"
      >
        <template #icon><Users class="w-6 h-6" /></template>
      </EmptyState>
    </template>

    <!-- Create Modal -->
    <Modal :open="showCreateModal" title="New User" size="md" @close="showCreateModal = false">
      <form class="space-y-4" @submit.prevent="handleCreate">
        <Input v-model="createForm.fullName" label="Full Name" placeholder="Ana García" :error="createErrors.fullName" required />
        <Input v-model="createForm.email" label="Email" type="email" placeholder="ana@company.com" :error="createErrors.email" required />
        <Input v-model="createForm.password" label="Temporary Password" type="password" placeholder="Min 8 characters" :error="createErrors.password" required hint="User will be asked to change on first login" />
      </form>

      <template #footer>
        <Button variant="ghost" size="sm" @click="showCreateModal = false">Cancel</Button>
        <Button variant="primary" size="sm" :loading="creating" @click="handleCreate">Create User</Button>
      </template>
    </Modal>
  </div>
</template>
