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
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import AppDialog from '@/components/ui/AppDialog.vue'
import FormField from '@/components/ui/FormField.vue'
import { tenantsService } from '@/services/tenants.service'
import { useToast } from '@/composables/useToast'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import dayjs from 'dayjs'
import type { Tenant } from '@/types/tenant'

const toast = useToast()
const queryClient = useQueryClient()
const confirm = useConfirm()

const page = ref(0)
const pageSize = 20
const globalFilter = ref('')
const actionLoading = ref<string | null>(null)

const { data: result, isLoading, isError, refetch } = useQuery({
  queryKey: computed(() => ['tenants', page.value]),
  queryFn: () => tenantsService.list({ page: page.value, size: pageSize }),
  staleTime: 15000
})

const tenants = computed(() => result.value?.content ?? [])
const totalRecords = computed(() => result.value?.totalElements ?? 0)

const filteredTenants = computed(() => {
  const q = globalFilter.value.trim().toLowerCase()
  if (!q) return tenants.value
  return tenants.value.filter(t =>
    t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
  )
})

function statusSeverity(status: Tenant['status']): 'success' | 'warn' | 'secondary' {
  const map: Record<string, 'success' | 'warn' | 'secondary'> = {
    ACTIVE: 'success',
    SUSPENDED: 'warn',
    INACTIVE: 'secondary'
  }
  return map[status] ?? 'secondary'
}

function formatDate(dateStr: string) {
  return dayjs(dateStr).format('DD MMM YYYY')
}

function onPage(event: { page: number }) {
  page.value = event.page
}

function suspendTenant(tenant: Tenant) {
  confirm.require({
    message: `Suspend "${tenant.name}"? They will lose access.`,
    header: 'Suspend Tenant',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Suspend', severity: 'warn' },
    accept: async () => {
      actionLoading.value = tenant.id
      try {
        await tenantsService.suspend(tenant.id)
        await queryClient.invalidateQueries({ queryKey: ['tenants'] })
        toast.success('Tenant suspended', `"${tenant.name}" has been suspended.`)
      } catch {
        toast.error('Failed to suspend tenant')
      } finally {
        actionLoading.value = null
      }
    }
  })
}

function reactivateTenant(tenant: Tenant) {
  confirm.require({
    message: `Reactivate "${tenant.name}"?`,
    header: 'Reactivate Tenant',
    icon: 'pi pi-check-circle',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Reactivate', severity: 'success' },
    accept: async () => {
      actionLoading.value = tenant.id
      try {
        await tenantsService.reactivate(tenant.id)
        await queryClient.invalidateQueries({ queryKey: ['tenants'] })
        toast.success('Tenant reactivated', `"${tenant.name}" is now active.`)
      } catch {
        toast.error('Failed to reactivate tenant')
      } finally {
        actionLoading.value = null
      }
    }
  })
}

// --- Create Tenant ---
const showCreateDialog = ref(false)
const isCreating = ref(false)

const tenantSchema = z.object({
  name: z.string().min(2, 'Min 2 characters'),
  slug: z.string().optional()
})

const createForm = useForm({
  validationSchema: toTypedSchema(tenantSchema),
  initialValues: { name: '', slug: '' }
})

const [createName, createNameAttrs] = createForm.defineField('name')
const [createSlug, createSlugAttrs] = createForm.defineField('slug')

function openCreateDialog() {
  createForm.resetForm()
  showCreateDialog.value = true
}

const onCreateSubmit = createForm.handleSubmit(async (values) => {
  isCreating.value = true
  try {
    await tenantsService.create({ name: values.name, slug: values.slug || undefined })
    await queryClient.invalidateQueries({ queryKey: ['tenants'] })
    showCreateDialog.value = false
    toast.success('Tenant created')
  } catch {
    toast.error('Failed to create tenant')
  } finally {
    isCreating.value = false
  }
})

// --- Edit Tenant ---
const showEditDialog = ref(false)
const editingTenant = ref<Tenant | null>(null)
const isEditing = ref(false)

const editForm = useForm({
  validationSchema: toTypedSchema(tenantSchema),
  initialValues: { name: '', slug: '' }
})

const [editName, editNameAttrs] = editForm.defineField('name')
const [editSlug, editSlugAttrs] = editForm.defineField('slug')

function openEditDialog(tenant: Tenant) {
  editingTenant.value = tenant
  editForm.setValues({ name: tenant.name, slug: tenant.slug ?? '' })
  showEditDialog.value = true
}

