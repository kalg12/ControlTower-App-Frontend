<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@tanstack/vue-query'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import MultiSelect from 'primevue/multiselect'
import Tag from 'primevue/tag'
import ToggleSwitch from 'primevue/toggleswitch'
import DatePicker from 'primevue/datepicker'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { calendarService } from '@/services/calendar.service'
import { clientsService } from '@/services/clients.service'
import { usersService } from '@/services/users.service'
import { remindersService, type ClientReminder } from '@/services/reminders.service'
import type {
  CalendarEvent,
  CalendarEventType,
  CalendarEventStatus,
  ContactChannel,
  CreateCalendarEventRequest
} from '@/types/calendar'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'

const { t, locale } = useI18n()
const auth = useAuthStore()
const toast = useToast()
const confirm = useConfirm()

dayjs.locale(locale.value === 'es' ? 'es' : 'en')

const canWrite = computed(() => auth.hasPermission('client:write'))

const activeTab = ref('events')

// ── Reminders query ─────────────────────────────────────────────────
const { data: reminders, refetch: refetchReminders } = useQuery({
  queryKey: computed(() => ['reminders', filterClient.value]),
  queryFn: () => filterClient.value 
    ? remindersService.getByClient(filterClient.value)
    : remindersService.list({ size: 100 }).then(r => r.content ?? r),
  staleTime: 30_000
})

// ── Month navigation ──────────────────────────────────────────────────
const currentMonth = ref(dayjs().startOf('month'))
const monthStart = computed(() => currentMonth.value.startOf('month'))
const monthEnd = computed(() => currentMonth.value.endOf('month'))

function prevMonth() { currentMonth.value = currentMonth.value.subtract(1, 'month') }
function nextMonth() { currentMonth.value = currentMonth.value.add(1, 'month') }
function goToday() { currentMonth.value = dayjs().startOf('month') }

const monthLabel = computed(() =>
  currentMonth.value.format(locale.value === 'es' ? 'MMMM [de] YYYY' : 'MMMM YYYY')
)

// ── Filters ───────────────────────────────────────────────────────────
const filterAssignee = ref<string | null>(null)
const filterClient = ref<string | null>(null)

// ── Data queries ──────────────────────────────────────────────────────
const { data: events, refetch } = useQuery({
  queryKey: computed(() => ['calendar', monthStart.value.toISOString(), monthEnd.value.toISOString()]),
  queryFn: () => calendarService.list({
    from: monthStart.value.toISOString(),
    to: monthEnd.value.add(1, 'day').toISOString()
  }),
  staleTime: 30_000
})

const { data: clientOptions } = useQuery({
  queryKey: ['clients-for-calendar'],
  queryFn: () => clientsService.list({ page: 0, size: 200 }).then(r => r.content ?? r),
  staleTime: 60_000
})

const { data: userOptions } = useQuery({
  queryKey: computed(() => ['users-for-calendar', auth.user?.tenantId]),
  queryFn: () => usersService.list({ tenantId: auth.user!.tenantId, page: 0, size: 200 }).then(r => r.content),
  enabled: computed(() => !!auth.user?.tenantId),
  staleTime: 60_000
})

// ── Filtered events ───────────────────────────────────────────────────
const filteredEvents = computed(() => {
  let evs = events.value ?? []
  if (filterAssignee.value) evs = evs.filter(e => e.assigneeIds?.includes(filterAssignee.value!))
  if (filterClient.value) evs = evs.filter(e => e.clientId === filterClient.value)
  return evs
})

// ── KPI strip ─────────────────────────────────────────────────────────
const kpi = computed(() => {
  const evs = filteredEvents.value
  const today = dayjs()
  return {
    total: evs.length,
    completed: evs.filter(e => e.status === 'COMPLETED').length,
    pending: evs.filter(e => e.status === 'SCHEDULED').length,
    overdue: evs.filter(e =>
      e.status === 'SCHEDULED' && dayjs(e.startAt).isBefore(today, 'day')
    ).length
  }
})

