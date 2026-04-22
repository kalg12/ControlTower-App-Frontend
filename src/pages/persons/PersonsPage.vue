<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Dialog from 'primevue/dialog'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { Users, User, Phone, Mail, Plus, Search, Building2 } from 'lucide-vue-next'
import { personsService } from '@/services/persons.service'
import { clientsService } from '@/services/clients.service'
import { usersService } from '@/services/users.service'
import { useAuthStore } from '@/stores/auth'
import type { Person, CreatePersonRequest, PersonStatus } from '@/types/person'
import PageInfoButton from '@/components/ui/PageInfoButton.vue'
import dayjs from 'dayjs'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const qc = useQueryClient()
const auth = useAuthStore()

const search = ref('')
const page = ref(0)
const showDialog = ref(false)
const editingPerson = ref<Person | null>(null)
const deleteConfirmId = ref<string | null>(null)

const form = ref<CreatePersonRequest>({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  whatsapp: '',
  leadSource: '',
  status: 'PROSPECT',
  clientId: undefined,
  assignedToId: undefined,
  address: '',
  notes: ''
})

const { data: personsPage, isLoading } = useQuery({
  queryKey: computed(() => ['persons', search.value, page.value]),
  queryFn: () => personsService.list({ search: search.value || undefined, page: page.value, size: 20 }),
  staleTime: 15_000
})

const { data: clientsRaw } = useQuery({
  queryKey: ['clients-all-persons'],
  queryFn: () => clientsService.list({ page: 0, size: 500 }).then(r => r.content ?? r),
  staleTime: 60_000
})

const { data: usersRaw } = useQuery({
  queryKey: ['users-tenant-persons'],
  queryFn: () => usersService.list({ tenantId: auth.user!.tenantId, page: 0, size: 500 }).then(r => r.content),
  enabled: computed(() => !!auth.user?.tenantId)
})

const persons = computed(() => personsPage.value?.content ?? [])
const totalRecords = computed(() => personsPage.value?.totalElements ?? 0)

const clientOpts = computed(() => [
  { label: t('persons.noCompany'), value: null },
  ...(clientsRaw.value ?? []).map((c: any) => ({ label: c.name, value: c.id }))
])

const userOpts = computed(() => [
  { label: t('persons.unassigned'), value: null },
  ...(usersRaw.value ?? []).map((u: any) => ({ label: u.fullName || u.email, value: u.id }))
])

const leadSourceOpts = [
  { label: 'WhatsApp', value: 'WHATSAPP' },
  { label: 'Instagram', value: 'INSTAGRAM' },
  { label: 'Facebook', value: 'FACEBOOK' },
  { label: 'TikTok', value: 'TIKTOK' },
  { label: 'Referido', value: 'REFERRAL' },
  { label: 'Entrada directa', value: 'INBOUND' },
  { label: 'Sitio web', value: 'WEBSITE' },
  { label: 'Evento', value: 'EVENT' },
  { label: 'Otro', value: 'OTHER' }
]

const statusOpts = [
  { label: t('persons.statusProspect'), value: 'PROSPECT' },
  { label: t('persons.statusActive'),   value: 'ACTIVE' },
  { label: t('persons.statusInactive'), value: 'INACTIVE' },
  { label: t('persons.statusConverted'),value: 'CONVERTED' }
]

const createMutation = useMutation({
  mutationFn: (req: CreatePersonRequest) => personsService.create(req),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['persons'] })
    toast.add({ severity: 'success', summary: t('common.success'), detail: t('persons.created'), life: 3000 })
    closeDialog()
  },
  onError: () => toast.add({ severity: 'error', summary: t('common.error'), detail: t('errors.server'), life: 4000 })
})

const updateMutation = useMutation({
  mutationFn: ({ id, req }: { id: string; req: CreatePersonRequest }) => personsService.update(id, req),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['persons'] })
    toast.add({ severity: 'success', summary: t('common.success'), detail: t('persons.updated'), life: 3000 })
    closeDialog()
  },
  onError: () => toast.add({ severity: 'error', summary: t('common.error'), detail: t('errors.server'), life: 4000 })
})

