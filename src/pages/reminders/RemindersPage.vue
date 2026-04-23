<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Select from 'primevue/select'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import { remindersService, type ClientReminder, type CreateReminderRequest } from '@/services/reminders.service'
import { clientsService } from '@/services/clients.service'
import { qk } from '@/queries/keys'
import { useToast } from '@/composables/useToast'
import { useConfirm } from 'primevue/useconfirm'
import dayjs from 'dayjs'

const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()

const statusFilter = ref<ClientReminder['status'] | undefined>(undefined)
const clientFilter = ref<string | undefined>(undefined)

const filtersKey = computed(() => JSON.stringify({ status: statusFilter.value, client: clientFilter.value }))

const { data: result, isLoading } = useQuery({
  queryKey: computed(() => qk.reminders(filtersKey.value)),
  queryFn: () => remindersService.list({ status: statusFilter.value, clientId: clientFilter.value, page: 0, size: 100 }),
  staleTime: 30_000,
})

const reminders = computed(() => result.value?.content ?? [])

const { data: clientsData } = useQuery({
  queryKey: ['clients-for-reminders'],
  queryFn: () => clientsService.list({ page: 0, size: 200 }),
  staleTime: 60_000,
})
const clientOptions = computed(() => [
  { label: '— Todos —', value: undefined },
  ...(clientsData.value?.content ?? []).map(c => ({ label: c.name, value: c.id }))
])

const statusOptions = [
  { label: '— Todos —', value: undefined },
  { label: 'Activo', value: 'ACTIVE' },
  { label: 'Pausado', value: 'PAUSED' },
  { label: 'Completado', value: 'COMPLETED' },
]

const recurrenceOptions = [
  { label: 'Diario', value: 'DAILY' },
  { label: 'Semanal', value: 'WEEKLY' },
  { label: 'Quincenal', value: 'BIWEEKLY' },
  { label: 'Mensual', value: 'MONTHLY' },
  { label: 'Personalizado', value: 'CUSTOM' },
]

function statusSeverity(s: ClientReminder['status']) {
  return s === 'ACTIVE' ? 'success' : s === 'PAUSED' ? 'warn' : 'secondary'
}
function statusLabel(s: ClientReminder['status']) {
  return s === 'ACTIVE' ? 'Activo' : s === 'PAUSED' ? 'Pausado' : 'Completado'
}
function recurrenceLabel(r: ClientReminder['recurrenceType'], days?: number) {
  const map: Record<string, string> = { DAILY: 'Diario', WEEKLY: 'Semanal', BIWEEKLY: 'Quincenal', MONTHLY: 'Mensual', CUSTOM: `Cada ${days ?? '?'} días` }
  return map[r] ?? r
}

// ── Dialog state ──────────────────────────────────────────────────
const showDialog = ref(false)
const editingId = ref<string | null>(null)
const formClientId = ref('')
const formTitle = ref('')
const formDescription = ref('')
const formRecurrenceType = ref<CreateReminderRequest['recurrenceType']>('MONTHLY')
const formRecurrenceDays = ref<number | null>(null)
const formStartDate = ref(dayjs().format('YYYY-MM-DD'))
const formMaxOccurrences = ref<number | null>(null)

function openCreateDialog() {
  editingId.value = null
  formClientId.value = ''
  formTitle.value = ''
  formDescription.value = ''
  formRecurrenceType.value = 'MONTHLY'
  formRecurrenceDays.value = null
  formStartDate.value = dayjs().format('YYYY-MM-DD')
  formMaxOccurrences.value = null
  showDialog.value = true
}

function openEditDialog(r: ClientReminder) {
  editingId.value = r.id
  formClientId.value = r.clientId
  formTitle.value = r.title
  formDescription.value = r.description ?? ''
  formRecurrenceType.value = r.recurrenceType
  formRecurrenceDays.value = r.recurrenceDays ?? null
  formStartDate.value = r.startDate
  formMaxOccurrences.value = r.maxOccurrences ?? null
  showDialog.value = true
}

