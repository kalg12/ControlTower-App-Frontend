<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useForm } from 'vee-validate'
import { useConfirm } from 'primevue/useconfirm'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Button from 'primevue/button'
import AppDialog from '@/components/ui/AppDialog.vue'
import FormField from '@/components/ui/FormField.vue'
import { clientsService } from '@/services/clients.service'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import type { Client, ClientBranch, ClientContact, CreateContactRequest } from '@/types/client'

const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()

const id = computed(() => route.params.id as string)

const { data: client, isLoading: clientLoading, isError: clientError } = useQuery({
  queryKey: computed(() => ['client', id.value]),
  queryFn: () => clientsService.getById(id.value),
  staleTime: 15000
})

const { data: branches, isLoading: branchesLoading } = useQuery({
  queryKey: computed(() => ['branches', id.value]),
  queryFn: () => clientsService.getBranches(id.value),
  staleTime: 15000,
  enabled: computed(() => !!id.value)
})

const { data: contacts, isLoading: contactsLoading } = useQuery({
  queryKey: computed(() => ['contacts', id.value]),
  queryFn: () => clientsService.getContacts(id.value),
  staleTime: 15000,
  enabled: computed(() => !!id.value)
})

function statusSeverity(status?: string): 'success' | 'warn' | 'danger' | 'secondary' {
  if (!status) return 'secondary'
  if (status === 'ACTIVE') return 'success'
  if (status === 'INACTIVE') return 'secondary'
  if (status === 'SUSPENDED') return 'danger'
  return 'secondary'
}

function formatDate(dateStr: string) {
  return dayjs(dateStr).format('DD MMM YYYY')
}

// --- Edit Client Modal ---
const showEditDialog = ref(false)
const isEditSubmitting = ref(false)

const clientSchema = z.object({
  name:      z.string().min(2, 'Min 2 characters'),
  legalName: z.string().optional(),
  taxId:     z.string().optional(),
  country:   z.string().min(2),
  website:   z.string().url('Must be a valid URL').optional().or(z.literal('')),
  industry:  z.string().optional(),
  segment:   z.enum(['', 'SMB', 'MID_MARKET', 'ENTERPRISE']).optional(),
  notes:     z.string().optional(),
})

const editForm = useForm({
  validationSchema: toTypedSchema(clientSchema),
  initialValues: { name: '', legalName: '', taxId: '', country: 'MX', website: '', industry: '', segment: '' as '', notes: '' }
})

const [editName, editNameAttrs]       = editForm.defineField('name')
const [editLegalName, editLegalNameAttrs] = editForm.defineField('legalName')
const [editTaxId, editTaxIdAttrs]     = editForm.defineField('taxId')
const [editCountry, editCountryAttrs] = editForm.defineField('country')
const [editWebsite, editWebsiteAttrs] = editForm.defineField('website')
const [editIndustry, editIndustryAttrs] = editForm.defineField('industry')
const [editSegment]                   = editForm.defineField('segment')
const [editNotes, editNotesAttrs]     = editForm.defineField('notes')

function openEditDialog(c: Client) {
  editForm.setValues({
    name:      c.name,
    legalName: c.legalName ?? '',
    taxId:     c.taxId ?? '',
    country:   c.country ?? 'MX',
    website:   c.website ?? '',
    industry:  c.industry ?? '',
    segment:   (c.segment ?? '') as '',
    notes:     c.notes ?? '',
  })
  showEditDialog.value = true
}

const onEditSubmit = editForm.handleSubmit(async (values) => {
  isEditSubmitting.value = true
  try {
    await clientsService.update(id.value, {
      name:      values.name,
      legalName: values.legalName || undefined,
      taxId:     values.taxId || undefined,
      country:   values.country,
      website:   values.website || undefined,
      industry:  values.industry || undefined,
      segment:   values.segment || undefined,
      notes:     values.notes || undefined,
    })
    await queryClient.invalidateQueries({ queryKey: ['client', id.value] })
    await queryClient.invalidateQueries({ queryKey: ['clients'] })
    showEditDialog.value = false
    toast.success('Client updated')
  } catch {
    toast.error('Failed to update client')
  } finally {
    isEditSubmitting.value = false
  }
})