const deleteMutation = useMutation({
  mutationFn: (id: string) => personsService.delete(id),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['persons'] })
    toast.add({ severity: 'success', summary: t('common.success'), detail: t('persons.deleted'), life: 3000 })
    deleteConfirmId.value = null
  },
  onError: () => toast.add({ severity: 'error', summary: t('common.error'), detail: t('errors.server'), life: 4000 })
})

function openCreate() {
  editingPerson.value = null
  form.value = { firstName: '', lastName: '', email: '', phone: '', whatsapp: '', leadSource: '', status: 'PROSPECT', clientId: undefined, assignedToId: undefined, address: '', notes: '' }
  showDialog.value = true
}

function openEdit(p: Person) {
  editingPerson.value = p
  form.value = {
    firstName: p.firstName,
    lastName: p.lastName ?? '',
    email: p.email ?? '',
    phone: p.phone ?? '',
    whatsapp: p.whatsapp ?? '',
    leadSource: p.leadSource ?? '',
    status: p.status,
    clientId: p.clientId,
    assignedToId: p.assignedToId,
    address: p.address ?? '',
    notes: p.notes ?? ''
  }
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
  editingPerson.value = null
}

function submit() {
  if (!form.value.firstName?.trim()) return
  const payload = { ...form.value }
  if (editingPerson.value) {
    updateMutation.mutate({ id: editingPerson.value.id, req: payload })
  } else {
    createMutation.mutate(payload)
  }
}

function statusSeverity(s: PersonStatus): 'success' | 'warn' | 'secondary' | 'info' {
  if (s === 'ACTIVE') return 'success'
  if (s === 'PROSPECT') return 'info'
  if (s === 'CONVERTED') return 'warn'
  return 'secondary'
}