const onEditSubmit = editForm.handleSubmit(async (values) => {
  if (!editingTenant.value) return
  isEditing.value = true
  try {
    await tenantsService.update(editingTenant.value.id, { name: values.name, slug: values.slug || undefined })
    await queryClient.invalidateQueries({ queryKey: ['tenants'] })
    showEditDialog.value = false
    toast.success('Tenant updated')
  } catch {
    toast.error('Failed to update tenant')
  } finally {
    isEditing.value = false
  }
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-[var(--text)]">Tenants</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ totalRecords }} total tenants</p>
      </div>
      <div class="flex gap-2">
        <Button icon="pi pi-refresh" severity="secondary" outlined @click="queryClient.invalidateQueries({ queryKey: ['tenants'] })" />
        <Button label="New Tenant" icon="pi pi-plus" @click="openCreateDialog" />
      </div>
    </div>

    <!-- Search -->
    <div class="flex gap-3">
      <InputText
        v-model="globalFilter"
        placeholder="Search tenants..."
        class="max-w-md"
      />
    </div>

    <!-- Error state -->
    <div v-if="isError && !isLoading" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
      <span>Failed to load tenants. Check your connection or permissions.</span>
      <Button label="Retry" size="small" severity="danger" text @click="refetch()" />
    </div>

    <!-- Skeleton on first load -->
    <SkeletonTable v-if="isLoading && !result" :rows="5" :cols="4" />

    <!-- DataTable -->
    <DataTable
      v-else
      :value="filteredTenants"
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
        <template #body="{ data: row }: { data: Tenant }">
          <p class="text-sm font-medium text-[var(--text)]">{{ row.name }}</p>
        </template>
      </Column>

      <Column field="slug" header="Slug" style="min-width: 140px">
        <template #body="{ data: row }: { data: Tenant }">
          <span class="text-sm font-mono text-[var(--text-muted)]">{{ row.slug }}</span>
        </template>
      </Column>

      <Column field="status" header="Status" style="width: 120px">
        <template #body="{ data: row }: { data: Tenant }">
          <Tag :severity="statusSeverity(row.status)" :value="row.status" />
        </template>
      </Column>

      <Column field="createdAt" header="Created" sortable style="width: 140px">
        <template #body="{ data: row }: { data: Tenant }">
          <span class="text-[var(--text-muted)] text-sm">{{ formatDate(row.createdAt) }}</span>
        </template>
      </Column>

      <Column header="Actions" style="width: 140px">
        <template #body="{ data: row }: { data: Tenant }">
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
              v-if="row.status === 'ACTIVE'"
              icon="pi pi-pause"
              severity="warn"
              text
              rounded
              v-tooltip.top="'Suspend'"
              :loading="actionLoading === row.id"
              @click="suspendTenant(row)"
            />
            <Button
              v-else-if="row.status === 'SUSPENDED'"
              icon="pi pi-play"
              severity="success"
              text
              rounded
              v-tooltip.top="'Reactivate'"
              :loading="actionLoading === row.id"
              @click="reactivateTenant(row)"
            />
          </div>
        </template>
      </Column>

      <template #empty>
        <div class="text-center py-8 text-[var(--text-muted)]">No tenants found</div>
      </template>
    </DataTable>
  </div>

  <!-- Create Tenant Dialog -->
  <AppDialog
    v-model:visible="showCreateDialog"
    title="New Tenant"
    subtitle="Fill in the details to create a new tenant."
    :loading="isCreating"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onCreateSubmit">
      <FormField label="Name" name="name" :error="createForm.errors.value.name" required>
        <InputText
          id="tenant-name"
          v-model="createName"
          v-bind="createNameAttrs"
          placeholder="Tenant name"
          class="w-full"
          :disabled="isCreating"
        />
      </FormField>
      <FormField label="Slug" name="slug" :error="createForm.errors.value.slug">
        <InputText
          id="tenant-slug"
          v-model="createSlug"
          v-bind="createSlugAttrs"
          placeholder="tenant-slug (optional)"
          class="w-full"
          :disabled="isCreating"
        />
      </FormField>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" outlined :disabled="isCreating" @click="showCreateDialog = false" />
        <Button label="Create Tenant" :loading="isCreating" @click="onCreateSubmit" />
      </div>
    </template>
  </AppDialog>

  <!-- Edit Tenant Dialog -->
  <AppDialog
    v-model:visible="showEditDialog"
    title="Edit Tenant"
    subtitle="Update tenant information."
    :loading="isEditing"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onEditSubmit">
      <FormField label="Name" name="edit-name" :error="editForm.errors.value.name" required>
        <InputText
          id="edit-tenant-name"
          v-model="editName"
          v-bind="editNameAttrs"
          placeholder="Tenant name"
          class="w-full"
          :disabled="isEditing"
        />
      </FormField>
      <FormField label="Slug" name="edit-slug" :error="editForm.errors.value.slug">
        <InputText
          id="edit-tenant-slug"
          v-model="editSlug"
          v-bind="editSlugAttrs"
          placeholder="tenant-slug (optional)"
          class="w-full"
          :disabled="isEditing"
        />
      </FormField>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" outlined :disabled="isEditing" @click="showEditDialog = false" />
        <Button label="Save Changes" :loading="isEditing" @click="onEditSubmit" />
      </div>
    </template>
  </AppDialog>
</template>