// --- Add Branch Modal ---
const showBranchDialog = ref(false)
const isSubmittingBranch = ref(false)

const branchSchema = z.object({
  name: z.string().min(2, 'Min 2 characters'),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().min(2),
  timezone: z.string().min(1)
})

const branchForm = useForm({
  validationSchema: toTypedSchema(branchSchema),
  initialValues: { name: '', address: '', city: '', country: 'MX', timezone: 'America/Mexico_City' }
})

const [branchNameValue, branchNameAttrs] = branchForm.defineField('name')
const [addressValue, addressAttrs] = branchForm.defineField('address')
const [cityValue, cityAttrs] = branchForm.defineField('city')
const [countryValue, countryAttrs] = branchForm.defineField('country')
const [timezoneValue, timezoneAttrs] = branchForm.defineField('timezone')

function openBranchDialog() {
  branchForm.resetForm()
  showBranchDialog.value = true
}

const onSubmitBranch = branchForm.handleSubmit(async (values) => {
  isSubmittingBranch.value = true
  try {
    await clientsService.createBranch(id.value, {
      name: values.name,
      address: values.address || undefined,
      city: values.city || undefined,
      country: values.country,
      timezone: values.timezone
    })
    await queryClient.invalidateQueries({ queryKey: ['branches', id.value] })
    showBranchDialog.value = false
    toast.success('Branch created successfully')
  } catch {
    toast.error('Failed to create branch')
  } finally {
    isSubmittingBranch.value = false
  }
})

// --- Edit Branch Modal ---
const showEditBranchDialog = ref(false)
const editingBranch = ref<ClientBranch | null>(null)
const isEditingBranch = ref(false)

const editBranchSchema = z.object({
  name: z.string().min(2, 'Min 2 characters'),
  address: z.string().optional(),
  city: z.string().optional(),
  isActive: z.boolean()
})

const editBranchForm = useForm({
  validationSchema: toTypedSchema(editBranchSchema),
  initialValues: { name: '', address: '', city: '', isActive: true }
})

const [ebName, ebNameAttrs] = editBranchForm.defineField('name')
const [ebAddress, ebAddressAttrs] = editBranchForm.defineField('address')
const [ebCity, ebCityAttrs] = editBranchForm.defineField('city')
const [ebIsActive] = editBranchForm.defineField('isActive')

function openEditBranchDialog(branch: ClientBranch) {
  editingBranch.value = branch
  editBranchForm.setValues({
    name: branch.name,
    address: branch.address ?? '',
    city: branch.city ?? '',
    isActive: branch.isActive ?? true
  })
  showEditBranchDialog.value = true
}

const onEditBranchSubmit = editBranchForm.handleSubmit(async (values) => {
  if (!editingBranch.value) return
  isEditingBranch.value = true
  try {
    await clientsService.updateBranch(id.value, editingBranch.value.id, {
      name: values.name,
      address: values.address || undefined,
      city: values.city || undefined,
      isActive: values.isActive
    })
    await queryClient.invalidateQueries({ queryKey: ['branches', id.value] })
    showEditBranchDialog.value = false
    toast.success('Branch updated')
  } catch {
    toast.error('Failed to update branch')
  } finally {
    isEditingBranch.value = false
  }
})

// --- Contacts ---
const showContactDialog  = ref(false)
const editingContact     = ref<ClientContact | null>(null)
const isSubmittingContact = ref(false)

const contactRoleOptions = [
  { label: 'Owner',     value: 'OWNER' },
  { label: 'Technical', value: 'TECHNICAL' },
  { label: 'Billing',   value: 'BILLING' },
  { label: 'Support',   value: 'SUPPORT' },
]

const contactSchema = z.object({
  fullName: z.string().min(2, 'Min 2 characters'),
  email:    z.string().email('Invalid email').optional().or(z.literal('')),
  phone:    z.string().optional(),
  role:     z.string().min(1, 'Select a role'),
  primary:  z.boolean(),
  notes:    z.string().optional(),
})

const contactForm = useForm({
  validationSchema: toTypedSchema(contactSchema),
  initialValues: { fullName: '', email: '', phone: '', role: 'OWNER', primary: false, notes: '' },
})