// ── Calendar grid ─────────────────────────────────────────────────────
const calendarDays = computed(() => {
  const start = monthStart.value.startOf('week') // Sunday
  const end = monthEnd.value.endOf('week')
  const days: { date: dayjs.Dayjs; isCurrentMonth: boolean; events: CalendarEvent[] }[] = []
  let cur = start
  while (cur.isBefore(end) || cur.isSame(end, 'day')) {
    const dateStr = cur.format('YYYY-MM-DD')
    days.push({
      date: cur,
      isCurrentMonth: cur.month() === currentMonth.value.month(),
      events: filteredEvents.value.filter(e =>
        dayjs(e.startAt).format('YYYY-MM-DD') === dateStr
      )
    })
    cur = cur.add(1, 'day')
  }
  return days
})

const weekDayLabels = computed(() =>
  locale.value === 'es'
    ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
)

// ── Duration presets ─────────────────────────────────────────────────
const durationPresets = [
  { label: '15 min', value: 15, icon: '⏱' },
  { label: '30 min', value: 30, icon: '⏱' },
  { label: '1 hora', value: 60, icon: '⏱' },
  { label: '1.5 horas', value: 90, icon: '⏱' },
  { label: '2 horas', value: 120, icon: '⏱' },
  { label: '3 horas', value: 180, icon: '⏱' },
  { label: '4 horas', value: 240, icon: '⏱' },
  { label: 'Todo el día', value: 480, icon: '📅' },
]

// ── Event type to default duration ─────────────────────────────────
const eventTypeDefaultDuration: Record<CalendarEventType, number> = {
  CALL: 15,
  MEETING: 60,
  SITE_VISIT: 120,
  DEMO: 90,
  FOLLOW_UP: 30,
  WHATSAPP: 15,
  INSTAGRAM: 15,
  OTHER: 30,
}
const typeColor: Record<CalendarEventType, string> = {
  CALL:       'bg-green-500',
  MEETING:    'bg-blue-500',
  SITE_VISIT: 'bg-purple-500',
  DEMO:       'bg-orange-500',
  FOLLOW_UP:  'bg-yellow-500',
  WHATSAPP:   'bg-emerald-500',
  INSTAGRAM:  'bg-pink-500',
  OTHER:      'bg-gray-500'
}

function eventColor(type: CalendarEventType): string {
  return typeColor[type] ?? 'bg-gray-500'
}

function statusOpacity(status: CalendarEventStatus): string {
  return status === 'COMPLETED' || status === 'CANCELLED' ? 'opacity-50' : ''
}

// ── Select options ────────────────────────────────────────────────────
const clientSelectOpts = computed(() => [
  { label: t('calendar.allClients'), value: null as string | null },
  ...(clientOptions.value ?? []).map((c: any) => ({ label: c.name, value: c.id }))
])

const assigneeSelectOpts = computed(() => [
  { label: t('calendar.allAgents'), value: null as string | null },
  ...(userOptions.value ?? []).map((u: any) => ({ label: u.fullName || u.email, value: u.id }))
])

const clientDialogOpts = computed(() =>
  (clientOptions.value ?? []).map((c: any) => ({ label: c.name, value: c.id }))
)

const assigneeDialogOpts = computed(() =>
  (userOptions.value ?? []).map((u: any) => ({ label: u.fullName || u.email, value: u.id }))
)

const eventTypeOpts = computed(() => [
  { label: t('calendar.eventTypeCall'),      value: 'CALL' as CalendarEventType },
  { label: t('calendar.eventTypeMeeting'),   value: 'MEETING' as CalendarEventType },
  { label: t('calendar.eventTypeSiteVisit'), value: 'SITE_VISIT' as CalendarEventType },
  { label: t('calendar.eventTypeDemo'),      value: 'DEMO' as CalendarEventType },
  { label: t('calendar.eventTypeFollowUp'),  value: 'FOLLOW_UP' as CalendarEventType },
  { label: t('calendar.eventTypeWhatsapp'),  value: 'WHATSAPP' as CalendarEventType },
  { label: t('calendar.eventTypeInstagram'), value: 'INSTAGRAM' as CalendarEventType },
  { label: t('calendar.eventTypeOther'),     value: 'OTHER' as CalendarEventType }
])