const saveMut = useMutation({
  mutationFn: () => {
    const payload: CreateReminderRequest = {
      clientId: formClientId.value,
      title: formTitle.value,
      description: formDescription.value || undefined,
      recurrenceType: formRecurrenceType.value,
      recurrenceDays: formRecurrenceDays.value ?? undefined,
      startDate: formStartDate.value,
      maxOccurrences: formMaxOccurrences.value ?? undefined,
      notifyUserIds: [],
    }
    return editingId.value
      ? remindersService.update(editingId.value, payload)
      : remindersService.create(payload)
  },
  onSuccess: () => {
    toast.success(editingId.value ? 'Recordatorio actualizado' : 'Recordatorio creado')
    showDialog.value = false
    queryClient.invalidateQueries({ queryKey: ['reminders'] })
  },
  onError: () => toast.error('Error al guardar recordatorio'),
})

const completeMut = useMutation({
  mutationFn: (id: string) => remindersService.complete(id),
  onSuccess: () => { toast.success('Completado'); queryClient.invalidateQueries({ queryKey: ['reminders'] }) },
})

const snoozeMut = useMutation({
  mutationFn: (id: string) => remindersService.snooze(id, 1),
  onSuccess: () => { toast.success('Pospuesto 1 día'); queryClient.invalidateQueries({ queryKey: ['reminders'] }) },
})

const pauseMut = useMutation({
  mutationFn: (r: ClientReminder) => r.status === 'PAUSED' ? remindersService.resume(r.id) : remindersService.pause(r.id),
  onSuccess: () => { toast.success('Estado actualizado'); queryClient.invalidateQueries({ queryKey: ['reminders'] }) },
})

const deleteMut = useMutation({
  mutationFn: (id: string) => remindersService.delete(id),
  onSuccess: () => { toast.success('Eliminado'); queryClient.invalidateQueries({ queryKey: ['reminders'] }) },
})

function confirmDelete(r: ClientReminder) {
  confirm.require({
    message: `¿Eliminar recordatorio "${r.title}"?`,
    header: 'Eliminar recordatorio',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancelar', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Eliminar', severity: 'danger' },
    accept: () => deleteMut.mutate(r.id),
  })
}

// ── History drawer ────────────────────────────────────────────────
const showHistory = ref(false)
const historyReminderId = ref<string | null>(null)
const { data: history, isLoading: histLoading } = useQuery({
  queryKey: computed(() => qk.reminderHistory(historyReminderId.value ?? '')),
  queryFn: () => remindersService.getHistory(historyReminderId.value!),
  enabled: computed(() => !!historyReminderId.value),
})

function openHistory(r: ClientReminder) {
  historyReminderId.value = r.id
  showHistory.value = true
}
</script>

