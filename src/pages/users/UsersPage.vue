<script setup lang="ts">
import { ref, computed } from 'vue'
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
import AppDialog from '@/components/ui/AppDialog.vue'
import FormField from '@/components/ui/FormField.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import { usersService } from '@/services/users.service'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import type { User } from '@/types/user'
import { Shield, ShieldOff } from 'lucide-vue-next'

const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()
const page = ref(0)
const pageSize = 20
const globalFilter = ref('')

const { data: result, isLoading, isError, refetch } = useQuery({
  queryKey: computed(() => ['users', page.value, globalFilter.value]),
  queryFn: () => usersService.list({ page: page.value, size: pageSize, search: globalFilter.value || undefined }),
  staleTime: 15000
})

const { data: rolesData } = useQuery({
  queryKey: ['roles'],
  queryFn: () => usersService.getRoles(),
  staleTime: 60000
})

const users = computed(() => result.value?.content ?? [])
const totalRecords = computed(() => result.value?.totalElements ?? 0)
const roleOptions = computed(() =>
  (rolesData.value ?? []).map(r => ({ label: r.name, value: r.id }))
)

function statusSeverity(status: User['status']): 'success' | 'secondary' | 'danger' {
  const map: Record<string, 'success' | 'secondary' | 'danger'> = {
    ACTIVE: 'success',
    INACTIVE: 'secondary',
    SUSPENDED: 'danger'
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

// --- Suspend / Reactivate ---
function handleToggleStatus(user: User) {
  const nextStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
  const isSuspending = nextStatus === 'SUSPENDED'
  confirm.require({
    message: isSuspending
      ? `Suspend ${user.fullName}? They will lose access.`
      : `Reactivate ${user.fullName}?`,
    header: isSuspending ? 'Suspend User' : 'Reactivate User',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: isSuspending ? 'Suspend' : 'Reactivate', severity: isSuspending ? 'warn' : 'success' },
    accept: async () => {
      try {
        await usersService.update(user.id, { status: nextStatus })
        await queryClient.invalidateQueries({ queryKey: ['users'] })
        toast.success(isSuspending ? 'User suspended' : 'User reactivated')
      } catch {
        toast.error('Failed to update user status')
      }
    }
  })
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

// --- Edit User Modal ---
const showEditDialog = ref(false)
const editingUser = ref<User | null>(null)
const isEditSubmitting = ref(false)

const editSchema = z.object({
  fullName: z.string().min(2, 'Min 2 characters'),
  roleId: z.string().optional()
})

const editForm = useForm({
  validationSchema: toTypedSchema(editSchema),
  initialValues: { fullName: '', roleId: '' }
})

const [editFullName, editFullNameAttrs] = editForm.defineField('fullName')
const [editRoleId, editRoleIdAttrs] = editForm.defineField('roleId')

function openEditDialog(user: User) {
  editingUser.value = user
  editForm.setValues({
    fullName: user.fullName,
    roleId: user.roles?.[0] ?? ''
  })
  showEditDialog.value = true
}

const onEditSubmit = editForm.handleSubmit(async (values) => {
  if (!editingUser.value) return
  isEditSubmitting.value = true
  try {
    await usersService.update(editingUser.value.id, { fullName: values.fullName })
    if (values.roleId) {
      await usersService.assignRoles(editingUser.value.id, [values.roleId])
    }
    await queryClient.invalidateQueries({ queryKey: ['users'] })
    showEditDialog.value = false
    toast.success('User updated')
  } catch {
    toast.error('Failed to update user')
  } finally {
    isEditSubmitting.value = false
  }
})

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

function openInviteDialog() {
  resetForm()
  showInviteDialog.value = true
}

const onSubmit = handleSubmit(async (values) => {
  isInviting.value = true
  try {
    await usersService.create({
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
        <Button label="Invite User" icon="pi pi-user-plus" @click="openInviteDialog" />
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
    <div v-if="isError && !isLoading" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
      <span>Failed to load users. Check your connection or permissions.</span>
      <Button label="Retry" size="small" severity="danger" text @click="refetch()" />
    </div>

    <!-- Skeleton on first load -->
    <SkeletonTable v-if="isLoading && !result" :rows="5" :cols="6" />

    <!-- DataTable -->
    <DataTable
      v-else
      :value="users"
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

      <Column header="Actions" style="width: 140px">
        <template #body="{ data: row }: { data: User }">
          <div class="flex items-center gap-1">
            <Button
              icon="pi pi-pencil"
              severity="secondary"
              text
              rounded
              v-tooltip.top="'Edit user'"
              @click="openEditDialog(row)"
            />
            <Button
              :icon="row.status === 'ACTIVE' ? 'pi pi-lock' : 'pi pi-unlock'"
              :severity="row.status === 'ACTIVE' ? 'warn' : 'success'"
              text
              rounded
              v-tooltip.top="row.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'"
              @click="handleToggleStatus(row)"
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
    subtitle="Update user name and role assignment."
    :loading="isEditSubmitting"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onEditSubmit">
      <FormField label="Full Name" name="edit-fullName" :error="editForm.errors.value.fullName" required>
        <InputText
          id="edit-fullName"
          v-model="editFullName"
          v-bind="editFullNameAttrs"
          placeholder="Full name"
          class="w-full"
          :disabled="isEditSubmitting"
        />
      </FormField>

      <FormField label="Role" name="edit-roleId" :error="editForm.errors.value.roleId">
        <Select
          id="edit-roleId"
          v-model="editRoleId"
          v-bind="editRoleIdAttrs"
          :options="roleOptions"
          option-label="label"
          option-value="value"
          placeholder="Select a role (optional)"
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
