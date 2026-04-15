<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useConfirm } from 'primevue/useconfirm'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import Button from 'primevue/button'
import AppDialog from '@/components/ui/AppDialog.vue'
import FormField from '@/components/ui/FormField.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import PageInfoButton from '@/components/ui/PageInfoButton.vue'
import { usersService, rolesService } from '@/services/users.service'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import type { User, Role } from '@/types/user'
import { Shield, ShieldOff } from 'lucide-vue-next'

const { t } = useI18n()
const authStore = useAuthStore()
const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()

const page = ref(0)
const pageSize = 20

const { data: rolesResult } = useQuery({
  queryKey: ['roles'],
  queryFn: () => rolesService.listRoles(0, 100),
  staleTime: 60000,
})
const availableRoles = computed<Role[]>(() => rolesResult.value?.content ?? [])
const roleOptions = computed(() => availableRoles.value.map(r => ({ label: r.name, value: r.id })))

const { data: result, isLoading, isError, refetch } = useQuery({
  queryKey: computed(() => ['users', page.value]),
  queryFn: () => usersService.list({ tenantId: authStore.user?.tenantId || '', page: page.value, size: pageSize }),
  staleTime: 20000,
})

const users = computed(() => result.value?.content ?? [])
const totalRecords = computed(() => result.value?.totalElements ?? 0)

function formatDate(dateStr: string) {
  return dayjs(dateStr).format('DD MMM YYYY')
}

function onPage(event: { page: number }) {
  page.value = event.page
}

const statusOptions = computed(() => [
  { label: t('users.statusActive'), value: 'ACTIVE' },
  { label: t('users.statusSuspended'), value: 'SUSPENDED' },
  { label: t('users.statusPending'), value: 'PENDING' },
])

// --- Invite User ---
const showInviteDialog = ref(false)
const isSubmitting = ref(false)
const inviteRoleIds = ref<string[]>([])

const inviteSchema = z.object({
  fullName: z.string().min(2, t('users.fullNameMin')),
  email: z.string().email(t('users.emailValid')),
  password: z.string().min(8, t('users.passwordMin')),
})

const inviteForm = useForm({
  validationSchema: toTypedSchema(inviteSchema),
  initialValues: { fullName: '', email: '', password: '' },
})

const [invName, invNameAttrs] = inviteForm.defineField('fullName')
const [invEmail, invEmailAttrs] = inviteForm.defineField('email')
const [invPassword, invPasswordAttrs] = inviteForm.defineField('password')

function openInviteDialog() {
  inviteForm.resetForm()
  inviteRoleIds.value = []
  showInviteDialog.value = true
}

const onInviteSubmit = inviteForm.handleSubmit(async (values) => {
  isSubmitting.value = true
  try {
    await usersService.create(authStore.user?.tenantId || '', {
      fullName: values.fullName,
      email: values.email,
      password: values.password,
      roleIds: inviteRoleIds.value,
    })
    await queryClient.invalidateQueries({ queryKey: ['users'] })
    showInviteDialog.value = false
    toast.success(t('users.createSuccess'))
  } catch {
    toast.error(t('users.createFailed'))
  } finally {
    isSubmitting.value = false
  }
})

// --- Edit User ---
const showEditDialog = ref(false)
const editingUser = ref<User | null>(null)
const isEditSubmitting = ref(false)
const editRoleIds = ref<string[]>([])

const editSchema = z.object({
  fullName: z.string().min(2, t('users.fullNameMin')),
  email: z.string().email(t('users.emailValid')),
  status: z.string(),
  password: z.string().min(8, t('users.passwordMinIfSet')).optional().or(z.literal('')),
})

const editForm = useForm({
  validationSchema: toTypedSchema(editSchema),
  initialValues: { fullName: '', email: '', status: 'ACTIVE', password: '' },
})

const [editName, editNameAttrs] = editForm.defineField('fullName')
const [editEmail, editEmailAttrs] = editForm.defineField('email')
const [editStatus] = editForm.defineField('status')
const [editPassword, editPasswordAttrs] = editForm.defineField('password')

function openEditDialog(user: User) {
  editingUser.value = user
  // user.roles may be string[] (role names) or Role[] depending on backend response
  // try to match by id first, fallback to name lookup
  editRoleIds.value = availableRoles.value
    .filter(r => (user.roles as string[]).includes(r.id) || (user.roles as string[]).includes(r.name))
    .map(r => r.id)
  editForm.setValues({ fullName: user.fullName, email: user.email, status: user.status, password: '' })
  showEditDialog.value = true
}