<template>
  <div class="space-y-4 p-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-xl font-bold text-[var(--text)]">Recordatorios</h1>
        <p class="text-sm text-[var(--text-muted)]">Recordatorios recurrentes vinculados a clientes</p>
      </div>
      <Button label="Nuevo recordatorio" icon="pi pi-plus" @click="openCreateDialog" />
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3">
      <Select v-model="statusFilter" :options="statusOptions" option-label="label" option-value="value" placeholder="Estado" class="w-40" />
      <Select v-model="clientFilter" :options="clientOptions" option-label="label" option-value="value" placeholder="Cliente" filter class="w-52" />
    </div>

    <DataTable :value="reminders" :loading="isLoading" stripedRows>
      <Column field="clientName" header="Cliente" />
      <Column field="title" header="Título" />
      <Column header="Recurrencia" style="width:140px">
        <template #body="{ data }">{{ recurrenceLabel(data.recurrenceType, data.recurrenceDays) }}</template>
      </Column>
      <Column header="Próxima fecha" style="width:130px">
        <template #body="{ data }">{{ dayjs(data.nextDueDate).format('DD MMM YYYY') }}</template>
      </Column>
      <Column header="Estado" style="width:110px">
        <template #body="{ data }">
          <Tag :severity="statusSeverity(data.status)" :value="statusLabel(data.status)" />
        </template>
      </Column>
      <Column header="Acciones" style="width:220px">
        <template #body="{ data }">
          <div class="flex gap-1 flex-wrap">
            <Button v-if="data.status === 'ACTIVE'" icon="pi pi-check" size="small" severity="success" text rounded v-tooltip="'Completar'" @click="completeMut.mutate(data.id)" />
            <Button v-if="data.status === 'ACTIVE'" icon="pi pi-clock" size="small" severity="warn" text rounded v-tooltip="'Posponer 1 día'" @click="snoozeMut.mutate(data.id)" />
            <Button :icon="data.status === 'PAUSED' ? 'pi pi-play' : 'pi pi-pause'" size="small" severity="secondary" text rounded v-tooltip="data.status === 'PAUSED' ? 'Reanudar' : 'Pausar'" @click="pauseMut.mutate(data)" />
            <Button icon="pi pi-pencil" size="small" severity="secondary" text rounded v-tooltip="'Editar'" @click="openEditDialog(data)" />
            <Button icon="pi pi-history" size="small" severity="info" text rounded v-tooltip="'Historial'" @click="openHistory(data)" />
            <Button icon="pi pi-trash" size="small" severity="danger" text rounded v-tooltip="'Eliminar'" @click="confirmDelete(data)" />
          </div>
        </template>
      </Column>
      <template #empty>
        <div class="text-center py-8 text-[var(--text-muted)] text-sm">No hay recordatorios.</div>
      </template>
    </DataTable>

    <!-- Create/Edit Dialog -->
    <Dialog v-model:visible="showDialog" :header="editingId ? 'Editar recordatorio' : 'Nuevo recordatorio'" modal class="w-full max-w-lg">
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Cliente *</label>
          <Select v-model="formClientId" :options="clientOptions.slice(1)" option-label="label" option-value="value" filter placeholder="Seleccionar cliente" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Título *</label>
          <InputText v-model="formTitle" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">Descripción</label>
          <Textarea v-model="formDescription" :rows="2" class="w-full" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">Recurrencia *</label>
            <Select v-model="formRecurrenceType" :options="recurrenceOptions" option-label="label" option-value="value" class="w-full" />
          </div>
          <div v-if="formRecurrenceType === 'CUSTOM'" class="flex flex-col gap-1">
            <label class="text-sm font-medium">Días</label>
            <InputNumber v-model="formRecurrenceDays" :min="1" class="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">Fecha inicio *</label>
            <InputText v-model="formStartDate" type="date" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">Máx. ocurrencias</label>
            <InputNumber v-model="formMaxOccurrences" :min="1" placeholder="Sin límite" class="w-full" />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button label="Cancelar" severity="secondary" outlined @click="showDialog = false" />
          <Button :label="editingId ? 'Guardar' : 'Crear'" :loading="saveMut.isPending.value" :disabled="!formClientId || !formTitle" @click="saveMut.mutate()" />
        </div>
      </template>
    </Dialog>

    <!-- History Dialog -->
    <Dialog v-model:visible="showHistory" header="Historial de recordatorio" modal class="w-full max-w-lg">
      <div v-if="histLoading" class="py-6 text-center text-[var(--text-muted)]">Cargando…</div>
      <div v-else-if="!history?.length" class="py-6 text-center text-sm text-[var(--text-muted)]">Sin historial.</div>
      <div v-else class="space-y-2 max-h-80 overflow-y-auto">
        <div v-for="h in history" :key="h.id" class="flex items-start gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]">
          <div class="flex-1">
            <p class="text-sm font-medium text-[var(--text)]">{{ h.outcome === 'COMPLETED' ? 'Completado' : h.outcome === 'SNOOZED' ? 'Pospuesto' : 'Omitido' }}</p>
            <p class="text-xs text-[var(--text-muted)]">{{ dayjs(h.completedAt).format('DD MMM YYYY HH:mm') }}</p>
            <p v-if="h.notes" class="text-xs text-[var(--text-muted)] mt-1">{{ h.notes }}</p>
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>
