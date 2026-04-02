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
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import Select from 'primevue/select'
import AppDialog from '@/components/ui/AppDialog.vue'
import FormField from '@/components/ui/FormField.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import { campaignsService } from '@/services/campaigns.service'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import type { Campaign, CampaignStatus, CampaignType } from '@/types/campaign'
import { Send, Mail, MessageSquare, Bell, Smartphone } from 'lucide-vue-next'

const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()
const page = ref(0)
const pageSize = 20
const searchFilter = ref('')

const { data: result, isLoading, isError, refetch } = useQuery({
  queryKey: computed(() => ['campaigns', page.value, searchFilter.value]),
  queryFn: () => campaignsService.list({ page: page.value, size: pageSize, search: searchFilter.value || undefined }),
  staleTime: 15000
})

const campaigns = computed(() => result.value?.content ?? [])
const totalRecords = computed(() => result.value?.totalElements ?? 0)

const typeOptions = [
  { label: 'Email', value: 'EMAIL' },
  { label: 'SMS', value: 'SMS' },
  { label: 'Push Notification', value: 'PUSH' },
  { label: 'In-App', value: 'IN_APP' }
]

function typeIcon(type: CampaignType) {
  const map: Record<CampaignType, typeof Mail> = {
    EMAIL: Mail,
    SMS: Smartphone,
    PUSH: Bell,
    IN_APP: MessageSquare
  }
  return map[type] ?? Mail
}

function statusSeverity(status: CampaignStatus): 'success' | 'warn' | 'danger' | 'secondary' | 'info' {
  const map: Record<CampaignStatus, 'success' | 'warn' | 'danger' | 'secondary' | 'info'> = {
    SENT: 'success',
    SCHEDULED: 'info',
    DRAFT: 'secondary',
    FAILED: 'danger',
    CANCELED: 'warn'
  }
  return map[status] ?? 'secondary'
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  return dayjs(dateStr).format('DD MMM YYYY HH:mm')
}

let searchTimeout: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => { page.value = 0; refetch() }, 400)
}

function onPage(event: { page: number }) {
  page.value = event.page
}

// --- Send campaign ---
function handleSend(campaign: Campaign) {
  confirm.require({
    message: `Send "${campaign.name}" now? This action cannot be undone.`,
    header: 'Send Campaign',
    icon: 'pi pi-send',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Send Now', severity: 'success' },
    accept: async () => {
      try {
        await campaignsService.send(campaign.id)
        await queryClient.invalidateQueries({ queryKey: ['campaigns'] })
        toast.success('Campaign sent', `"${campaign.name}" is now being delivered.`)
      } catch {
        toast.error('Failed to send campaign')
      }
    }
  })
}

// --- Delete ---
function handleDelete(campaign: Campaign) {
  confirm.require({
    message: `Delete "${campaign.name}"? This cannot be undone.`,
    header: 'Delete Campaign',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Delete', severity: 'danger' },
    accept: async () => {
      try {
        await campaignsService.delete(campaign.id)
        await queryClient.invalidateQueries({ queryKey: ['campaigns'] })
        toast.success('Campaign deleted')
      } catch {
        toast.error('Failed to delete campaign')
      }
    }
  })
}

// --- Create dialog ---
const showCreateDialog = ref(false)
const isCreating = ref(false)

const createSchema = z.object({
  name: z.string().min(2, 'Min 2 characters'),
  type: z.string().min(1, 'Required'),
  subject: z.string().optional(),
  body: z.string().min(5, 'Min 5 characters'),
  targetAudience: z.string().optional()
})

const createForm = useForm({
  validationSchema: toTypedSchema(createSchema),
  initialValues: { name: '', type: 'EMAIL', subject: '', body: '', targetAudience: '' }
})

const [nameValue, nameAttrs] = createForm.defineField('name')
const [typeValue, typeAttrs] = createForm.defineField('type')
const [subjectValue, subjectAttrs] = createForm.defineField('subject')
const [bodyValue, bodyAttrs] = createForm.defineField('body')
const [targetValue, targetAttrs] = createForm.defineField('targetAudience')

function openCreateDialog() {
  createForm.resetForm()
  showCreateDialog.value = true
}

const onCreateSubmit = createForm.handleSubmit(async (values) => {
  isCreating.value = true
  try {
    await campaignsService.create({
      name: values.name,
      type: values.type,
      subject: values.subject || undefined,
      body: values.body,
      targetAudience: values.targetAudience || undefined
    })
    await queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    showCreateDialog.value = false
    toast.success('Campaign created')
  } catch {
    toast.error('Failed to create campaign')
  } finally {
    isCreating.value = false
  }
})

