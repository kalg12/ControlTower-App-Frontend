<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryValue } from 'vue-router'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useConfirm } from 'primevue/useconfirm'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import AppDialog from '@/components/ui/AppDialog.vue'
import FormField from '@/components/ui/FormField.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import { usersService, rolesService } from '@/services/users.service'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import type { User, UserStatus } from '@/types/user'
import { Shield, ShieldOff } from 'lucide-vue-next'

const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const page = ref(0)
const pageSize = 20
const globalFilter = ref('')

const { data: result, isLoading, isError, refetch } = useQuery({
  queryKey: computed(() => ['users', authStore.user?.tenantId, page.value]),
  queryFn: () =>
    usersService.list({
      tenantId: authStore.user!.tenantId,
      page: page.value,
      size: pageSize
    }),
  enabled: computed(() => !!authStore.user?.tenantId),
  staleTime: 15000
})

const { data: rolesData } = useQuery({
  queryKey: ['roles', 'page0'],
  queryFn: () => rolesService.listRoles(0, 200),
  staleTime: 60000
})

const users = computed(() => {
  const list = result.value?.content ?? []
  const q = globalFilter.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(
    (u) =>
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
  )
})
const totalRecords = computed(() => result.value?.totalElements ?? 0)
const roleOptions = computed(() =>
  (rolesData.value?.content ?? []).map((r) => ({ label: r.name, value: r.id }))
)

