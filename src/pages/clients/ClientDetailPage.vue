<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import AppDialog from '@/components/ui/AppDialog.vue'
import FormField from '@/components/ui/FormField.vue'
import { clientsService } from '@/services/clients.service'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import type { ClientBranch } from '@/types/client'

const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const toast = useToast()

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

// --- Add Branch Modal ---
const showBranchDialog = ref(false)
const isSubmittingBranch = ref(false)

const branchSchema = z.object({
  name: z.string().min(2, 'Min 2 characters'),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('MX'),
  timezone: z.string().default('America/Mexico_City')
})

const { handleSubmit, errors, resetForm, defineField } = useForm({
  validationSchema: toTypedSchema(branchSchema),
  initialValues: { name: '', address: '', city: '', country: 'MX', timezone: 'America/Mexico_City' }
})

const [branchNameValue, branchNameAttrs] = defineField('name')
const [addressValue, addressAttrs] = defineField('address')
const [cityValue, cityAttrs] = defineField('city')
const [countryValue, countryAttrs] = defineField('country')
const [timezoneValue, timezoneAttrs] = defineField('timezone')

function openBranchDialog() {
  resetForm()
  showBranchDialog.value = true
}

const onSubmitBranch = handleSubmit(async (values) => {
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
        disabled
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

      <!-- Branches Section -->
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-semibold text-[var(--text)]">Branches</h2>
          <Button label="Add Branch" icon="pi pi-plus" @click="openBranchDialog" />
        </div>

        <!-- Branches loading -->
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

          <template #empty>
            <div class="text-center py-8 text-[var(--text-muted)]">No branches found</div>
          </template>
        </DataTable>
      </div>
    </template>
  </div>

  <!-- Add Branch Dialog -->
  <AppDialog
    v-model:visible="showBranchDialog"
    title="Add Branch"
    subtitle="Create a new branch for this client."
    :loading="isSubmittingBranch"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onSubmitBranch">
      <FormField label="Branch Name" name="name" :error="errors.name" required>
        <InputText
          id="branch-name"
          v-model="branchNameValue"
          v-bind="branchNameAttrs"
          placeholder="Branch name"
          class="w-full"
          :disabled="isSubmittingBranch"
        />
      </FormField>

      <FormField label="Address" name="address" :error="errors.address">
        <InputText
          id="branch-address"
          v-model="addressValue"
          v-bind="addressAttrs"
          placeholder="Address (optional)"
          class="w-full"
          :disabled="isSubmittingBranch"
        />
      </FormField>

      <FormField label="City" name="city" :error="errors.city">
        <InputText
          id="branch-city"
          v-model="cityValue"
          v-bind="cityAttrs"
          placeholder="City (optional)"
          class="w-full"
          :disabled="isSubmittingBranch"
        />
      </FormField>

      <div class="grid grid-cols-2 gap-3">
        <FormField label="Country" name="country" :error="errors.country" required>
          <InputText
            id="branch-country"
            v-model="countryValue"
            v-bind="countryAttrs"
            placeholder="e.g. MX"
            class="w-full"
            :disabled="isSubmittingBranch"
          />
        </FormField>

        <FormField label="Timezone" name="timezone" :error="errors.timezone" required>
          <InputText
            id="branch-timezone"
            v-model="timezoneValue"
            v-bind="timezoneAttrs"
            placeholder="e.g. America/Mexico_City"
            class="w-full"
            :disabled="isSubmittingBranch"
          />
        </FormField>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          :disabled="isSubmittingBranch"
          @click="showBranchDialog = false"
        />
        <Button
          label="Create Branch"
          :loading="isSubmittingBranch"
          @click="onSubmitBranch"
        />
      </div>
    </template>
  </AppDialog>
</template>