const onEditSubmit = editForm.handleSubmit(async (values) => {
  if (!editingUser.value) return
  isEditSubmitting.value = true
  try {
    await usersService.update(editingUser.value.id, {
      fullName: values.fullName,
      email: values.email,
      status: values.status as any,
      roleIds: editRoleIds.value,
      password: values.password || undefined,
    })
    await queryClient.invalidateQueries({ queryKey: ['users'] })
    showEditDialog.value = false
    toast.success(t('users.updateSuccess'))
  } catch {
    toast.error(t('users.updateFailed'))
  } finally {
    isEditSubmitting.value = false
  }
})

function confirmDeleteUser(user: User) {
  confirm.require({
    message: t('users.deleteConfirm', { name: user.fullName }),
    header: t('users.deleteTitle'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: async () => {
      try {
        await usersService.delete(user.id)
        await queryClient.invalidateQueries({ queryKey: ['users'] })
        toast.success(t('users.deleteSuccess'))
      } catch {
        toast.error(t('users.deleteFailed'))
      }
    }
  })
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex items-center gap-2">
        <div>
          <h2 class="text-lg font-semibold text-[var(--text)]">{{ t('users.title') }}</h2>
          <p class="text-sm text-[var(--text-muted)]">{{ t('users.totalCount', { count: totalRecords }) }}</p>
        </div>
        <PageInfoButton :title="t('users.title')" :description="t('pageInfo.users')" />
      </div>
      <div class="flex flex-wrap gap-2">
        <Button icon="pi pi-refresh" severity="secondary" outlined @click="refetch()" />
        <Button :label="t('users.inviteUser')" icon="pi pi-user-plus" @click="openInviteDialog" />
      </div>
    </div>

    <div v-if="isError" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
      <span>{{ t('users.loadFailed') }}</span>
      <Button :label="t('common.retry')" size="small" severity="danger" text @click="refetch()" />
    </div>

    <SkeletonTable v-else-if="isLoading" :rows="5" :cols="5" />

    <DataTable v-else lazy :first="page * pageSize" :value="users" :loading="isLoading" :rows="pageSize" :total-records="totalRecords" paginator paginator-template="PrevPageLink PageLinks NextPageLink" striped-rows class="rounded-xl overflow-hidden" @page="onPage">
      <Column field="fullName" :header="t('users.user')" style="min-width: 180px">
        <template #body="{ data: row }: { data: User }">
          <span class="font-medium text-[var(--text)]">{{ row.fullName }}</span>
          <span class="block text-xs text-[var(--text-muted)]">{{ row.email }}</span>
        </template>
      </Column>
      <Column field="status" :header="t('users.status')" style="width: 130px">
        <template #body="{ data: row }: { data: User }">
          <Tag :severity="row.status === 'ACTIVE' ? 'success' : row.status === 'SUSPENDED' ? 'danger' : 'warn'" :value="statusOptions.find(o => o.value === row.status)?.label ?? row.status" />
        </template>
      </Column>
      <Column :header="t('users.roles')" style="min-width: 160px">
        <template #body="{ data: row }: { data: User }">
          <div class="flex flex-wrap gap-1">
            <Tag v-for="role in (row.roles as string[])" :key="role" :value="role" severity="secondary" class="text-xs" />
            <span v-if="!(row.roles as string[])?.length" class="text-xs text-[var(--text-muted)]">—</span>
          </div>
        </template>
      </Column>
      <Column :header="t('users.twoFaAdmin')" style="width: 90px">
        <template #body="{ data: row }: { data: User }">
          <div class="flex items-center gap-1.5">
            <Shield v-if="row.twoFactorEnabled" class="w-4 h-4 text-green-500" v-tooltip.top="t('users.twoFactorEnabled')" />
            <ShieldOff v-else class="w-4 h-4 text-red-400" v-tooltip.top="t('users.twoFaDisabled')" />
          </div>
        </template>
      </Column>
      <Column field="createdAt" :header="t('users.joined')" sortable style="width: 130px">
        <template #body="{ data: row }: { data: User }">
          <span class="text-[var(--text-muted)] text-sm">{{ formatDate(row.createdAt) }}</span>
        </template>
      </Column>
      <Column :header="t('common.actions')" style="width: 100px">
        <template #body="{ data: row }: { data: User }">
          <div class="flex gap-1">
            <Button icon="pi pi-pencil" severity="secondary" text rounded size="small" v-tooltip.top="t('common.edit')" @click="openEditDialog(row)" />
            <Button icon="pi pi-trash" severity="danger" text rounded size="small" v-tooltip.top="t('common.delete')" @click="confirmDeleteUser(row)" />
          </div>
        </template>
      </Column>
      <template #empty>
        <div class="text-center py-10 text-[var(--text-muted)]">{{ t('users.noRows') }}</div>
      </template>
    </DataTable>
  </div>

  <AppDialog v-model:visible="showInviteDialog" :title="t('users.inviteTitle')" :subtitle="t('users.inviteSubtitle')" :loading="isSubmitting">
    <form class="flex flex-col gap-4" @submit.prevent="onInviteSubmit">
      <FormField :label="t('users.fullName')" name="inv-name" :error="inviteForm.errors.value.fullName" required>
        <InputText v-model="invName" v-bind="invNameAttrs" :placeholder="t('users.fullNamePlaceholder')" class="w-full" :disabled="isSubmitting" />
      </FormField>
      <FormField :label="t('users.email')" name="inv-email" :error="inviteForm.errors.value.email" required>
        <InputText v-model="invEmail" v-bind="invEmailAttrs" :placeholder="t('users.emailPlaceholder')" class="w-full" :disabled="isSubmitting" />
      </FormField>
      <FormField :label="t('users.password')" name="inv-password" :error="inviteForm.errors.value.password" required>
        <InputText v-model="invPassword" v-bind="invPasswordAttrs" type="password" :placeholder="t('users.passwordPlaceholder')" class="w-full" :disabled="isSubmitting" />
      </FormField>
      <FormField :label="t('users.rolesLabel')" name="inv-roles">
        <MultiSelect v-model="inviteRoleIds" :options="roleOptions" option-label="label" option-value="value" :placeholder="t('users.rolesPlaceholder')" display="chip" class="w-full" :disabled="isSubmitting" />
      </FormField>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined :disabled="isSubmitting" @click="showInviteDialog = false" />
        <Button :label="t('common.create')" :loading="isSubmitting" @click="onInviteSubmit" />
      </div>
    </template>
  </AppDialog>

  <AppDialog v-model:visible="showEditDialog" :title="t('users.editTitle')" :subtitle="t('users.editSubtitle')" :loading="isEditSubmitting">
    <form class="flex flex-col gap-4" @submit.prevent="onEditSubmit">
      <FormField :label="t('users.fullName')" name="edit-name" :error="editForm.errors.value.fullName" required>
        <InputText v-model="editName" v-bind="editNameAttrs" class="w-full" :disabled="isEditSubmitting" />
      </FormField>
      <FormField :label="t('users.email')" name="edit-email" :error="editForm.errors.value.email" required>
        <InputText v-model="editEmail" v-bind="editEmailAttrs" class="w-full" :disabled="isEditSubmitting" />
      </FormField>
      <FormField :label="t('users.statusLabel')" name="edit-status">
        <Select v-model="editStatus" :options="statusOptions" option-label="label" option-value="value" class="w-full" :disabled="isEditSubmitting" />
      </FormField>
      <FormField :label="t('users.rolesLabel')" name="edit-roles">
        <MultiSelect v-model="editRoleIds" :options="roleOptions" option-label="label" option-value="value" :placeholder="t('users.rolesPlaceholder')" display="chip" class="w-full" :disabled="isEditSubmitting" />
        <p class="text-xs text-[var(--text-muted)] mt-1">{{ t('users.rolesHint') }}</p>
      </FormField>
      <FormField :label="t('users.newPassword')" name="edit-password">
        <InputText v-model="editPassword" v-bind="editPasswordAttrs" type="password" :placeholder="t('users.newPasswordPlaceholder')" class="w-full" :disabled="isEditSubmitting" />
        <p class="text-xs text-[var(--text-muted)] mt-1">{{ t('users.passwordHint') }}</p>
      </FormField>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined :disabled="isEditSubmitting" @click="showEditDialog = false" />
        <Button :label="t('common.save')" :loading="isEditSubmitting" @click="onEditSubmit" />
      </div>
    </template>
  </AppDialog>
</template>