const channelOpts = computed(() => [
  { label: t('calendar.channelWhatsapp'),  value: 'WHATSAPP' as ContactChannel },
  { label: t('calendar.channelInstagram'), value: 'INSTAGRAM' as ContactChannel },
  { label: t('calendar.channelFacebook'),  value: 'FACEBOOK' as ContactChannel },
  { label: t('calendar.channelEmail'),     value: 'EMAIL' as ContactChannel },
  { label: t('calendar.channelPhone'),     value: 'PHONE' as ContactChannel },
  { label: t('calendar.channelInPerson'),  value: 'IN_PERSON' as ContactChannel }
])

// ── Create / Edit dialog ──────────────────────────────────────────────
const showDialog = ref(false)
const editingEvent = ref<CalendarEvent | null>(null)
const saving = ref(false)

const form = ref<{
  title: string
  eventType: CalendarEventType
  startAt: Date | null
  endAt: Date | null
  allDay: boolean
  durationMinutes: number
  clientId: string | null
  contactChannel: ContactChannel | null
  assigneeIds: string[]
  notes: string
  description: string
}>({
  title: '',
  eventType: 'MEETING',
  startAt: null,
  endAt: null,
  allDay: false,
  durationMinutes: 60,
  clientId: null,
  contactChannel: null,
  assigneeIds: [],
  notes: '',
  description: ''
})

// ── Update end time when start or duration changes ─────────────────────
watch(() => form.value.startAt, (newStart) => {
  if (newStart && !form.value.allDay && form.value.endAt) {
    const start = dayjs(newStart)
    const end = start.add(form.value.durationMinutes, 'minute')
    form.value.endAt = end.toDate()
  }
})

watch(() => form.value.durationMinutes, (newDuration) => {
  if (form.value.startAt && !form.value.allDay && form.value.endAt) {
    const start = dayjs(form.value.startAt)
    const end = start.add(newDuration, 'minute')
    form.value.endAt = end.toDate()
  }
})

watch(() => form.value.allDay, (isAllDay) => {
  if (isAllDay && form.value.startAt) {
    const start = dayjs(form.value.startAt)
    form.value.endAt = start.endOf('day').toDate()
  }
})

function openCreate(date?: dayjs.Dayjs) {
  editingEvent.value = null
  const base = date ?? dayjs()
  const defaultDuration = eventTypeDefaultDuration['MEETING']
  
  form.value = {
    title: '',
    eventType: 'MEETING',
    startAt: base.hour(9).minute(0).toDate(),
    endAt: base.hour(10).minute(0).toDate(),
    allDay: false,
    durationMinutes: defaultDuration,
    clientId: filterClient.value,
    contactChannel: null,
    assigneeIds: [],
    notes: '',
    description: ''
  }
  showDialog.value = true
}

function openEdit(event: CalendarEvent) {
  editingEvent.value = event
  const start = dayjs(event.startAt)
  const end = dayjs(event.endAt)
  const durationMinutes = end.diff(start, 'minute')
  
  form.value = {
    title: event.title,
    eventType: event.eventType,
    startAt: start.toDate(),
    endAt: end.toDate(),
    allDay: durationMinutes >= 480,
    durationMinutes: durationMinutes,
    clientId: event.clientId ?? null,
    contactChannel: event.contactChannel ?? null,
    assigneeIds: event.assigneeIds ?? [],
    notes: event.notes ?? '',
    description: event.description ?? ''
  }
  showDialog.value = true
}

async function saveEvent() {
  if (!form.value.title.trim() || !form.value.startAt || !form.value.endAt) return
  saving.value = true
  try {
    const body: CreateCalendarEventRequest = {
      title: form.value.title.trim(),
      eventType: form.value.eventType,
      startAt: new Date(form.value.startAt).toISOString(),
      endAt: new Date(form.value.endAt).toISOString(),
      clientId: form.value.clientId ?? undefined,
      contactChannel: form.value.contactChannel ?? undefined,
      assigneeIds: form.value.assigneeIds.length > 0 ? form.value.assigneeIds : undefined,
      notes: form.value.notes.trim() || undefined,
      description: form.value.description.trim() || undefined
    }
    if (editingEvent.value) {
      await calendarService.update(editingEvent.value.id, body)
      toast.success(t('common.save'))
    } else {
      await calendarService.create(body)
      toast.success(t('calendar.newEvent'))
    }
    showDialog.value = false
    refetch()
  } catch {
    toast.error(t('errors.loadFailed'))
  } finally {
    saving.value = false
  }
}

