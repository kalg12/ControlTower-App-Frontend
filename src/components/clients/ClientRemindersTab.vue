<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import { remindersService, type ClientReminder, type CreateReminderRequest } from '@/services/reminders.service'
import { qk } from '@/queries/keys'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'

const props = defineProps<{ clientId: string }>()
const queryClient = useQueryClient()
const { t } = useI18n()
const toast = useToast()

const { data: reminders, isLoading } = useQuery({
  queryKey: computed(() => qk.remindersByClient(props.clientId)),
  queryFn: () => remindersService.getByClient(props.clientId),
  staleTime: 30_000,
})

const recurrenceOptions = computed(() => [
  { label: t('reminders.daily'), value: 'DAILY' },
  { label: t('reminders.weekly'), value: 'WEEKLY' },
  { label: t('reminders.biweekly'), value: 'BIWEEKLY' },
  { label: t('reminders.monthly'), value: 'MONTHLY' },
  { label: t('reminders.custom'), value: 'CUSTOM' },
])

function statusSeverity(s: ClientReminder['status']) {
  return s === 'ACTIVE' ? 'success' : s === 'PAUSED' ? 'warn' : 'secondary'
}
function statusLabel(s: ClientReminder['status']) {
  return s === 'ACTIVE' ? t('reminders.active') : s === 'PAUSED' ? t('reminders.paused') : t('reminders.completed')
}

const showDialog = ref(false)
const editingId = ref<string | null>(null)
const formTitle = ref('')
const formDescription = ref('')
const formRecurrenceType = ref<CreateReminderRequest['recurrenceType']>('MONTHLY')
const formRecurrenceDays = ref<number | null>(null)
const formStartDate = ref(dayjs().format('YYYY-MM-DD'))
const formMaxOccurrences = ref<number | null>(null)

function openCreate() {
  editingId.value = null
  formTitle.value = ''
  formDescription.value = ''
  formRecurrenceType.value = 'MONTHLY'
  formRecurrenceDays.value = null
  formStartDate.value = dayjs().format('YYYY-MM-DD')
  formMaxOccurrences.value = null
  showDialog.value = true
}

function openEdit(r: ClientReminder) {
  editingId.value = r.id
  formTitle.value = r.title
  formDescription.value = r.description ?? ''
  formRecurrenceType.value = r.recurrenceType
  formRecurrenceDays.value = r.recurrenceDays ?? null
  formStartDate.value = r.startDate
  formMaxOccurrences.value = r.maxOccurrences ?? null
  showDialog.value = true
}

function invalidate() {
  queryClient.invalidateQueries({ queryKey: qk.remindersByClient(props.clientId) })
}

const saveMut = useMutation({
  mutationFn: () => {
    const payload: CreateReminderRequest = {
      clientId: props.clientId,
      title: formTitle.value,
      description: formDescription.value || undefined,
      recurrenceType: formRecurrenceType.value,
      recurrenceDays: formRecurrenceDays.value ?? undefined,
      startDate: formStartDate.value,
      maxOccurrences: formMaxOccurrences.value ?? undefined,
      notifyUserIds: [],
    }
    return editingId.value ? remindersService.update(editingId.value, payload) : remindersService.create(payload)
  },
  onSuccess: () => { toast.success(editingId.value ? t('reminders.updated') : t('reminders.created')); showDialog.value = false; invalidate() },
  onError: () => toast.error(t('reminders.saveFailed')),
})

const completeMut = useMutation({
  mutationFn: (id: string) => remindersService.complete(id),
  onSuccess: () => { toast.success(t('reminders.statusUpdated')); invalidate() },
})

const deleteMut = useMutation({
  mutationFn: (id: string) => remindersService.delete(id),
  onSuccess: () => { toast.success(t('reminders.deleted')); invalidate() },
})
</script>

<template>
  <div class="space-y-3 pt-2">
    <div class="flex justify-end">
      <Button :label="$t('clientDetail.reminderNew')" icon="pi pi-plus" size="small" @click="openCreate" />
    </div>

    <DataTable :value="reminders ?? []" :loading="isLoading" stripedRows tableStyle="min-width: 36rem">
      <Column field="title" :header="$t('clientDetail.reminderTitle')" />
      <Column :header="$t('clientDetail.reminderRecurrence')" style="width:120px">
        <template #body="{ data }">{{ data.recurrenceType === 'CUSTOM' ? `Cada ${data.recurrenceDays} días` : data.recurrenceType }}</template>
      </Column>
      <Column :header="$t('clientDetail.reminderNextDate')" style="width:130px">
        <template #body="{ data }">{{ dayjs(data.nextDueDate).format('DD MMM YYYY') }}</template>
      </Column>
      <Column :header="$t('clientDetail.reminderStatus')" style="width:100px">
        <template #body="{ data }">
          <Tag :severity="statusSeverity(data.status)" :value="statusLabel(data.status)" />
        </template>
      </Column>
      <Column header="" style="width:120px">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button v-if="data.status === 'ACTIVE'" icon="pi pi-check" size="small" severity="success" text rounded v-tooltip="$t('clientDetail.reminderComplete')" @click="completeMut.mutate(data.id)" />
            <Button icon="pi pi-pencil" size="small" severity="secondary" text rounded v-tooltip="$t('clientDetail.reminderEdit')" @click="openEdit(data)" />
            <Button icon="pi pi-trash" size="small" severity="danger" text rounded v-tooltip="$t('clientDetail.reminderDelete')" @click="deleteMut.mutate(data.id)" />
          </div>
        </template>
      </Column>
      <template #empty>
        <div class="text-center py-6 text-sm text-[var(--text-muted)]">
          <p>{{ $t('clientDetail.reminderNoReminders') }}</p>
          <Button :label="$t('clientDetail.reminderCreateFirst')" text size="small" class="mt-2" @click="openCreate" />
        </div>
      </template>
    </DataTable>

    <Dialog v-model:visible="showDialog" :header="editingId ? $t('reminders.edit') : $t('reminders.new')" modal class="w-full max-w-lg">
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ $t('clientReminderForm.title') }}</label>
          <InputText v-model="formTitle" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ $t('clientReminderForm.description') }}</label>
          <Textarea v-model="formDescription" :rows="2" class="w-full" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ $t('clientReminderForm.recurrence') }}</label>
            <Select v-model="formRecurrenceType" :options="recurrenceOptions" option-label="label" option-value="value" class="w-full" />
          </div>
          <div v-if="formRecurrenceType === 'CUSTOM'" class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ $t('clientReminderForm.days') }}</label>
            <InputNumber v-model="formRecurrenceDays" :min="1" class="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ $t('clientReminderForm.startDate') }}</label>
            <InputText v-model="formStartDate" type="date" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ $t('clientReminderForm.maxOccurrences') }}</label>
            <InputNumber v-model="formMaxOccurrences" :min="1" :placeholder="$t('clientReminderForm.noLimit')" class="w-full" />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button :label="$t('clientReminderForm.cancel')" severity="secondary" outlined @click="showDialog = false" />
          <Button :label="editingId ? $t('clientReminderForm.save') : $t('clientReminderForm.create')" :loading="saveMut.isPending.value" :disabled="!formTitle" @click="saveMut.mutate()" />
        </div>
      </template>
    </Dialog>
  </div>
</template>