function formatDate(d?: string) {
  return d ? dayjs(d).format('DD/MM/YYYY') : '—'
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-[var(--text)] flex items-center gap-2">
          <Users class="w-6 h-6 text-[var(--primary)]" />
          {{ t('persons.title') }}
          <PageInfoButton :title="t('persons.title')" :description="t('pageInfo.persons')" />
        </h1>
        <p class="text-sm text-[var(--text-muted)] mt-1">{{ t('persons.subtitle') }}</p>
      </div>
      <Button :label="t('persons.create')" icon="pi pi-plus" @click="openCreate" />
    </div>

    <div class="flex gap-3 items-center">
      <div class="relative flex-1 max-w-xs">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <InputText
          v-model="search"
          :placeholder="t('persons.searchPlaceholder')"
          class="pl-9 w-full"
        />
      </div>
    </div>

    <DataTable
      :value="persons"
      :loading="isLoading"
      :rows="20"
      :total-records="totalRecords"
      lazy
      paginator
      striped-rows
      class="rounded-xl border border-[var(--border)]"
      @page="e => page = e.page"
    >
      <template #empty>
        <div class="text-center py-10 text-[var(--text-muted)]">{{ t('persons.empty') }}</div>
      </template>

      <Column :header="t('persons.name')" class="min-w-[180px]">
        <template #body="{ data }">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {{ data.firstName[0]?.toUpperCase() }}
            </div>
            <div>
              <p class="font-medium text-sm text-[var(--text)]">{{ data.fullName }}</p>
              <p v-if="data.email" class="text-xs text-[var(--text-muted)]">{{ data.email }}</p>
            </div>
          </div>
        </template>
      </Column>

      <Column :header="t('persons.contact')" class="min-w-[140px]">
        <template #body="{ data }">
          <div class="space-y-0.5">
            <p v-if="data.phone" class="text-sm flex items-center gap-1 text-[var(--text)]">
              <Phone class="w-3 h-3 text-[var(--text-muted)]" /> {{ data.phone }}
            </p>
            <p v-if="data.whatsapp" class="text-xs text-emerald-600">
              WA: {{ data.whatsapp }}
            </p>
            <span v-if="!data.phone && !data.whatsapp" class="text-[var(--text-muted)]">—</span>
          </div>
        </template>
      </Column>

      <Column :header="t('persons.company')" class="min-w-[130px]">
        <template #body="{ data }">
          <span v-if="data.clientName" class="text-sm flex items-center gap-1 text-[var(--text)]">
            <Building2 class="w-3 h-3 text-[var(--text-muted)]" /> {{ data.clientName }}
          </span>
          <span v-else class="text-[var(--text-muted)]">—</span>
        </template>
      </Column>

      <Column :header="t('persons.leadSource')" class="min-w-[110px]">
        <template #body="{ data }">
          <span class="text-sm text-[var(--text)]">{{ data.leadSource ?? '—' }}</span>
        </template>
      </Column>

      <Column :header="t('persons.status')" class="min-w-[100px]">
        <template #body="{ data }">
          <Tag :severity="statusSeverity(data.status)" class="text-xs">{{ t(`persons.status${data.status.charAt(0) + data.status.slice(1).toLowerCase()}`) }}</Tag>
        </template>
      </Column>

      <Column :header="t('persons.assignedTo')" class="min-w-[120px]">
        <template #body="{ data }">
          <span class="text-sm text-[var(--text)]">{{ data.assignedToName ?? '—' }}</span>
        </template>
      </Column>

      <Column :header="t('common.actions')" class="w-28">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button icon="pi pi-pencil" severity="secondary" text size="small" @click="openEdit(data)" />
            <Button icon="pi pi-trash" severity="danger" text size="small" @click="deleteConfirmId = data.id" />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Create / Edit Dialog -->
    <Dialog
      v-model:visible="showDialog"
      :header="editingPerson ? t('persons.edit') : t('persons.create')"
      :style="{ width: '36rem' }"
      modal
    >
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-[var(--text-muted)]">{{ t('persons.firstName') }} *</label>
            <InputText v-model="form.firstName" :placeholder="t('persons.firstName')" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-[var(--text-muted)]">{{ t('persons.lastName') }}</label>
            <InputText v-model="form.lastName" :placeholder="t('persons.lastName')" class="w-full" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-[var(--text-muted)]">{{ t('persons.email') }}</label>
            <InputText v-model="form.email" type="email" placeholder="nombre@email.com" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-[var(--text-muted)]">{{ t('persons.phone') }}</label>
            <InputText v-model="form.phone" placeholder="+52 55 0000 0000" class="w-full" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-[var(--text-muted)]">WhatsApp</label>
            <InputText v-model="form.whatsapp" placeholder="+52 55 0000 0000" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-[var(--text-muted)]">{{ t('persons.leadSource') }}</label>
            <Select v-model="form.leadSource" :options="leadSourceOpts" option-label="label" option-value="value" :placeholder="t('persons.selectSource')" class="w-full" show-clear />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-[var(--text-muted)]">{{ t('persons.status') }}</label>
            <Select v-model="form.status" :options="statusOpts" option-label="label" option-value="value" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-[var(--text-muted)]">{{ t('persons.company') }}</label>
            <Select v-model="form.clientId" :options="clientOpts" option-label="label" option-value="value" :placeholder="t('persons.noCompany')" class="w-full" show-clear filter />
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-[var(--text-muted)]">{{ t('persons.assignedTo') }}</label>
          <Select v-model="form.assignedToId" :options="userOpts" option-label="label" option-value="value" :placeholder="t('persons.unassigned')" class="w-full" show-clear />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-[var(--text-muted)]">{{ t('persons.address') }}</label>
          <InputText v-model="form.address" :placeholder="t('persons.address')" class="w-full" />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-[var(--text-muted)]">{{ t('persons.notes') }}</label>
          <textarea
            v-model="form.notes"
            rows="3"
            class="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            :placeholder="t('persons.notesPlaceholder')"
          />
        </div>
      </div>

      <template #footer>
        <Button :label="t('common.cancel')" severity="secondary" text @click="closeDialog" />
        <Button
          :label="editingPerson ? t('common.save') : t('persons.create')"
          :loading="createMutation.isPending.value || updateMutation.isPending.value"
          :disabled="!form.firstName?.trim()"
          @click="submit"
        />
      </template>
    </Dialog>

    <!-- Delete Confirm -->
    <Dialog v-model:visible="deleteConfirmId" :header="t('persons.deleteConfirmTitle')" :style="{ width: '24rem' }" modal>
      <p class="text-[var(--text)]">{{ t('persons.deleteConfirm') }}</p>
      <template #footer>
        <Button :label="t('common.cancel')" severity="secondary" text @click="deleteConfirmId = null" />
        <Button :label="t('common.delete')" severity="danger" :loading="deleteMutation.isPending.value" @click="deleteMutation.mutate(deleteConfirmId!)" />
      </template>
    </Dialog>
  </div>
</template>