// ── Event detail drawer ───────────────────────────────────────────────
const selectedEvent = ref<CalendarEvent | null>(null)
const showDetail = ref(false)

function openDetail(event: CalendarEvent) {
  selectedEvent.value = event
  showDetail.value = true
}

async function markStatus(event: CalendarEvent, status: CalendarEventStatus) {
  try {
    await calendarService.patchStatus(event.id, status)
    toast.success(t(`calendar.status${status.charAt(0) + status.slice(1).toLowerCase()}`))
    showDetail.value = false
    refetch()
  } catch {
    toast.error(t('errors.loadFailed'))
  }
}

// ── Reminders ────────────────────────────────────────────────────────
const showReminderDialog = ref(false)

async function completeReminder(reminder: ClientReminder) {
  try {
    await remindersService.complete(reminder.id)
    toast.success(t('calendar.reminderCompleted') || 'Reminder completed')
    refetchReminders()
  } catch {
    toast.error(t('errors.loadFailed'))
  }
}

async function snoozeReminder(reminder: ClientReminder) {
  try {
    await remindersService.snooze(reminder.id, 1)
    toast.success(t('calendar.reminderSnoozed') || 'Reminder snoozed for 1 day')
    refetchReminders()
  } catch {
    toast.error(t('errors.loadFailed'))
  }
}