const [cfFullName, cfFullNameAttrs] = contactForm.defineField('fullName')
const [cfEmail,    cfEmailAttrs]    = contactForm.defineField('email')
const [cfPhone,    cfPhoneAttrs]    = contactForm.defineField('phone')
const [cfRole]                      = contactForm.defineField('role')
const [cfPrimary]                   = contactForm.defineField('primary')
const [cfNotes,    cfNotesAttrs]    = contactForm.defineField('notes')

function openAddContact() {
  editingContact.value = null
  contactForm.resetForm()
  showContactDialog.value = true
}

function openEditContact(c: ClientContact) {
  editingContact.value = c
  contactForm.setValues({ fullName: c.fullName, email: c.email ?? '', phone: c.phone ?? '', role: c.role, primary: c.primary, notes: c.notes ?? '' })
  showContactDialog.value = true
}

const onSubmitContact = contactForm.handleSubmit(async (values) => {
  isSubmittingContact.value = true
  const payload: CreateContactRequest = { fullName: values.fullName, email: values.email || undefined, phone: values.phone || undefined, role: values.role, primary: values.primary, notes: values.notes || undefined }
  try {
    if (editingContact.value) {
      await clientsService.updateContact(id.value, editingContact.value.id, payload)
    } else {
      await clientsService.addContact(id.value, payload)
    }
    await queryClient.invalidateQueries({ queryKey: ['contacts', id.value] })
    await queryClient.invalidateQueries({ queryKey: ['client', id.value] })
    showContactDialog.value = false
    toast.success(editingContact.value ? 'Contact updated' : 'Contact added')
  } catch {
    toast.error('Failed to save contact')
  } finally {
    isSubmittingContact.value = false
  }
})

function confirmDeleteContact(c: ClientContact) {
  confirm.require({
    message: `Remove ${c.fullName} from this client?`,
    header: 'Remove Contact',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Remove', severity: 'danger' },
    accept: async () => {
      try {
        await clientsService.deleteContact(id.value, c.id)
        await queryClient.invalidateQueries({ queryKey: ['contacts', id.value] })
        await queryClient.invalidateQueries({ queryKey: ['client', id.value] })
        toast.success('Contact removed')
      } catch {
        toast.error('Failed to remove contact')
      }
    }
  })
}

// --- Delete Branch ---
function confirmDeleteBranch(branch: ClientBranch) {
  confirm.require({
    message: `Delete branch "${branch.name}"? This cannot be undone.`,
    header: 'Delete Branch',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Delete', severity: 'danger' },
    accept: async () => {
      try {
        await clientsService.deleteBranch(id.value, branch.id)
        await queryClient.invalidateQueries({ queryKey: ['branches', id.value] })
        toast.success('Branch deleted')
      } catch {
        toast.error('Failed to delete branch')
      }
    }
  })
}
</script>