// --- Edit dialog ---
const showEditDialog = ref(false)
const editingCampaign = ref<Campaign | null>(null)
const isEditing = ref(false)

const editSchema = z.object({
  name: z.string().min(2, 'Min 2 characters'),
  subject: z.string().optional(),
  body: z.string().min(5, 'Min 5 characters'),
  targetAudience: z.string().optional()
})

const editForm = useForm({
  validationSchema: toTypedSchema(editSchema),
  initialValues: { name: '', subject: '', body: '', targetAudience: '' }
})

const [editNameValue, editNameAttrs] = editForm.defineField('name')
const [editSubjectValue, editSubjectAttrs] = editForm.defineField('subject')
const [editBodyValue, editBodyAttrs] = editForm.defineField('body')
const [editTargetValue, editTargetAttrs] = editForm.defineField('targetAudience')

function openEditDialog(campaign: Campaign) {
  editingCampaign.value = campaign
  editForm.setValues({
    name: campaign.name,
    subject: campaign.subject ?? '',
    body: campaign.body,
    targetAudience: campaign.targetAudience ?? ''
  })
  showEditDialog.value = true
}

const onEditSubmit = editForm.handleSubmit(async (values) => {
  if (!editingCampaign.value) return
  isEditing.value = true
  try {
    await campaignsService.update(editingCampaign.value.id, {
      name: values.name,
      subject: values.subject || undefined,
      body: values.body,
      targetAudience: values.targetAudience || undefined
    })
    await queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    showEditDialog.value = false
    toast.success('Campaign updated')
  } catch {
    toast.error('Failed to update campaign')
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
        <h2 class="text-lg font-semibold text-[var(--text)]">Campaigns</h2>
        <p class="text-sm text-[var(--text-muted)]">{{ totalRecords }} total campaigns</p>
      </div>
      <div class="flex gap-2">
        <Button icon="pi pi-refresh" severity="secondary" outlined @click="refetch()" />
        <Button label="New Campaign" icon="pi pi-plus" @click="openCreateDialog" />
      </div>
    </div>

    <!-- Search -->
    <div class="flex gap-3">
      <InputText
        v-model="searchFilter"
        placeholder="Search campaigns..."
        class="max-w-md"
        @input="onSearch"
      />
    </div>

    <!-- Error state -->
    <div v-if="isError && !isLoading" class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
      <span>Failed to load campaigns. Check your connection or permissions.</span>
      <Button label="Retry" size="small" severity="danger" text @click="refetch()" />
    </div>

    <!-- Skeleton on first load -->
    <SkeletonTable v-if="isLoading && !result" :rows="5" :cols="5" />

    <!-- DataTable -->
    <DataTable
      v-else
      :value="campaigns"
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
      <Column field="name" header="Campaign" sortable style="min-width: 200px">
        <template #body="{ data: row }: { data: Campaign }">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
              <component :is="typeIcon(row.type)" class="w-4 h-4 text-[var(--primary)]" />
            </div>
            <div>
              <p class="text-sm font-medium text-[var(--text)]">{{ row.name }}</p>
              <p v-if="row.subject" class="text-xs text-[var(--text-muted)]">{{ row.subject }}</p>
            </div>
          </div>
        </template>
      </Column>

      <Column field="type" header="Type" style="width: 110px">
        <template #body="{ data: row }: { data: Campaign }">
          <span class="text-xs font-mono bg-[var(--surface-raised)] text-[var(--text-muted)] px-1.5 py-0.5 rounded">
            {{ row.type }}
          </span>
        </template>
      </Column>

      <Column field="status" header="Status" style="width: 120px">
        <template #body="{ data: row }: { data: Campaign }">
          <Tag :severity="statusSeverity(row.status)" :value="row.status" />
        </template>
      </Column>

      <Column field="targetAudience" header="Audience" style="min-width: 140px">
        <template #body="{ data: row }: { data: Campaign }">
          <span class="text-sm text-[var(--text-muted)]">{{ row.targetAudience || '—' }}</span>
        </template>
      </Column>

      <Column field="sentCount" header="Sent / Rate" style="width: 130px">
        <template #body="{ data: row }: { data: Campaign }">
          <div>
            <span class="text-sm text-[var(--text)]">{{ row.sentCount ?? 0 }}</span>
            <span v-if="row.openRate != null" class="text-xs text-[var(--text-muted)] ml-1">({{ row.openRate }}%)</span>
          </div>
        </template>
      </Column>

      <Column field="createdAt" header="Created" sortable style="width: 130px">
        <template #body="{ data: row }: { data: Campaign }">
          <span class="text-sm text-[var(--text-muted)]">{{ formatDate(row.createdAt) }}</span>
        </template>
      </Column>

      <Column header="Actions" style="width: 130px">
        <template #body="{ data: row }: { data: Campaign }">
          <div class="flex items-center gap-1">
            <Button
              icon="pi pi-pencil"
              severity="secondary"
              text
              rounded
              v-tooltip.top="'Edit'"
              :disabled="row.status === 'SENT'"
              @click="openEditDialog(row)"
            />
            <Button
              icon="pi pi-send"
              severity="success"
              text
              rounded
              v-tooltip.top="'Send now'"
              :disabled="row.status === 'SENT' || row.status === 'FAILED'"
              @click="handleSend(row)"
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
        <div class="text-center py-8 text-[var(--text-muted)]">
          <Send class="w-8 h-8 mx-auto mb-2 opacity-30" />
          No campaigns found
        </div>
      </template>
    </DataTable>
  </div>

  <!-- Create Campaign Dialog -->
  <AppDialog
    v-model:visible="showCreateDialog"
    title="New Campaign"
    subtitle="Create a new campaign to reach your audience."
    :loading="isCreating"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onCreateSubmit">
      <FormField label="Campaign Name" name="name" :error="createForm.errors.value.name" required>
        <InputText
          v-model="nameValue"
          v-bind="nameAttrs"
          placeholder="Summer Promo 2025"
          class="w-full"
          :disabled="isCreating"
        />
      </FormField>

      <FormField label="Type" name="type" :error="createForm.errors.value.type" required>
        <Select
          v-model="typeValue"
          v-bind="typeAttrs"
          :options="typeOptions"
          option-label="label"
          option-value="value"
          placeholder="Select type"
          class="w-full"
          :disabled="isCreating"
        />
      </FormField>

      <FormField label="Subject" name="subject" :error="createForm.errors.value.subject">
        <InputText
          v-model="subjectValue"
          v-bind="subjectAttrs"
          placeholder="Email subject line (optional)"
          class="w-full"
          :disabled="isCreating"
        />
      </FormField>

      <FormField label="Message Body" name="body" :error="createForm.errors.value.body" required>
        <Textarea
          v-model="bodyValue"
          v-bind="bodyAttrs"
          placeholder="Write your message here..."
          rows="4"
          class="w-full"
          :disabled="isCreating"
        />
      </FormField>

      <FormField label="Target Audience" name="targetAudience" :error="createForm.errors.value.targetAudience">
        <InputText
          v-model="targetValue"
          v-bind="targetAttrs"
          placeholder="e.g. All clients, VIP users (optional)"
          class="w-full"
          :disabled="isCreating"
        />
      </FormField>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" outlined :disabled="isCreating" @click="showCreateDialog = false" />
        <Button label="Create Campaign" :loading="isCreating" @click="onCreateSubmit" />
      </div>
    </template>
  </AppDialog>

  <!-- Edit Campaign Dialog -->
  <AppDialog
    v-model:visible="showEditDialog"
    title="Edit Campaign"
    subtitle="Update campaign details."
    :loading="isEditing"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onEditSubmit">
      <FormField label="Campaign Name" name="edit-name" :error="editForm.errors.value.name" required>
        <InputText
          v-model="editNameValue"
          v-bind="editNameAttrs"
          placeholder="Campaign name"
          class="w-full"
          :disabled="isEditing"
        />
      </FormField>

      <FormField label="Subject" name="edit-subject" :error="editForm.errors.value.subject">
        <InputText
          v-model="editSubjectValue"
          v-bind="editSubjectAttrs"
          placeholder="Email subject line (optional)"
          class="w-full"
          :disabled="isEditing"
        />
      </FormField>

      <FormField label="Message Body" name="edit-body" :error="editForm.errors.value.body" required>
        <Textarea
          v-model="editBodyValue"
          v-bind="editBodyAttrs"
          rows="4"
          class="w-full"
          :disabled="isEditing"
        />
      </FormField>

      <FormField label="Target Audience" name="edit-target" :error="editForm.errors.value.targetAudience">
        <InputText
          v-model="editTargetValue"
          v-bind="editTargetAttrs"
          placeholder="e.g. All clients, VIP users"
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