function confirmDelete(event: CalendarEvent) {
  confirm.require({
    message: t('calendar.deleteConfirm'),
    header: t('calendar.deleteEvent'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: async () => {
      try {
        await calendarService.delete(event.id)
        showDetail.value = false
        refetch()
        toast.success(t('common.delete'))
      } catch {
        toast.error(t('errors.loadFailed'))
      }
    }
  })
}

function eventTypeLabel(type: CalendarEventType): string {
  const map: Record<CalendarEventType, string> = {
    CALL: t('calendar.eventTypeCall'),
    MEETING: t('calendar.eventTypeMeeting'),
    SITE_VISIT: t('calendar.eventTypeSiteVisit'),
    DEMO: t('calendar.eventTypeDemo'),
    FOLLOW_UP: t('calendar.eventTypeFollowUp'),
    WHATSAPP: t('calendar.eventTypeWhatsapp'),
    INSTAGRAM: t('calendar.eventTypeInstagram'),
    OTHER: t('calendar.eventTypeOther')
  }
  return map[type] ?? type
}

function statusLabel(s: CalendarEventStatus): string {
  const map: Record<CalendarEventStatus, string> = {
    SCHEDULED: t('calendar.statusScheduled'),
    COMPLETED: t('calendar.statusCompleted'),
    CANCELLED: t('calendar.statusCancelled'),
    NO_SHOW: t('calendar.statusNoShow')
  }
  return map[s] ?? s
}

function statusSeverity(s: CalendarEventStatus): string {
  const map: Record<CalendarEventStatus, string> = {
    SCHEDULED: 'info',
    COMPLETED: 'success',
    CANCELLED: 'secondary',
    NO_SHOW: 'warn'
  }
  return map[s] ?? 'secondary'
}

function formatDateTime(iso: string): string {
  return dayjs(iso).format('DD MMM YYYY HH:mm')
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-4">
        <h1 class="text-xl font-semibold text-[var(--text)]">{{ t('calendar.title') }}</h1>
        <Tabs v-model:value="activeTab" class="ml-4">
          <TabList>
            <Tab value="events">{{ t('calendar.events') || 'Events' }}</Tab>
            <Tab value="reminders">{{ t('calendar.reminders') || 'Reminders' }}</Tab>
          </TabList>
        </Tabs>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Agent filter -->
        <Select
          v-model="filterAssignee"
          :options="assigneeSelectOpts"
          option-label="label"
          option-value="value"
          class="w-44"
          :placeholder="t('calendar.filterAgent')"
        />
        <!-- Client filter -->
        <Select
          v-model="filterClient"
          :options="clientSelectOpts"
          option-label="label"
          option-value="value"
          class="w-44"
          :placeholder="t('calendar.filterClient')"
          filter
        />
        <Button
          v-if="canWrite"
          :label="t('calendar.newEvent')"
          icon="pi pi-plus"
          @click="openCreate()"
        />
      </div>
    </div>

    <!-- KPI strip -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-center">
        <p class="text-2xl font-bold text-[var(--text)]">{{ kpi.total }}</p>
        <p class="text-xs text-[var(--text-muted)] mt-0.5">{{ t('calendar.totalMonth') }}</p>
      </div>
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-center">
        <p class="text-2xl font-bold text-green-600">{{ kpi.completed }}</p>
        <p class="text-xs text-[var(--text-muted)] mt-0.5">{{ t('calendar.completed') }}</p>
      </div>
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-center">
        <p class="text-2xl font-bold text-blue-600">{{ kpi.pending }}</p>
        <p class="text-xs text-[var(--text-muted)] mt-0.5">{{ t('calendar.pending') }}</p>
      </div>
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-center">
        <p class="text-2xl font-bold text-red-600">{{ kpi.overdue }}</p>
        <p class="text-xs text-[var(--text-muted)] mt-0.5">{{ t('calendar.overdue') }}</p>
      </div>
    </div>

    <!-- Month navigation -->
    <div class="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2">
      <Button icon="pi pi-chevron-left" text rounded @click="prevMonth" />
      <h2 class="text-base font-semibold text-[var(--text)] capitalize">{{ monthLabel }}</h2>
      <div class="flex items-center gap-1">
        <Button :label="t('calendar.today')" size="small" text @click="goToday" />
        <Button icon="pi pi-chevron-right" text rounded @click="nextMonth" />
      </div>
    </div>

    <!-- Content based on active tab -->
    <div v-if="activeTab === 'events'" class="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <!-- Calendar grid -->
      <!-- Day-of-week header -->
      <div class="grid grid-cols-7 border-b border-[var(--border)]">
        <div
          v-for="day in weekDayLabels"
          :key="day"
          class="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]"
        >
          {{ day }}
        </div>
      </div>

      <!-- Day cells -->
      <div class="grid grid-cols-7">
        <div
          v-for="(cell, idx) in calendarDays"
          :key="idx"
          class="min-h-[100px] border-b border-r border-[var(--border)] p-1.5 last:border-r-0 transition-colors cursor-pointer"
          :class="[
            cell.isCurrentMonth ? 'bg-[var(--surface)]' : 'bg-[var(--surface-raised)]/40',
            cell.date.isSame(dayjs(), 'day') ? 'ring-1 ring-inset ring-[var(--primary)]/40' : ''
          ]"
          @dblclick="canWrite && cell.isCurrentMonth && openCreate(cell.date)"
        >
          <!-- Date number -->
          <div class="flex items-center justify-between mb-1">
            <span
              class="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full"
              :class="[
                cell.date.isSame(dayjs(), 'day')
                  ? 'bg-[var(--primary)] text-white'
                  : cell.isCurrentMonth
                    ? 'text-[var(--text)]'
                    : 'text-[var(--text-placeholder)]'
              ]"
            >{{ cell.date.date() }}</span>
            <button
              v-if="canWrite && cell.isCurrentMonth"
              type="button"
              class="opacity-0 hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--primary)] transition-opacity"
              @click="openCreate(cell.date)"
            >
              <span class="pi pi-plus text-[10px]" />
            </button>
          </div>

          <!-- Events pills -->
          <div class="space-y-0.5">
            <button
              v-for="event in cell.events.slice(0, 3)"
              :key="event.id"
              type="button"
              class="w-full text-left text-[10px] text-white font-medium px-1.5 py-0.5 rounded truncate leading-tight"
              :class="[eventColor(event.eventType), statusOpacity(event.status)]"
              @click="openDetail(event)"
            >{{ event.title }}</button>
            <div v-if="cell.events.length > 3" class="text-[10px] text-[var(--text-muted)] pl-1">
              +{{ cell.events.length - 3 }} más
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reminders list -->
    <div v-else-if="activeTab === 'reminders'" class="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div class="p-4">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">{{ t('calendar.reminders') || 'Client Reminders' }}</h2>
          <Button v-if="canWrite" :label="t('calendar.newReminder') || 'New Reminder'" icon="pi pi-plus" size="small" @click="showReminderDialog = true" />
        </div>
        
        <div v-if="!reminders?.length" class="text-center py-8 text-[var(--text-muted)]">
          {{ t('calendar.noReminders') || 'No reminders configured' }}
        </div>
        
        <div v-else class="space-y-2">
          <div
            v-for="reminder in reminders"
            :key="reminder.id"
            class="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-hover)]"
          >
            <div class="flex-1">
              <p class="font-medium">{{ reminder.title }}</p>
              <p v-if="reminder.description" class="text-sm text-[var(--text-muted)]">{{ reminder.description }}</p>
              <p class="text-xs text-[var(--text-muted)]">
                {{ t('calendar.nextDue') || 'Next due' }}: {{ dayjs(reminder.nextDueDate).format('DD/MM/YYYY HH:mm') }}
                <span v-if="reminder.occurrencesCount"> ({{ reminder.occurrencesCount }} {{ t('calendar.completed') || 'completed' }})</span>
              </p>
            </div>
            <div class="flex items-center gap-2">
              <Tag :value="reminder.status" :severity="reminder.status === 'ACTIVE' ? 'success' : 'secondary'" />
              <Button v-if="reminder.status === 'ACTIVE'" icon="pi pi-check" size="small" outlined @click="completeReminder(reminder)" :aria-label="t('calendar.completeReminder')" />
              <Button v-if="reminder.status === 'ACTIVE'" icon="pi pi-clock" size="small" text @click="snoozeReminder(reminder)" :aria-label="t('calendar.snoozeReminder')" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Color legend -->
    <div class="flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
      <div v-for="opt in eventTypeOpts" :key="opt.value" class="flex items-center gap-1">
        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :class="eventColor(opt.value)" />
        {{ opt.label }}
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <Dialog
      v-model:visible="showDialog"
      :header="editingEvent ? t('calendar.editEvent') : t('calendar.newEvent')"
      modal
      class="w-full max-w-lg"
    >
      <div class="flex flex-col gap-3 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('calendar.eventTitle') }} *</label>
          <InputText v-model="form.title" class="w-full" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('calendar.eventType') }} *</label>
            <Select v-model="form.eventType" :options="eventTypeOpts" option-label="label" option-value="value" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('calendar.contactChannel') }}</label>
            <Select v-model="form.contactChannel" :options="channelOpts" option-label="label" option-value="value" class="w-full" show-clear />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- All day toggle + Start time -->
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-2 mb-1">
              <ToggleSwitch v-model="form.allDay" input-id="allDay" />
              <label class="text-sm font-medium cursor-pointer" for="allDay">Todo el día</label>
            </div>
            <div v-if="!form.allDay">
              <label class="text-xs text-[var(--text-muted)]">Fecha y hora de inicio</label>
              <DatePicker
                v-model="form.startAt"
                showTime
                hourFormat="24"
                dateFormat="dd/mm/yy"
                class="w-full"
                :showIcon="false"
                :manualInput="true"
                placeholder="Seleccionar fecha y hora"
              />
            </div>
            <div v-else>
              <DatePicker v-model="form.startAt" dateFormat="dd/mm/yy" class="w-full" :showIcon="false" :manualInput="true" />
            </div>
          </div>

          <!-- Duration or End time -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ form.allDay ? 'Fin del día' : 'Duración' }}</label>
            <div v-if="!form.allDay" class="flex flex-wrap gap-1">
              <button
                v-for="preset in durationPresets"
                :key="preset.value"
                type="button"
                class="text-xs px-2 py-1 rounded-full border transition-colors"
                :class="form.durationMinutes === preset.value 
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]' 
                  : 'border-[var(--border)] hover:border-[var(--primary)]'"
                @click="form.durationMinutes = preset.value"
              >{{ preset.label }}</button>
            </div>
            <div v-else class="text-sm text-[var(--text-muted)]">
              Finaliza al medianoche
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('calendar.client') }}</label>
          <Select
            v-model="form.clientId"
            :options="clientDialogOpts"
            option-label="label"
            option-value="value"
            class="w-full"
            show-clear
            filter
            :placeholder="t('calendar.noClientSelected')"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('calendar.assignees') }}</label>
          <MultiSelect
            v-model="form.assigneeIds"
            :options="assigneeDialogOpts"
            option-label="label"
            option-value="value"
            class="w-full"
            filter
            :max-selected-labels="3"
            :placeholder="t('kanban.unassigned')"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('calendar.notes') }}</label>
          <Textarea v-model="form.notes" rows="2" class="w-full" />
        </div>

        <div class="flex justify-end gap-2 pt-1">
          <Button :label="t('common.cancel')" severity="secondary" outlined @click="showDialog = false" />
          <Button
            :label="t('common.save')"
            :loading="saving"
            :disabled="!form.title.trim() || !form.startAt || !form.endAt"
            @click="saveEvent"
          />
        </div>
      </div>
    </Dialog>

    <!-- Event detail drawer (Dialog used as side panel) -->
    <Dialog
      v-model:visible="showDetail"
      :header="selectedEvent?.title"
      modal
      class="w-full max-w-md"
      @hide="selectedEvent = null"
    >
      <div v-if="selectedEvent" class="flex flex-col gap-4 pt-1">
        <!-- Type + Status -->
        <div class="flex items-center gap-2 flex-wrap">
          <span
            class="text-[11px] font-bold text-white px-2 py-0.5 rounded-full"
            :class="eventColor(selectedEvent.eventType)"
          >{{ eventTypeLabel(selectedEvent.eventType) }}</span>
          <Tag :severity="statusSeverity(selectedEvent.status)" class="text-xs">
            {{ statusLabel(selectedEvent.status) }}
          </Tag>
        </div>

        <!-- Dates -->
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p class="text-[var(--text-muted)] text-xs">{{ t('calendar.startAt') }}</p>
            <p class="font-medium text-[var(--text)]">{{ formatDateTime(selectedEvent.startAt) }}</p>
          </div>
          <div>
            <p class="text-[var(--text-muted)] text-xs">{{ t('calendar.endAt') }}</p>
            <p class="font-medium text-[var(--text)]">{{ formatDateTime(selectedEvent.endAt) }}</p>
          </div>
        </div>

        <!-- Client -->
        <div v-if="selectedEvent.clientName" class="text-sm">
          <p class="text-[var(--text-muted)] text-xs">{{ t('calendar.client') }}</p>
          <p class="font-medium text-[var(--text)]">{{ selectedEvent.clientName }}</p>
        </div>

        <!-- Channel -->
        <div v-if="selectedEvent.contactChannel" class="text-sm">
          <p class="text-[var(--text-muted)] text-xs">{{ t('calendar.contactChannel') }}</p>
          <p class="font-medium text-[var(--text)]">{{ selectedEvent.contactChannel }}</p>
        </div>

        <!-- Notes -->
        <div v-if="selectedEvent.notes" class="text-sm">
          <p class="text-[var(--text-muted)] text-xs mb-1">{{ t('calendar.notes') }}</p>
          <p class="text-[var(--text)] whitespace-pre-wrap">{{ selectedEvent.notes }}</p>
        </div>

        <!-- Actions -->
        <div v-if="canWrite" class="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
          <Button
            :label="t('common.edit')"
            icon="pi pi-pencil"
            outlined
            size="small"
            @click="() => { showDetail = false; openEdit(selectedEvent!) }"
          />
          <Button
            v-if="selectedEvent.status === 'SCHEDULED'"
            :label="t('calendar.markCompleted')"
            icon="pi pi-check"
            severity="success"
            outlined
            size="small"
            @click="markStatus(selectedEvent!, 'COMPLETED')"
          />
          <Button
            v-if="selectedEvent.status === 'SCHEDULED'"
            :label="t('calendar.markCancelled')"
            icon="pi pi-times"
            severity="secondary"
            outlined
            size="small"
            @click="markStatus(selectedEvent!, 'CANCELLED')"
          />
          <Button
            :label="t('common.delete')"
            icon="pi pi-trash"
            severity="danger"
            text
            size="small"
            @click="confirmDelete(selectedEvent!)"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>