<template>
  <div class="space-y-6">
    <!-- Back + Actions -->
    <div class="flex items-center justify-between gap-4">
      <Button
        icon="pi pi-arrow-left"
        label="Back to Clients"
        severity="secondary"
        text
        @click="router.push('/clients')"
      />
      <Button
        v-if="client && !clientLoading"
        icon="pi pi-pencil"
        label="Edit Client"
        severity="secondary"
        outlined
        @click="openEditDialog(client)"
      />
    </div>

    <!-- Error state -->
    <div v-if="clientError" class="flex flex-col items-center py-16 gap-4">
      <p class="text-[var(--text-muted)]">Client not found.</p>
      <Button label="Back to Clients" @click="router.push('/clients')" />
    </div>

    <!-- Loading state -->
    <template v-else-if="clientLoading">
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-3">
        <Skeleton height="2rem" class="mb-2" />
        <Skeleton height="1rem" width="60%" />
        <Skeleton height="1rem" width="40%" />
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <Skeleton height="3rem" v-for="i in 4" :key="i" />
        </div>
      </div>
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-3">
        <Skeleton height="1.5rem" width="30%" class="mb-4" />
        <Skeleton height="1rem" v-for="i in 4" :key="i" />
      </div>
    </template>

    <!-- Content -->
    <template v-else-if="client">
      <!-- Client Info Card -->
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h1 class="text-xl font-semibold text-[var(--text)]">{{ client.name }}</h1>
            <p v-if="client.legalName" class="text-sm text-[var(--text-muted)] mt-0.5">{{ client.legalName }}</p>
          </div>
          <Tag :severity="statusSeverity(client.status)" :value="client.status ?? 'N/A'" />
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Tax ID / RFC</p>
            <p class="text-sm font-mono text-[var(--text)]">{{ client.taxId ?? '—' }}</p>
          </div>
          <div>
            <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Country</p>
            <p class="text-sm text-[var(--text)]">{{ client.country ?? '—' }}</p>
          </div>
          <div>
            <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Created</p>
            <p class="text-sm text-[var(--text)]">{{ formatDate(client.createdAt) }}</p>
          </div>
          <div v-if="client.notes">
            <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Notes</p>
            <p class="text-sm text-[var(--text)] line-clamp-2">{{ client.notes }}</p>
          </div>
        </div>
      </div>

      <!-- CRM fields row -->
      <div v-if="client.website || client.industry || client.segment || client.notes" class="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div v-if="client.industry">
          <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Industry</p>
          <p class="text-sm text-[var(--text)]">{{ client.industry }}</p>
        </div>
        <div v-if="client.segment">
          <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Segment</p>
          <p class="text-sm text-[var(--text)]">{{ client.segment.replace('_', ' ') }}</p>
        </div>
        <div v-if="client.website">
          <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Website</p>
          <a :href="client.website" target="_blank" rel="noopener" class="text-sm text-[var(--primary)] hover:underline truncate block">{{ client.website }}</a>
        </div>
        <div v-if="client.notes" class="col-span-2 md:col-span-1">
          <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Notes</p>
          <p class="text-sm text-[var(--text)] line-clamp-3">{{ client.notes }}</p>
        </div>
      </div>

      <!-- Contacts Section -->
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-semibold text-[var(--text)]">
            Contacts
            <span v-if="contacts?.length" class="text-[var(--text-muted)] font-normal text-sm ml-1">({{ contacts.length }})</span>
          </h2>
          <Button label="Add Contact" icon="pi pi-user-plus" size="small" @click="openAddContact" />
        </div>

        <template v-if="contactsLoading">
          <Skeleton height="1rem" v-for="i in 3" :key="i" class="mb-2" />
        </template>

        <DataTable v-else :value="contacts ?? []" striped-rows class="rounded-xl overflow-hidden">
          <Column field="fullName" header="Name" style="min-width: 160px">
            <template #body="{ data: row }: { data: ClientContact }">
              <div class="flex items-center gap-2">
                <span class="font-medium text-[var(--text)]">{{ row.fullName }}</span>
                <Tag v-if="row.primary" value="Primary" severity="success" class="text-xs" />
              </div>
            </template>
          </Column>
          <Column field="role" header="Role" style="width: 120px">
            <template #body="{ data: row }: { data: ClientContact }">
              <Tag :value="row.role" severity="secondary" />
            </template>
          </Column>
          <Column field="email" header="Email" style="min-width: 180px">
            <template #body="{ data: row }: { data: ClientContact }">
              <a v-if="row.email" :href="`mailto:${row.email}`" class="text-sm text-[var(--primary)] hover:underline">{{ row.email }}</a>
              <span v-else class="text-[var(--text-muted)] text-sm">—</span>
            </template>
          </Column>
          <Column field="phone" header="Phone" style="width: 140px">
            <template #body="{ data: row }: { data: ClientContact }">
              <span class="text-sm text-[var(--text-muted)]">{{ row.phone ?? '—' }}</span>
            </template>
          </Column>
          <Column field="notes" header="Notes" style="min-width: 160px">
            <template #body="{ data: row }: { data: ClientContact }">
              <span class="text-sm text-[var(--text-muted)] line-clamp-1">{{ row.notes ?? '—' }}</span>
            </template>
          </Column>
          <Column header="Actions" style="width: 100px">
            <template #body="{ data: row }: { data: ClientContact }">
              <div class="flex gap-1">
                <Button icon="pi pi-pencil" severity="secondary" text rounded size="small" v-tooltip.top="'Edit'" @click="openEditContact(row)" />
                <Button icon="pi pi-trash" severity="danger" text rounded size="small" v-tooltip.top="'Remove'" @click="confirmDeleteContact(row)" />
              </div>
            </template>
          </Column>
          <template #empty>
            <div class="text-center py-6 text-[var(--text-muted)]">No contacts yet — click "Add Contact" to add one</div>
          </template>
        </DataTable>
      </div>

      <!-- Branches Section -->
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-semibold text-[var(--text)]">
            Branches
            <span v-if="branches?.length" class="text-[var(--text-muted)] font-normal text-sm ml-1">({{ branches.length }})</span>
          </h2>
          <Button label="Add Branch" icon="pi pi-plus" @click="openBranchDialog" />
        </div>

        <template v-if="branchesLoading">
          <Skeleton height="1rem" v-for="i in 4" :key="i" class="mb-2" />
        </template>

        <DataTable
          v-else
          :value="branches ?? []"
          striped-rows
          class="rounded-xl overflow-hidden"
        >
          <Column field="name" header="Name" style="min-width: 160px">
            <template #body="{ data: row }: { data: ClientBranch }">
              <span class="font-medium text-[var(--text)]">{{ row.name }}</span>
            </template>
          </Column>

          <Column field="slug" header="Slug" style="min-width: 140px">
            <template #body="{ data: row }: { data: ClientBranch }">
              <span class="text-[var(--text-muted)] text-sm font-mono">{{ row.slug ?? '—' }}</span>
            </template>
          </Column>

          <Column field="city" header="City" style="width: 130px">
            <template #body="{ data: row }: { data: ClientBranch }">
              <span class="text-[var(--text-muted)] text-sm">{{ row.city ?? '—' }}</span>
            </template>
          </Column>

          <Column field="isActive" header="Status" style="width: 100px">
            <template #body="{ data: row }: { data: ClientBranch }">
              <Tag :severity="row.isActive ? 'success' : 'secondary'" :value="row.isActive ? 'Active' : 'Inactive'" />
            </template>
          </Column>

          <Column header="Actions" style="width: 110px">
            <template #body="{ data: row }: { data: ClientBranch }">
              <div class="flex gap-1">
                <Button
                  icon="pi pi-pencil"
                  severity="secondary"
                  text
                  rounded
                  v-tooltip.top="'Edit branch'"
                  @click="openEditBranchDialog(row)"
                />
                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  rounded
                  v-tooltip.top="'Delete branch'"
                  @click="confirmDeleteBranch(row)"
                />
              </div>
            </template>
          </Column>

          <template #empty>
            <div class="text-center py-8 text-[var(--text-muted)]">No branches found</div>
          </template>
        </DataTable>
      </div>
    </template>
  </div>

  <!-- Edit Client Dialog -->
  <AppDialog
    v-model:visible="showEditDialog"
    title="Edit Client"
    subtitle="Update client information."
    :loading="isEditSubmitting"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onEditSubmit">
      <FormField label="Name" name="edit-name" :error="editForm.errors.value.name" required>
        <InputText id="edit-name" v-model="editName" v-bind="editNameAttrs" placeholder="Client name" class="w-full" :disabled="isEditSubmitting" />
      </FormField>
      <FormField label="Legal Name" name="edit-legalName" :error="editForm.errors.value.legalName">
        <InputText id="edit-legalName" v-model="editLegalName" v-bind="editLegalNameAttrs" placeholder="Legal name (optional)" class="w-full" :disabled="isEditSubmitting" />
      </FormField>
      <FormField label="Tax ID / RFC" name="edit-taxId" :error="editForm.errors.value.taxId">
        <InputText id="edit-taxId" v-model="editTaxId" v-bind="editTaxIdAttrs" placeholder="Tax ID (optional)" class="w-full" :disabled="isEditSubmitting" />
      </FormField>
      <FormField label="Country" name="edit-country" :error="editForm.errors.value.country" required>
        <InputText id="edit-country" v-model="editCountry" v-bind="editCountryAttrs" placeholder="e.g. MX" class="w-full" :disabled="isEditSubmitting" />
      </FormField>
      <FormField label="Website" name="edit-website" :error="editForm.errors.value.website">
        <InputText id="edit-website" v-model="editWebsite" v-bind="editWebsiteAttrs" placeholder="https://example.com" class="w-full" :disabled="isEditSubmitting" />
      </FormField>
      <div class="grid grid-cols-2 gap-3">
        <FormField label="Industry" name="edit-industry" :error="editForm.errors.value.industry">
          <InputText id="edit-industry" v-model="editIndustry" v-bind="editIndustryAttrs" placeholder="e.g. Restaurant" class="w-full" :disabled="isEditSubmitting" />
        </FormField>
        <FormField label="Segment" name="edit-segment">
          <Select
            v-model="editSegment"
            :options="[{ label: '— None —', value: '' }, { label: 'SMB', value: 'SMB' }, { label: 'Mid-Market', value: 'MID_MARKET' }, { label: 'Enterprise', value: 'ENTERPRISE' }]"
            option-label="label"
            option-value="value"
            class="w-full"
            :disabled="isEditSubmitting"
          />
        </FormField>
      </div>
      <FormField label="Notes" name="edit-notes" :error="editForm.errors.value.notes">
        <Textarea id="edit-notes" v-model="editNotes" v-bind="editNotesAttrs" placeholder="Internal notes about this client..." :rows="3" class="w-full" :disabled="isEditSubmitting" />
      </FormField>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" outlined :disabled="isEditSubmitting" @click="showEditDialog = false" />
        <Button label="Save Changes" :loading="isEditSubmitting" @click="onEditSubmit" />
      </div>
    </template>
  </AppDialog>

  <!-- Edit Branch Dialog -->
  <AppDialog
    v-model:visible="showEditBranchDialog"
    title="Edit Branch"
    subtitle="Update branch details."
    :loading="isEditingBranch"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onEditBranchSubmit">
      <FormField label="Branch Name" name="eb-name" :error="editBranchForm.errors.value.name" required>
        <InputText id="eb-name" v-model="ebName" v-bind="ebNameAttrs" placeholder="Branch name" class="w-full" :disabled="isEditingBranch" />
      </FormField>
      <FormField label="Address" name="eb-address" :error="editBranchForm.errors.value.address">
        <InputText id="eb-address" v-model="ebAddress" v-bind="ebAddressAttrs" placeholder="Address (optional)" class="w-full" :disabled="isEditingBranch" />
      </FormField>
      <FormField label="City" name="eb-city" :error="editBranchForm.errors.value.city">
        <InputText id="eb-city" v-model="ebCity" v-bind="ebCityAttrs" placeholder="City (optional)" class="w-full" :disabled="isEditingBranch" />
      </FormField>
      <div class="flex items-center justify-between py-2">
        <div>
          <p class="text-sm font-medium text-[var(--text)]">Active</p>
          <p class="text-xs text-[var(--text-muted)]">Branch is operational</p>
        </div>
        <button
          type="button"
          :class="['relative w-11 h-6 rounded-full transition-colors duration-200', ebIsActive ? 'bg-[var(--primary)]' : 'bg-[var(--border)]']"
          @click="ebIsActive = !ebIsActive"
        >
          <span :class="['absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200', ebIsActive ? 'translate-x-5' : 'translate-x-0.5']" />
        </button>
      </div>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" outlined :disabled="isEditingBranch" @click="showEditBranchDialog = false" />
        <Button label="Save Changes" :loading="isEditingBranch" @click="onEditBranchSubmit" />
      </div>
    </template>
  </AppDialog>

  <!-- Add / Edit Contact Dialog -->
  <AppDialog
    v-model:visible="showContactDialog"
    :title="editingContact ? 'Edit Contact' : 'Add Contact'"
    :loading="isSubmittingContact"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onSubmitContact">
      <FormField label="Full Name" name="cf-fullName" :error="contactForm.errors.value.fullName" required>
        <InputText v-model="cfFullName" v-bind="cfFullNameAttrs" placeholder="John Doe" class="w-full" :disabled="isSubmittingContact" />
      </FormField>
      <div class="grid grid-cols-2 gap-3">
        <FormField label="Email" name="cf-email" :error="contactForm.errors.value.email">
          <InputText v-model="cfEmail" v-bind="cfEmailAttrs" placeholder="john@example.com" class="w-full" :disabled="isSubmittingContact" />
        </FormField>
        <FormField label="Phone" name="cf-phone" :error="contactForm.errors.value.phone">
          <InputText v-model="cfPhone" v-bind="cfPhoneAttrs" placeholder="+52 55 1234 5678" class="w-full" :disabled="isSubmittingContact" />
        </FormField>
      </div>
      <FormField label="Role" name="cf-role" :error="contactForm.errors.value.role" required>
        <Select v-model="cfRole" :options="contactRoleOptions" option-label="label" option-value="value" class="w-full" :disabled="isSubmittingContact" />
      </FormField>
      <FormField label="Notes" name="cf-notes">
        <Textarea v-model="cfNotes" v-bind="cfNotesAttrs" placeholder="e.g. Call before noon, handles billing" :rows="2" class="w-full" :disabled="isSubmittingContact" />
      </FormField>
      <div class="flex items-center gap-3 py-1">
        <button
          type="button"
          :class="['relative w-11 h-6 rounded-full transition-colors duration-200', cfPrimary ? 'bg-[var(--primary)]' : 'bg-[var(--border)]']"
          :disabled="isSubmittingContact"
          @click="cfPrimary = !cfPrimary"
        >
          <span :class="['absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200', cfPrimary ? 'translate-x-5' : 'translate-x-0.5']" />
        </button>
        <div>
          <p class="text-sm font-medium text-[var(--text)]">Primary contact</p>
          <p class="text-xs text-[var(--text-muted)]">Marks this person as the main point of contact</p>
        </div>
      </div>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" outlined :disabled="isSubmittingContact" @click="showContactDialog = false" />
        <Button :label="editingContact ? 'Save Changes' : 'Add Contact'" :loading="isSubmittingContact" @click="onSubmitContact" />
      </div>
    </template>
  </AppDialog>

  <!-- Add Branch Dialog -->
  <AppDialog
    v-model:visible="showBranchDialog"
    title="Add Branch"
    subtitle="Create a new branch for this client."
    :loading="isSubmittingBranch"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onSubmitBranch">
      <FormField label="Branch Name" name="name" :error="branchForm.errors.value.name" required>
        <InputText id="branch-name" v-model="branchNameValue" v-bind="branchNameAttrs" placeholder="Branch name" class="w-full" :disabled="isSubmittingBranch" />
      </FormField>
      <FormField label="Address" name="address" :error="branchForm.errors.value.address">
        <InputText id="branch-address" v-model="addressValue" v-bind="addressAttrs" placeholder="Address (optional)" class="w-full" :disabled="isSubmittingBranch" />
      </FormField>
      <FormField label="City" name="city" :error="branchForm.errors.value.city">
        <InputText id="branch-city" v-model="cityValue" v-bind="cityAttrs" placeholder="City (optional)" class="w-full" :disabled="isSubmittingBranch" />
      </FormField>
      <div class="grid grid-cols-2 gap-3">
        <FormField label="Country" name="country" :error="branchForm.errors.value.country" required>
          <InputText id="branch-country" v-model="countryValue" v-bind="countryAttrs" placeholder="e.g. MX" class="w-full" :disabled="isSubmittingBranch" />
        </FormField>
        <FormField label="Timezone" name="timezone" :error="branchForm.errors.value.timezone" required>
          <InputText id="branch-timezone" v-model="timezoneValue" v-bind="timezoneAttrs" placeholder="America/Mexico_City" class="w-full" :disabled="isSubmittingBranch" />
        </FormField>
      </div>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Cancel" severity="secondary" outlined :disabled="isSubmittingBranch" @click="showBranchDialog = false" />
        <Button label="Create Branch" :loading="isSubmittingBranch" @click="onSubmitBranch" />
      </div>
    </template>
  </AppDialog>
</template>