function statusSeverity(status: UserStatus): 'success' | 'secondary' | 'danger' | 'warn' {
  const map: Record<UserStatus, 'success' | 'secondary' | 'danger' | 'warn'> = {
    ACTIVE: 'success',
    SUSPENDED: 'danger',
    PENDING_VERIFICATION: 'warn'
  }
  return map[status] ?? 'secondary'
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

// --- Delete ---
function handleDelete(user: User) {
  confirm.require({
    message: `Delete ${user.fullName}? This cannot be undone.`,
    header: 'Delete User',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Delete', severity: 'danger' },
    accept: async () => {
      try {
        await usersService.delete(user.id)
        await queryClient.invalidateQueries({ queryKey: ['users'] })
        toast.success('User deleted')
      } catch {
        toast.error('Failed to delete user')
      }
    }
  })
}

// --- Invite / Create User ---
const showInviteDialog = ref(false)
const isInviting = ref(false)

const schema = z.object({
  fullName: z.string().min(2, 'Min 2 characters'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Min 8 characters'),
  roleId: z.string().optional()
})

const { handleSubmit, errors, resetForm, defineField } = useForm({
  validationSchema: toTypedSchema(schema),
  initialValues: { fullName: '', email: '', password: '', roleId: '' }
})

const [fullNameValue, fullNameAttrs] = defineField('fullName')
const [emailValue, emailAttrs] = defineField('email')
const [passwordValue, passwordAttrs] = defineField('password')
const [roleIdValue, roleIdAttrs] = defineField('roleId')

function openInviteDialog(presetRoleId?: string) {
  resetForm({
    values: {
      fullName: '',
      email: '',
      password: '',
      roleId: presetRoleId ?? ''
    }
  })
  showInviteDialog.value = true
}

function queryParamId(v: LocationQueryValue | LocationQueryValue[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v
  if (s == null || s === '') return undefined
  return String(s)
}

watch(
  () => route.query.inviteWithRole,
  (q) => {
    const id = queryParamId(q)
    if (!id) return
    openInviteDialog(id)
    const rest = { ...route.query }
    delete rest.inviteWithRole
    void router.replace({ path: route.path, query: rest })
  },
  { immediate: true }
)

const onSubmit = handleSubmit(async (values) => {
  if (!authStore.user?.tenantId) return
  isInviting.value = true
  try {
    await usersService.create(authStore.user.tenantId, {
      fullName: values.fullName,
      email: values.email,
      password: values.password,
      roleIds: values.roleId ? [values.roleId] : []
    })
    await queryClient.invalidateQueries({ queryKey: ['users'] })
    showInviteDialog.value = false
    toast.success('User created', `${values.email} can now log in.`)
  } catch {
    toast.error('Failed to create user')
  } finally {
    isInviting.value = false
  }
})

// --- Edit user ---
const showEditDialog = ref(false)
const editingUser = ref<User | null>(null)
const isSavingEdit = ref(false)

const userStatusOptions = [
  { label: 'Active', value: 'ACTIVE' as const },
  { label: 'Suspended', value: 'SUSPENDED' as const },
  { label: 'Pending verification', value: 'PENDING_VERIFICATION' as const }
]

const editSchema = z.object({
  fullName: z.string().min(2, 'Min 2 characters'),
  email: z.string().email('Valid email required'),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']),
  roleIds: z.array(z.string()),
  password: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 8, { message: 'Min 8 characters if set' })
})

const editForm = useForm({
  validationSchema: toTypedSchema(editSchema),
  initialValues: {
    fullName: '',
    email: '',
    status: 'ACTIVE' as const,
    roleIds: [] as string[],
    password: ''
  }
})

const [editFullName, editFullNameAttrs] = editForm.defineField('fullName')
const [editEmail, editEmailAttrs] = editForm.defineField('email')
const [editStatus, editStatusAttrs] = editForm.defineField('status')
const [editRoleIds, editRoleIdsAttrs] = editForm.defineField('roleIds')
const [editPassword, editPasswordAttrs] = editForm.defineField('password')

function roleIdsForUser(user: User): string[] {
  const codes = new Set(user.roles ?? [])
  return (rolesData.value?.content ?? []).filter((r) => codes.has(r.code ?? r.name)).map((r) => r.id)
}

function openEditDialog(user: User) {
  editingUser.value = user
  editForm.resetForm({
    values: {
      fullName: user.fullName,
      email: user.email,
      status: user.status,
      roleIds: roleIdsForUser(user),
      password: ''
    }
  })
  showEditDialog.value = true
}

const onEditSubmit = editForm.handleSubmit(async (values) => {
  if (!editingUser.value) return
  isSavingEdit.value = true
  try {
    const payload: Parameters<typeof usersService.update>[1] = {
      fullName: values.fullName,
      email: values.email,
      status: values.status,
      roleIds: values.roleIds
    }
    const pwd = values.password?.trim()
    if (pwd) payload.password = pwd
    await usersService.update(editingUser.value.id, payload)
    await queryClient.invalidateQueries({ queryKey: ['users'] })
    showEditDialog.value = false
    editingUser.value = null
    toast.success('User updated')
  } catch {
    toast.error('Failed to update user')
  } finally {
    isSavingEdit.value = false
  }
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">Users</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ totalRecords }} total users</p>
      </div>
      <div class="flex gap-2">
        <Button icon="pi pi-refresh" severity="secondary" outlined @click="refetch()" />
        <Button label="Invite User" icon="pi pi-user-plus" @click="() => openInviteDialog()" />
      </div>
    </div>

    <!-- Search -->
    <div class="flex gap-3">
      <InputText
        v-model="globalFilter"
        placeholder="Search users..."
        class="max-w-md"
        @input="onSearch"
      />
    </div>

    <!-- Error state -->
    <div v-if="isError" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
      <span>Failed to load users. Check your connection or permissions.</span>
      <Button label="Retry" size="small" severity="danger" text @click="refetch()" />
    </div>

    <!-- Skeleton on first load -->
    <SkeletonTable v-if="isLoading && !result" :rows="5" :cols="6" />

    <!-- DataTable -->
    <DataTable
      v-else
      lazy
      :first="page * pageSize"
      :value="users"
      :loading="isLoading"
      :rows="pageSize"
      :total-records="totalRecords"
      paginator
      removable-sort
      striped-rows
      class="rounded-xl overflow-hidden"
      @page="onPage"
    >
      <Column field="fullName" header="User" sortable style="min-width: 200px">
        <template #body="{ data: row }: { data: User }">
          <div>
            <p class="text-sm font-medium text-[var(--text)]">{{ row.fullName }}</p>
            <p class="text-xs text-[var(--text-muted)]">{{ row.email }}</p>
          </div>
        </template>
      </Column>

      <Column field="status" header="Status" style="width: 110px">
        <template #body="{ data: row }: { data: User }">
          <Tag :severity="statusSeverity(row.status)" :value="row.status" />
        </template>
      </Column>

      <Column field="superAdmin" header="2FA / Admin" style="width: 130px">
        <template #body="{ data: row }: { data: User }">
          <div class="flex items-center gap-2">
            <Shield v-if="row.twoFactorEnabled" class="w-4 h-4 text-green-500" title="2FA enabled" />
            <ShieldOff v-else class="w-4 h-4 text-[var(--text-muted)]" title="2FA disabled" />
            <Tag v-if="row.superAdmin" severity="warn" value="SuperAdmin" class="text-xs" />
          </div>
        </template>
      </Column>

      <Column field="roles" header="Roles" style="min-width: 160px">
        <template #body="{ data: row }: { data: User }">
          <div class="flex flex-wrap gap-1">
            <Tag
              v-for="role in row.roles"
              :key="role"
              severity="secondary"
              :value="role"
              class="text-xs"
            />
            <span v-if="!row.roles?.length" class="text-[var(--text-muted)] text-sm">—</span>
          </div>
        </template>
      </Column>

      <Column field="createdAt" header="Joined" sortable style="width: 130px">
        <template #body="{ data: row }: { data: User }">
          <span class="text-[var(--text-muted)] text-sm">{{ formatDate(row.createdAt) }}</span>
        </template>
      </Column>

      <Column header="Actions" style="width: 180px">
        <template #body="{ data: row }: { data: User }">
          <div class="flex items-center gap-1">
            <Button
              icon="pi pi-pencil"
              severity="secondary"
              text
              rounded
              v-tooltip.top="'Edit'"
              @click="openEditDialog(row)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              v-tooltip.top="'Delete'"
              @click="handleDelete(row)"
            />
          </div>
        </template>
      </Column>

      <template #empty>
        <div class="text-center py-8 text-[var(--text-muted)]">No users found</div>
      </template>
    </DataTable>
  </div>

  <!-- Invite User Dialog -->
  <AppDialog
    v-model:visible="showInviteDialog"
    title="Invite User"
    subtitle="Create a new user account for this tenant."
    :loading="isInviting"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
      <FormField label="Full Name" name="fullName" :error="errors.fullName" required>
        <InputText
          id="inv-fullName"
          v-model="fullNameValue"
          v-bind="fullNameAttrs"
          placeholder="Jane Doe"
          class="w-full"
          :disabled="isInviting"
        />
      </FormField>

      <FormField label="Email" name="email" :error="errors.email" required>
        <InputText
          id="inv-email"
          v-model="emailValue"
          v-bind="emailAttrs"
          type="email"
          placeholder="jane@company.com"
          class="w-full"
          :disabled="isInviting"
        />
      </FormField>

      <FormField label="Password" name="password" :error="errors.password" required>
        <InputText
          id="inv-password"
          v-model="passwordValue"
          v-bind="passwordAttrs"
          type="password"
          placeholder="Min 8 characters"
          class="w-full"
          :disabled="isInviting"
        />
      </FormField>

      <FormField label="Role" name="roleId" :error="errors.roleId">
        <Select
          id="inv-role"
          v-model="roleIdValue"
          v-bind="roleIdAttrs"
          :options="roleOptions"
          option-label="label"
          option-value="value"
          placeholder="Select a role (optional)"
          class="w-full"
          :disabled="isInviting"
        />
      </FormField>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          :disabled="isInviting"
          @click="showInviteDialog = false"
        />
        <Button
          label="Create User"
          :loading="isInviting"
          @click="onSubmit"
        />
      </div>
    </template>
  </AppDialog>

  <!-- Edit User Dialog -->
  <AppDialog
    v-model:visible="showEditDialog"
    title="Edit User"
    subtitle="Update profile, status, roles, or set a new password (optional)."
    :loading="isSavingEdit"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onEditSubmit">
      <FormField label="Full Name" name="edit-fullName" :error="editForm.errors.value.fullName" required>
        <InputText
          id="edit-fullName"
          v-model="editFullName"
          v-bind="editFullNameAttrs"
          class="w-full"
          :disabled="isSavingEdit"
        />
      </FormField>

      <FormField label="Email" name="edit-email" :error="editForm.errors.value.email" required>
        <InputText
          id="edit-email"
          v-model="editEmail"
          v-bind="editEmailAttrs"
          type="email"
          class="w-full"
          :disabled="isSavingEdit"
        />
      </FormField>

      <FormField label="Status" name="edit-status" :error="editForm.errors.value.status" required>
        <Select
          id="edit-status"
          v-model="editStatus"
          v-bind="editStatusAttrs"
          :options="userStatusOptions"
          option-label="label"
          option-value="value"
          class="w-full"
          :disabled="isSavingEdit"
        />
      </FormField>

      <FormField label="Roles" name="edit-roles" :error="editForm.errors.value.roleIds">
        <MultiSelect
          id="edit-roles"
          v-model="editRoleIds"
          v-bind="editRoleIdsAttrs"
          :options="roleOptions"
          option-label="label"
          option-value="value"
          placeholder="Select roles"
          display="chip"
          filter
          class="w-full"
          :disabled="isSavingEdit"
        />
      </FormField>

      <FormField label="New password" name="edit-password" :error="editForm.errors.value.password">
        <InputText
          id="edit-password"
          v-model="editPassword"
          v-bind="editPasswordAttrs"
          type="password"
          autocomplete="new-password"
          placeholder="Optional — min 8 characters"
          class="w-full"
          :disabled="isSavingEdit"
        />
        <p class="text-xs text-[var(--text-muted)] mt-1">Leave blank to keep the current password.</p>
      </FormField>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          :disabled="isSavingEdit"
          @click="showEditDialog = false"
        />
        <Button label="Save" :loading="isSavingEdit" @click="onEditSubmit" />
      </div>
    </template>
  </AppDialog>

</template>
