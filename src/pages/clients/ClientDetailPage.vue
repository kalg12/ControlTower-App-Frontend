<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useForm } from 'vee-validate'
import { useConfirm } from 'primevue/useconfirm'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Card from '@/components/ui/Card.vue'
import AppDialog from '@/components/ui/AppDialog.vue'
import FormField from '@/components/ui/FormField.vue'
import { clientsService } from '@/services/clients.service'
import { crmService } from '@/services/crm.service'
import { financeService } from '@/services/finance.service'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import type { Client, ClientBranch, ClientContact, CreateContactRequest, ClientInteraction, ClientOpportunity, InteractionType, OpportunityStage } from '@/types/client'
import {
  Users, Activity, TrendingUp, DollarSign, Ticket
} from 'lucide-vue-next'
import { ticketsService } from '@/services/tickets.service'
import type { Ticket as TicketType } from '@/types/ticket'
import NotesPanel from '@/components/notes/NotesPanel.vue'

const { t, locale } = useI18n()
watch(locale, (loc) => { dayjs.locale(loc === 'es' ? 'es' : 'en') }, { immediate: true })

const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()

const id = computed(() => route.params.id as string)
const activeTab = ref('overview')

// ── Basic Data ──────────────────────────────────────────────────────

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

// ── CRM: Interactions ───────────────────────────────────────────────

const { data: interactionsPage, isLoading: interactionsLoading, refetch: refetchInteractions } = useQuery({
  queryKey: computed(() => ['interactions', id.value]),
  queryFn: () => crmService.getInteractions(id.value, { page: 0, size: 20 }),
  staleTime: 15000,
  enabled: computed(() => !!id.value)
})
const interactions = computed(() => interactionsPage.value?.content ?? [])

// ── CRM: Opportunities ──────────────────────────────────────────────

const { data: opportunitiesPage, isLoading: oppsLoading, refetch: refetchOpps } = useQuery({
  queryKey: computed(() => ['opportunities', id.value]),
  queryFn: () => crmService.getOpportunities(id.value, { page: 0, size: 20 }),
  staleTime: 15000,
  enabled: computed(() => !!id.value)
})
const opportunities = computed(() => opportunitiesPage.value?.content ?? [])

// ── Tickets ──────────────────────────────────────────────────────────

const { data: ticketsPage, isLoading: ticketsLoading } = useQuery({
  queryKey: computed(() => ['tickets-client', id.value]),
  queryFn: () => ticketsService.list({ clientId: id.value, size: 50 }),
  staleTime: 15000,
  enabled: computed(() => !!id.value)
})
const clientTickets = computed(() => ticketsPage.value?.content ?? [])

// ── Finance summary ────────────────────────────────────────────────────
const { data: financeSummary, isLoading: financeLoading } = useQuery({
  queryKey: computed(() => ['client-finance-summary', id.value]),
  queryFn: () => financeService.getClientSummary(id.value),
  staleTime: 30_000,
  enabled: computed(() => !!id.value)
})

function fmtCurrency(n?: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}

function ticketStatusSeverity(status: string): 'info' | 'warn' | 'success' | 'danger' | 'secondary' {
  const map: Record<string, 'info' | 'warn' | 'success' | 'danger' | 'secondary'> = {
    OPEN: 'info', IN_PROGRESS: 'warn', WAITING: 'warn', RESOLVED: 'success', CLOSED: 'secondary'
  }
  return map[status] ?? 'secondary'
}

// ── Pipeline helpers ──────────────────────────────────────────────────
const pipelineValue = computed(() => {
  return opportunities.value
    .filter(o => !['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage))
    .reduce((sum, o) => sum + (o.value ?? 0), 0)
})

const wonRevenue = computed(() => {
  return opportunities.value
    .filter(o => o.stage === 'CLOSED_WON')
    .reduce((sum, o) => sum + (o.value ?? 0), 0)
})

// ── Helpers ──────────────────────────────────────────────────────────

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

function formatDateTime(dateStr: string) {
  return dayjs(dateStr).format('DD MMM YYYY, HH:mm')
}

function formatCurrency(value?: number, currency?: string) {
  if (!value && value !== 0) return '—'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency || 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function healthScoreColor(score?: number) {
  if (!score && score !== 0) return 'text-gray-400'
  if (score >= 80) return 'text-green-500'
  if (score >= 50) return 'text-amber-500'
  return 'text-red-500'
}

function interactionTypeLabel(type: InteractionType) {
  const map: Record<string, string> = {
    CALL: t('crm.typeCall'),
    MEETING: t('crm.typeMeeting'),
    EMAIL: t('crm.typeEmail'),
    MESSAGE: t('crm.typeMessage'),
    SITE_VISIT: t('crm.typeSiteVisit'),
    DEMO: t('crm.typeDemo'),
    SUPPORT: t('crm.typeSupport'),
    FOLLOW_UP: t('crm.typeFollowUp'),
    OTHER: t('crm.typeOther'),
  }
  return map[type] || type
}

function stageLabel(stage: OpportunityStage) {
  const map: Record<string, string> = {
    PROSPECTING: t('crm.stageProspecting'),
    QUALIFIED: t('crm.stageQualified'),
    DEMO_SCHEDULED: t('crm.stageDemoScheduled'),
    PROPOSAL_SENT: t('crm.stageProposalSent'),
    NEGOTIATION: t('crm.stageNegotiation'),
    VERBAL_COMMIT: t('crm.stageVerbalCommit'),
    CLOSED_WON: t('crm.stageClosedWon'),
    CLOSED_LOST: t('crm.stageClosedLost'),
  }
  return map[stage] || stage
}

function stageSeverity(stage: OpportunityStage): 'success' | 'danger' | 'warn' | 'info' | 'secondary' {
  if (stage === 'CLOSED_WON') return 'success'
  if (stage === 'CLOSED_LOST') return 'danger'
  if (stage === 'NEGOTIATION' || stage === 'VERBAL_COMMIT') return 'warn'
  return 'info'
}

// ── Edit Client ─────────────────────────────────────────────────────

const showEditDialog = ref(false)
const isEditSubmitting = ref(false)

const clientSchema = z.object({
  name: z.string().min(2, 'Min 2 characters'),
  legalName: z.string().optional(),
  taxId: z.string().optional(),
  country: z.string().min(2),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  industry: z.string().optional(),
  segment: z.enum(['', 'SMB', 'MID_MARKET', 'ENTERPRISE']).optional(),
  notes: z.string().optional(),
})

const editForm = useForm({
  validationSchema: toTypedSchema(clientSchema),
  initialValues: { name: '', legalName: '', taxId: '', country: 'MX', website: '', industry: '', segment: '' as '', notes: '' }
})

const [editName, editNameAttrs] = editForm.defineField('name')
const [editLegalName, editLegalNameAttrs] = editForm.defineField('legalName')
const [editTaxId, editTaxIdAttrs] = editForm.defineField('taxId')
const [editCountry, editCountryAttrs] = editForm.defineField('country')
const [editWebsite, editWebsiteAttrs] = editForm.defineField('website')
const [editIndustry, editIndustryAttrs] = editForm.defineField('industry')
const [editSegment] = editForm.defineField('segment')
const [editNotes, editNotesAttrs] = editForm.defineField('notes')

function openEditDialog(c: Client) {
  editForm.setValues({
    name: c.name, legalName: c.legalName ?? '', taxId: c.taxId ?? '',
    country: c.country ?? 'MX', website: c.website ?? '', industry: c.industry ?? '',
    segment: (c.segment ?? '') as '', notes: c.notes ?? '',
  })
  showEditDialog.value = true
}

const onEditSubmit = editForm.handleSubmit(async (values) => {
  isEditSubmitting.value = true
  try {
    await clientsService.update(id.value, {
      name: values.name, legalName: values.legalName || undefined,
      taxId: values.taxId || undefined, country: values.country,
      website: values.website || undefined, industry: values.industry || undefined,
      segment: values.segment || undefined, notes: values.notes || undefined,
    })
    await queryClient.invalidateQueries({ queryKey: ['client', id.value] })
    await queryClient.invalidateQueries({ queryKey: ['clients'] })
    showEditDialog.value = false
    toast.success(t('common.save'))
  } catch {
    toast.error(t('errors.loadFailed'))
  } finally {
    isEditSubmitting.value = false
  }
})

// ── Branches ─────────────────────────────────────────────────────────

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

function openBranchDialog() {
  branchForm.resetForm()
  showBranchDialog.value = true
}

const onSubmitBranch = branchForm.handleSubmit(async (values) => {
  isSubmittingBranch.value = true
  try {
    await clientsService.createBranch(id.value, {
      name: values.name, address: values.address || undefined,
      city: values.city || undefined, country: values.country, timezone: values.timezone
    })
    await queryClient.invalidateQueries({ queryKey: ['branches', id.value] })
    showBranchDialog.value = false
    toast.success('Branch created')
  } catch {
    toast.error('Failed to create branch')
  } finally {
    isSubmittingBranch.value = false
  }
})

// ── Edit Branch ──────────────────────────────────────────────────────

const showEditBranchDialog = ref(false)
const editingBranch = ref<ClientBranch | null>(null)
const isEditingBranch = ref(false)

const editBranchForm = useForm({
  validationSchema: toTypedSchema(z.object({
    name: z.string().min(2, 'Min 2 characters'),
    address: z.string().optional(),
    city: z.string().optional(),
    isActive: z.boolean()
  })),
  initialValues: { name: '', address: '', city: '', isActive: true }
})

const [ebName, ebNameAttrs] = editBranchForm.defineField('name')
const [ebAddress, ebAddressAttrs] = editBranchForm.defineField('address')
const [ebCity, ebCityAttrs] = editBranchForm.defineField('city')

function openEditBranchDialog(branch: ClientBranch) {
  editingBranch.value = branch
  editBranchForm.setValues({
    name: branch.name, address: branch.address ?? '',
    city: branch.city ?? '', isActive: branch.isActive ?? true
  })
  showEditBranchDialog.value = true
}

const onEditBranchSubmit = editBranchForm.handleSubmit(async (values) => {
  if (!editingBranch.value) return
  isEditingBranch.value = true
  try {
    await clientsService.updateBranch(id.value, editingBranch.value.id, {
      name: values.name, address: values.address || undefined,
      city: values.city || undefined, isActive: values.isActive
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

function confirmDeleteBranch(branch: ClientBranch) {
  confirm.require({
    message: `Delete branch "${branch.name}"?`,
    header: 'Delete Branch',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
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

// ── Contacts ─────────────────────────────────────────────────────────

const showContactDialog = ref(false)
const editingContact = ref<ClientContact | null>(null)
const isSubmittingContact = ref(false)

const contactRoleOptions = computed(() => [
  { label: t('clientsPage.contactRoleOwner'),     value: 'OWNER' },
  { label: t('clientsPage.contactRoleTechnical'), value: 'TECHNICAL' },
  { label: t('clientsPage.contactRoleBilling'),   value: 'BILLING' },
  { label: t('clientsPage.contactRoleSupport'),   value: 'SUPPORT' },
])

const segmentOptions = computed(() => [
  { label: t('clientsPage.segmentNone'),       value: '' },
  { label: t('clientsPage.segmentSmb'),        value: 'SMB' },
  { label: t('clientsPage.segmentMidMarket'),  value: 'MID_MARKET' },
  { label: t('clientsPage.segmentEnterprise'), value: 'ENTERPRISE' },
])

const contactForm = useForm({
  validationSchema: toTypedSchema(z.object({
    fullName: z.string().min(2, 'Min 2 characters'),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().optional(),
    role: z.string().min(1, 'Select a role'),
    primary: z.boolean(),
    notes: z.string().optional(),
  })),
  initialValues: { fullName: '', email: '', phone: '', role: 'OWNER', primary: false, notes: '' },
})

const [cfFullName, cfFullNameAttrs] = contactForm.defineField('fullName')
const [cfEmail, cfEmailAttrs] = contactForm.defineField('email')
const [cfPhone, cfPhoneAttrs] = contactForm.defineField('phone')
const [cfRole] = contactForm.defineField('role')
const [cfNotes, cfNotesAttrs] = contactForm.defineField('notes')

function openAddContact() {
  editingContact.value = null
  contactForm.resetForm()
  showContactDialog.value = true
}

function openEditContact(c: ClientContact) {
  editingContact.value = c
  contactForm.setValues({
    fullName: c.fullName, email: c.email ?? '', phone: c.phone ?? '',
    role: c.role, primary: c.primary, notes: c.notes ?? ''
  })
  showContactDialog.value = true
}

const onSubmitContact = contactForm.handleSubmit(async (values) => {
  isSubmittingContact.value = true
  const payload: CreateContactRequest = {
    fullName: values.fullName, email: values.email || undefined,
    phone: values.phone || undefined, role: values.role,
    primary: values.primary, notes: values.notes || undefined
  }
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
    message: `Remove ${c.fullName}?`,
    header: 'Remove Contact',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
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

// ── CRM: Log Interaction ─────────────────────────────────────────────

const showInteractionDialog = ref(false)
const isSubmittingInteraction = ref(false)

const interactionTypeOptions = [
  { label: t('crm.typeCall'), value: 'CALL' },
  { label: t('crm.typeMeeting'), value: 'MEETING' },
  { label: t('crm.typeEmail'), value: 'EMAIL' },
  { label: t('crm.typeMessage'), value: 'MESSAGE' },
  { label: t('crm.typeSiteVisit'), value: 'SITE_VISIT' },
  { label: t('crm.typeDemo'), value: 'DEMO' },
  { label: t('crm.typeSupport'), value: 'SUPPORT' },
  { label: t('crm.typeFollowUp'), value: 'FOLLOW_UP' },
  { label: t('crm.typeOther'), value: 'OTHER' },
]

const interactionSchema = z.object({
  title: z.string().min(2, 'Min 2 characters'),
  description: z.string().optional(),
  interactionType: z.string().min(1, 'Select a type'),
  branchId: z.string().optional(),
  occurredAt: z.string().optional(),
  outcome: z.string().optional(),
  durationMinutes: z.string().optional(),
})

const interactionForm = useForm({
  validationSchema: toTypedSchema(interactionSchema),
  initialValues: { title: '', description: '', interactionType: 'CALL', branchId: '', occurredAt: '', outcome: '', durationMinutes: undefined },
})

const [intTitle, intTitleAttrs] = interactionForm.defineField('title')
const [intDesc, intDescAttrs] = interactionForm.defineField('description')
const [intType] = interactionForm.defineField('interactionType')
const [intBranch] = interactionForm.defineField('branchId')
const [intOutcome, intOutcomeAttrs] = interactionForm.defineField('outcome')
const [intDuration] = interactionForm.defineField('durationMinutes')

function openLogInteraction() {
  interactionForm.resetForm()
  showInteractionDialog.value = true
}

const onSubmitInteraction = interactionForm.handleSubmit(async (values) => {
  isSubmittingInteraction.value = true
  try {
    await crmService.logInteraction(id.value, {
      title: values.title,
      description: values.description || undefined,
      interactionType: values.interactionType as InteractionType,
      branchId: values.branchId || undefined,
      occurredAt: values.occurredAt || undefined,
      outcome: values.outcome || undefined,
      durationMinutes: values.durationMinutes ? parseInt(values.durationMinutes) : undefined,
    })
    await queryClient.invalidateQueries({ queryKey: ['interactions', id.value] })
    await queryClient.invalidateQueries({ queryKey: ['client', id.value] })
    showInteractionDialog.value = false
    toast.success(t('crm.interactionLogged'))
  } catch {
    toast.error(t('errors.loadFailed'))
  } finally {
    isSubmittingInteraction.value = false
  }
})

function confirmDeleteInteraction(inter: ClientInteraction) {
  confirm.require({
    message: t('crm.deleteInteractionConfirm'),
    header: 'Delete Interaction',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: async () => {
      try {
        await crmService.deleteInteraction(inter.id)
        await queryClient.invalidateQueries({ queryKey: ['interactions', id.value] })
        toast.success(t('crm.interactionDeleted'))
      } catch {
        toast.error(t('errors.loadFailed'))
      }
    }
  })
}

// ── CRM: Create/Edit Opportunity ─────────────────────────────────────

const showOppDialog = ref(false)
const editingOpp = ref<ClientOpportunity | null>(null)
const isSubmittingOpp = ref(false)

const stageOptions = [
  { label: t('crm.stageProspecting'), value: 'PROSPECTING' },
  { label: t('crm.stageQualified'), value: 'QUALIFIED' },
  { label: t('crm.stageDemoScheduled'), value: 'DEMO_SCHEDULED' },
  { label: t('crm.stageProposalSent'), value: 'PROPOSAL_SENT' },
  { label: t('crm.stageNegotiation'), value: 'NEGOTIATION' },
  { label: t('crm.stageVerbalCommit'), value: 'VERBAL_COMMIT' },
  { label: t('crm.stageClosedWon'), value: 'CLOSED_WON' },
  { label: t('crm.stageClosedLost'), value: 'CLOSED_LOST' },
]

const sourceOptions = [
  { label: t('crm.sourceInbound'), value: 'INBOUND' },
  { label: t('crm.sourceOutbound'), value: 'OUTBOUND' },
  { label: t('crm.sourceReferral'), value: 'REFERRAL' },
  { label: t('crm.sourceWebsite'), value: 'WEBSITE' },
  { label: t('crm.sourceExistingClient'), value: 'EXISTING_CLIENT' },
  { label: t('crm.sourceDemoRequest'), value: 'DEMO_REQUEST' },
  { label: t('crm.sourceSupportEscalation'), value: 'SUPPORT_ESCALATION' },
  { label: t('crm.sourceOther'), value: 'OTHER' },
]

const currencyOptions = [
  { label: 'MXN', value: 'MXN' },
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
]

const oppSchema = z.object({
  title: z.string().min(2, 'Min 2 characters'),
  description: z.string().optional(),
  value: z.string().optional(),
  currency: z.string().min(1),
  stage: z.string().min(1),
  expectedCloseDate: z.string().optional(),
  source: z.string().optional(),
  lossReason: z.string().optional(),
})

const oppForm = useForm({
  validationSchema: toTypedSchema(oppSchema),
  initialValues: { title: '', description: '', value: undefined, currency: 'MXN', stage: 'PROSPECTING', expectedCloseDate: '', source: '', lossReason: '' },
})

const [oppTitle, oppTitleAttrs] = oppForm.defineField('title')
const [oppDesc, oppDescAttrs] = oppForm.defineField('description')
const [oppValue] = oppForm.defineField('value')
const [oppCurrency] = oppForm.defineField('currency')
const [oppStage] = oppForm.defineField('stage')
const [oppCloseDate] = oppForm.defineField('expectedCloseDate')
const [oppSource] = oppForm.defineField('source')
const [oppLoss, oppLossAttrs] = oppForm.defineField('lossReason')

function openCreateOpp() {
  editingOpp.value = null
  oppForm.resetForm()
  showOppDialog.value = true
}

function openEditOpp(opp: ClientOpportunity) {
  editingOpp.value = opp
  oppForm.setValues({
    title: opp.title,
    description: opp.description ?? '',
    value: opp.value ? String(opp.value) : undefined,
    currency: opp.currency || 'MXN',
    stage: opp.stage,
    expectedCloseDate: opp.expectedCloseDate ? dayjs(opp.expectedCloseDate).format('YYYY-MM-DD') : '',
    source: opp.source ?? '',
    lossReason: opp.lossReason ?? '',
  })
  showOppDialog.value = true
}

const onSubmitOpp = oppForm.handleSubmit(async (values) => {
  isSubmittingOpp.value = true
  try {
    if (editingOpp.value) {
      await crmService.updateOpportunity(editingOpp.value.id, {
        title: values.title,
        description: values.description || undefined,
        value: values.value ? parseFloat(values.value) : undefined,
        currency: values.currency,
        stage: values.stage as OpportunityStage,
        expectedCloseDate: values.expectedCloseDate ? new Date(values.expectedCloseDate).toISOString() : undefined,
        lossReason: values.lossReason || undefined,
      })
      toast.success(t('crm.oppUpdated'))
    } else {
      await crmService.createOpportunity(id.value, {
        title: values.title,
        description: values.description || undefined,
        value: values.value ? parseFloat(values.value) : undefined,
        currency: values.currency,
        stage: values.stage as OpportunityStage,
        expectedCloseDate: values.expectedCloseDate ? new Date(values.expectedCloseDate).toISOString() : undefined,
      })
      toast.success(t('crm.oppCreated'))
    }
    await queryClient.invalidateQueries({ queryKey: ['opportunities', id.value] })
    await queryClient.invalidateQueries({ queryKey: ['client', id.value] })
    showOppDialog.value = false
  } catch {
    toast.error(t('errors.loadFailed'))
  } finally {
    isSubmittingOpp.value = false
  }
})

function confirmDeleteOpp(opp: ClientOpportunity) {
  confirm.require({
    message: t('crm.deleteOppConfirm'),
    header: 'Delete Opportunity',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: async () => {
      try {
        await crmService.deleteOpportunity(opp.id)
        await queryClient.invalidateQueries({ queryKey: ['opportunities', id.value] })
        toast.success(t('crm.oppDeleted'))
      } catch {
        toast.error(t('errors.loadFailed'))
      }
    }
  })
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4">
      <Button icon="pi pi-arrow-left" :label="t('tickets.backToTickets') || 'Back to Clients'" severity="secondary" text @click="router.push('/clients')" />
      <Button v-if="client && !clientLoading" icon="pi pi-pencil" :label="t('common.edit')" severity="secondary" outlined @click="openEditDialog(client)" />
    </div>

    <!-- Error / Loading -->
    <div v-if="clientError" class="flex flex-col items-center py-16 gap-4">
      <p class="text-[var(--text-muted)]">{{ t('ticketDetail.notFound') }}</p>
      <Button :label="t('tickets.backToTickets')" @click="router.push('/clients')" />
    </div>

    <template v-else-if="clientLoading">
      <div class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-3">
        <Skeleton height="2rem" class="mb-2" />
        <Skeleton height="1rem" width="60%" />
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <Skeleton height="3rem" v-for="i in 4" :key="i" />
        </div>
      </div>
    </template>

    <template v-else-if="client">
      <!-- CRM Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-950 flex items-center justify-center">
              <Activity class="w-4.5 h-4.5 text-green-500" />
            </div>
            <div>
              <p class="text-xs text-[var(--text-muted)]">{{ t('crm.healthScore') }}</p>
              <p class="text-xl font-bold" :class="healthScoreColor(client.healthScore)">
                {{ client.healthScore ?? '—' }}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
              <Users class="w-4.5 h-4.5 text-blue-500" />
            </div>
            <div>
              <p class="text-xs text-[var(--text-muted)]">{{ t('crm.accountOwner') }}</p>
              <p class="text-sm font-medium text-[var(--text)]">{{ client.accountOwnerName || '—' }}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
              <TrendingUp class="w-4.5 h-4.5 text-violet-500" />
            </div>
            <div>
              <p class="text-xs text-[var(--text-muted)]">{{ t('crm.openOpportunities') }}</p>
              <p class="text-xl font-bold text-[var(--text)]">
                {{ opportunities.filter(o => !['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage)).length }}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
              <DollarSign class="w-4.5 h-4.5 text-amber-500" />
            </div>
            <div>
              <p class="text-xs text-[var(--text-muted)]">{{ t('crm.totalPipelineValue') }}</p>
              <p class="text-lg font-bold text-[var(--text)]">{{ formatCurrency(pipelineValue) }}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
              <DollarSign class="w-4.5 h-4.5 text-emerald-500" />
            </div>
            <div>
              <p class="text-xs text-[var(--text-muted)]">{{ t('crm.wonRevenue') }}</p>
              <p class="text-lg font-bold text-green-500">{{ formatCurrency(wonRevenue) }}</p>
            </div>
          </div>
        </Card>
      </div>

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
            <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">{{ t('clientsPage.phone') }}</p>
            <p class="text-sm text-[var(--text)]">{{ client.phone ?? '—' }}</p>
          </div>
          <div>
            <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">{{ t('clientsPage.leadSource') }}</p>
            <p class="text-sm text-[var(--text)]">{{ client.leadSource ?? '—' }}</p>
          </div>
          <div>
            <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Created</p>
            <p class="text-sm text-[var(--text)]">{{ formatDate(client.createdAt) }}</p>
          </div>
          <div v-if="client.website">
            <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Website</p>
            <a :href="client.website" target="_blank" rel="noopener" class="text-sm text-[var(--primary)] hover:underline truncate block">{{ client.website }}</a>
          </div>
        </div>
      </div>

      <!-- Tabs: Overview, Activity, Branches, Contacts, Pipeline -->
      <Tabs v-model:value="activeTab">
        <TabList class="flex gap-1 rounded-xl bg-[var(--surface)] p-1">
          <Tab value="overview">{{ t('crm.tabOverview') }}</Tab>
          <Tab value="activity">{{ t('crm.tabActivity') }}</Tab>
          <Tab value="branches">{{ t('crm.tabBranches') }}</Tab>
          <Tab value="contacts">{{ t('crm.tabContacts') }}</Tab>
          <Tab value="pipeline">{{ t('crm.tabPipeline') }}</Tab>
          <Tab value="tickets">Tickets</Tab>
          <Tab value="finance">{{ t('crm.tabFinance') }}</Tab>
        </TabList>

        <TabPanels class="mt-4">
          <!-- ── Overview Tab ──────────────────────────────────────── -->
          <TabPanel value="overview">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Recent Interactions -->
              <Card>
                <template #header>
                  <div class="flex items-center justify-between">
                    <h3 class="text-sm font-semibold text-[var(--text)]">{{ t('crm.interactions') }}</h3>
                    <span class="text-xs text-[var(--text-muted)]">{{ interactions.length }}</span>
                  </div>
                </template>
                <div v-if="interactionsLoading" class="space-y-2">
                  <Skeleton height="1rem" v-for="i in 3" :key="i" />
                </div>
                <div v-else-if="interactions.length === 0" class="text-center py-6 text-[var(--text-muted)]">
                  {{ t('crm.noInteractions') }}
                </div>
                <div v-else class="space-y-2">
                  <div v-for="inter in interactions.slice(0, 5)" :key="inter.id" class="flex items-start gap-3 px-3 py-2 rounded-lg bg-[var(--surface-raised)]">
                    <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                      <Activity class="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-[var(--text)] truncate">{{ inter.title }}</p>
                      <p class="text-xs text-[var(--text-muted)]">
                        {{ interactionTypeLabel(inter.interactionType) }} · {{ inter.userName }} · {{ formatDateTime(inter.occurredAt) }}
                      </p>
                      <p v-if="inter.outcome" class="text-xs text-[var(--text-muted)] mt-0.5 truncate">{{ inter.outcome }}</p>
                    </div>
                  </div>
                </div>
              </Card>

              <!-- Pipeline Summary -->
              <Card>
                <template #header>
                  <div class="flex items-center justify-between">
                    <h3 class="text-sm font-semibold text-[var(--text)]">{{ t('crm.pipeline') }}</h3>
                    <span class="text-xs text-[var(--text-muted)]">{{ opportunities.length }}</span>
                  </div>
                </template>
                <div v-if="oppsLoading" class="space-y-2">
                  <Skeleton height="1rem" v-for="i in 3" :key="i" />
                </div>
                <div v-else-if="opportunities.length === 0" class="text-center py-6 text-[var(--text-muted)]">
                  {{ t('crm.noOpportunities') }}
                </div>
                <div v-else class="space-y-2">
                  <div v-for="opp in opportunities.slice(0, 5)" :key="opp.id" class="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--surface-raised)]">
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-[var(--text)] truncate">{{ opp.title }}</p>
                      <p class="text-xs text-[var(--text-muted)]">{{ stageLabel(opp.stage as OpportunityStage) }} · {{ opp.ownerName || '—' }}</p>
                    </div>
                    <div class="text-right ml-3 flex-shrink-0">
                      <p class="text-sm font-semibold text-[var(--text)]">{{ formatCurrency(opp.value, opp.currency) }}</p>
                      <Tag :severity="stageSeverity(opp.stage as OpportunityStage)" :value="stageLabel(opp.stage as OpportunityStage)" class="text-xs mt-0.5" />
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <!-- Notes in overview -->
            <NotesPanel linked-to="CLIENT" :linked-id="id" class="mt-6" />
          </TabPanel>

          <!-- ── Activity Tab ──────────────────────────────────────── -->
          <TabPanel value="activity">
            <Card>
              <template #header>
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-semibold text-[var(--text)]">{{ t('crm.activityLog') }}</h3>
                    <p class="text-xs text-[var(--text-muted)]">{{ t('crm.activityLogSubtitle') }}</p>
                  </div>
                  <div class="flex gap-2">
                    <Button icon="pi pi-refresh" severity="secondary" outlined size="small" @click="refetchInteractions()" />
                    <Button :label="t('crm.logInteraction')" icon="pi pi-plus" size="small" @click="openLogInteraction()" />
                  </div>
                </div>
              </template>
              <DataTable :value="interactions" striped-rows class="rounded-xl overflow-hidden">
                <Column field="title" :header="t('crm.title')" style="min-width: 180px">
                  <template #body="{ data: row }: { data: ClientInteraction }">
                    <div>
                      <span class="text-sm font-medium text-[var(--text)]">{{ row.title }}</span>
                      <p v-if="row.description" class="text-xs text-[var(--text-muted)] truncate max-w-xs">{{ row.description }}</p>
                    </div>
                  </template>
                </Column>
                <Column field="interactionType" :header="t('crm.type')" style="width: 120px">
                  <template #body="{ data: row }: { data: ClientInteraction }">
                    <Tag severity="info" :value="interactionTypeLabel(row.interactionType)" />
                  </template>
                </Column>
                <Column field="userName" :header="t('users.user')" style="width: 130px">
                  <template #body="{ data: row }: { data: ClientInteraction }">
                    <span class="text-sm text-[var(--text)]">{{ row.userName }}</span>
                  </template>
                </Column>
                <Column field="outcome" :header="t('crm.outcome')" style="min-width: 160px">
                  <template #body="{ data: row }: { data: ClientInteraction }">
                    <span class="text-sm text-[var(--text-muted)] line-clamp-1">{{ row.outcome ?? '—' }}</span>
                  </template>
                </Column>
                <Column field="occurredAt" :header="t('crm.occurredAt')" style="width: 150px">
                  <template #body="{ data: row }: { data: ClientInteraction }">
                    <span class="text-sm text-[var(--text-muted)]">{{ formatDateTime(row.occurredAt) }}</span>
                  </template>
                </Column>
                <Column :header="t('common.actions')" style="width: 80px">
                  <template #body="{ data: row }: { data: ClientInteraction }">
                    <Button icon="pi pi-trash" severity="danger" text rounded size="small" @click="confirmDeleteInteraction(row)" />
                  </template>
                </Column>
                <template #empty>
                  <div class="text-center py-8 text-[var(--text-muted)]">{{ t('crm.noInteractions') }}</div>
                </template>
              </DataTable>
            </Card>
          </TabPanel>

          <!-- ── Branches Tab ──────────────────────────────────────── -->
          <TabPanel value="branches">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-base font-semibold text-[var(--text)]">
                {{ t('crm.tabBranches') }}
                <span v-if="branches?.length" class="text-[var(--text-muted)] font-normal text-sm ml-1">({{ branches.length }})</span>
              </h3>
              <Button :label="t('clientsPage.addBranch')" icon="pi pi-plus" size="small" @click="openBranchDialog" />
            </div>

            <template v-if="branchesLoading">
              <Skeleton height="1rem" v-for="i in 4" :key="i" class="mb-2" />
            </template>

            <DataTable v-else :value="branches ?? []" striped-rows class="rounded-xl overflow-hidden">
              <Column field="name" :header="t('clientsPage.name')" style="min-width: 160px">
                <template #body="{ data: row }: { data: ClientBranch }">
                  <span class="font-medium text-[var(--text)]">{{ row.name }}</span>
                </template>
              </Column>
              <Column field="slug" :header="t('tenants.slug')" style="min-width: 140px">
                <template #body="{ data: row }: { data: ClientBranch }">
                  <span class="text-[var(--text-muted)] text-sm font-mono">{{ row.slug ?? '—' }}</span>
                </template>
              </Column>
              <Column field="city" :header="t('clientsPage.country')" style="width: 130px">
                <template #body="{ data: row }: { data: ClientBranch }">
                  <span class="text-[var(--text-muted)] text-sm">{{ row.city ?? '—' }}</span>
                </template>
              </Column>
              <Column field="isActive" :header="t('health.status')" style="width: 100px">
                <template #body="{ data: row }: { data: ClientBranch }">
                  <Tag :severity="row.isActive ? 'success' : 'secondary'" :value="row.isActive ? t('health.active') : t('health.inactive')" />
                </template>
              </Column>
              <Column :header="t('common.actions')" style="width: 110px">
                <template #body="{ data: row }: { data: ClientBranch }">
                  <div class="flex gap-1">
                    <Button icon="pi pi-pencil" severity="secondary" text rounded size="small" @click="openEditBranchDialog(row)" />
                    <Button icon="pi pi-trash" severity="danger" text rounded size="small" @click="confirmDeleteBranch(row)" />
                  </div>
                </template>
              </Column>
              <template #empty>
                <div class="text-center py-8 text-[var(--text-muted)]">{{ t('common.noRows') }}</div>
              </template>
            </DataTable>
          </TabPanel>

          <!-- ── Contacts Tab ──────────────────────────────────────── -->
          <TabPanel value="contacts">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-base font-semibold text-[var(--text)]">
                {{ t('crm.tabContacts') }}
                <span v-if="contacts?.length" class="text-[var(--text-muted)] font-normal text-sm ml-1">({{ contacts.length }})</span>
              </h3>
              <Button :label="t('common.create')" icon="pi pi-user-plus" size="small" @click="openAddContact" />
            </div>

            <template v-if="contactsLoading">
              <Skeleton height="1rem" v-for="i in 3" :key="i" class="mb-2" />
            </template>

            <DataTable v-else :value="contacts ?? []" striped-rows class="rounded-xl overflow-hidden">
              <Column field="fullName" :header="t('clientsPage.name')" style="min-width: 160px">
                <template #body="{ data: row }: { data: ClientContact }">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-[var(--text)]">{{ row.fullName }}</span>
                    <Tag v-if="row.primary" :value="t('common.save')" severity="success" class="text-xs" />
                  </div>
                </template>
              </Column>
              <Column field="role" :header="t('users.role')" style="width: 120px">
                <template #body="{ data: row }: { data: ClientContact }">
                  <Tag :value="row.role" severity="secondary" />
                </template>
              </Column>
              <Column field="email" :header="t('users.email')" style="min-width: 180px">
                <template #body="{ data: row }: { data: ClientContact }">
                  <a v-if="row.email" :href="`mailto:${row.email}`" class="text-sm text-[var(--primary)] hover:underline">{{ row.email }}</a>
                  <span v-else class="text-[var(--text-muted)] text-sm">—</span>
                </template>
              </Column>
              <Column field="phone" :header="t('common.actions')" style="width: 140px">
                <template #body="{ data: row }: { data: ClientContact }">
                  <span class="text-sm text-[var(--text-muted)]">{{ row.phone ?? '—' }}</span>
                </template>
              </Column>
              <Column :header="t('common.actions')" style="width: 100px">
                <template #body="{ data: row }: { data: ClientContact }">
                  <div class="flex gap-1">
                    <Button icon="pi pi-pencil" severity="secondary" text rounded size="small" @click="openEditContact(row)" />
                    <Button icon="pi pi-trash" severity="danger" text rounded size="small" @click="confirmDeleteContact(row)" />
                  </div>
                </template>
              </Column>
              <template #empty>
                <div class="text-center py-6 text-[var(--text-muted)]">{{ t('common.noRows') }}</div>
              </template>
            </DataTable>
          </TabPanel>

          <!-- ── Pipeline Tab ──────────────────────────────────────── -->
          <TabPanel value="pipeline">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-base font-semibold text-[var(--text)]">{{ t('crm.pipeline') }}</h3>
                <p class="text-xs text-[var(--text-muted)]">
                  {{ t('crm.totalPipelineValue') }}: {{ formatCurrency(pipelineValue) }}
                  <span v-if="wonRevenue > 0" class="ml-3">{{ t('crm.wonRevenue') }}: {{ formatCurrency(wonRevenue) }}</span>
                </p>
              </div>
              <div class="flex gap-2">
                <Button icon="pi pi-refresh" severity="secondary" outlined size="small" @click="refetchOpps()" />
                <Button :label="t('crm.createOpp')" icon="pi pi-plus" size="small" @click="openCreateOpp()" />
              </div>
            </div>

            <template v-if="oppsLoading">
              <Skeleton height="1rem" v-for="i in 4" :key="i" class="mb-2" />
            </template>

            <DataTable v-else :value="opportunities" striped-rows class="rounded-xl overflow-hidden">
              <Column field="title" :header="t('crm.title')" style="min-width: 180px">
                <template #body="{ data: row }: { data: ClientOpportunity }">
                  <div>
                    <span class="text-sm font-medium text-[var(--text)]">{{ row.title }}</span>
                    <p v-if="row.description" class="text-xs text-[var(--text-muted)] truncate max-w-xs">{{ row.description }}</p>
                  </div>
                </template>
              </Column>
              <Column field="stage" :header="t('crm.stage')" style="width: 140px">
                <template #body="{ data: row }: { data: ClientOpportunity }">
                  <Tag :severity="stageSeverity(row.stage as OpportunityStage)" :value="stageLabel(row.stage as OpportunityStage)" />
                </template>
              </Column>
              <Column field="value" :header="t('crm.value')" style="width: 130px">
                <template #body="{ data: row }: { data: ClientOpportunity }">
                  <span class="text-sm font-semibold text-[var(--text)]">{{ formatCurrency(row.value, row.currency) }}</span>
                </template>
              </Column>
              <Column field="probability" :header="t('crm.probability')" style="width: 100px">
                <template #body="{ data: row }: { data: ClientOpportunity }">
                  <span class="text-sm text-[var(--text-muted)]">{{ row.probability }}%</span>
                </template>
              </Column>
              <Column field="ownerName" :header="t('crm.owner')" style="width: 130px">
                <template #body="{ data: row }: { data: ClientOpportunity }">
                  <span class="text-sm text-[var(--text-muted)]">{{ row.ownerName ?? '—' }}</span>
                </template>
              </Column>
              <Column field="expectedCloseDate" :header="t('crm.expectedCloseDate')" style="width: 150px">
                <template #body="{ data: row }: { data: ClientOpportunity }">
                  <span class="text-sm text-[var(--text-muted)]">{{ row.expectedCloseDate ? formatDate(row.expectedCloseDate) : '—' }}</span>
                </template>
              </Column>
              <Column field="source" :header="t('crm.source')" style="width: 130px">
                <template #body="{ data: row }: { data: ClientOpportunity }">
                  <span class="text-sm text-[var(--text-muted)]">{{ row.source ? row.source.replace('_', ' ') : '—' }}</span>
                </template>
              </Column>
              <Column :header="t('common.actions')" style="width: 100px">
                <template #body="{ data: row }: { data: ClientOpportunity }">
                  <div class="flex gap-1">
                    <Button icon="pi pi-pencil" severity="secondary" text rounded size="small" @click="openEditOpp(row)" />
                    <Button icon="pi pi-trash" severity="danger" text rounded size="small" @click="confirmDeleteOpp(row)" />
                  </div>
                </template>
              </Column>
              <template #empty>
                <div class="text-center py-8 text-[var(--text-muted)]">{{ t('crm.noOpportunities') }}</div>
              </template>
            </DataTable>
          </TabPanel>

          <!-- ── Tickets Tab ──────────────────────────────────────── -->
          <TabPanel value="tickets">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-base font-semibold text-[var(--text)] flex items-center gap-2">
                <Ticket class="w-4 h-4" />
                Historial de tickets
                <span v-if="clientTickets.length" class="text-[var(--text-muted)] font-normal text-sm">({{ clientTickets.length }})</span>
              </h3>
            </div>

            <template v-if="ticketsLoading">
              <Skeleton height="1rem" v-for="i in 4" :key="i" class="mb-2" />
            </template>

            <DataTable
              v-else
              :value="clientTickets"
              striped-rows
              class="rounded-xl overflow-hidden"
              @row-click="(e: { data: TicketType }) => router.push(`/tickets/${e.data.id}`)"
              row-hover
            >
              <Column field="title" header="Título" style="min-width: 200px">
                <template #body="{ data: row }: { data: TicketType }">
                  <span class="text-sm font-medium text-[var(--text)] cursor-pointer hover:underline">{{ row.title }}</span>
                </template>
              </Column>
              <Column field="status" header="Estado" style="width: 130px">
                <template #body="{ data: row }: { data: TicketType }">
                  <Tag :severity="ticketStatusSeverity(row.status)" :value="row.status.replace('_', ' ')" />
                </template>
              </Column>
              <Column field="priority" header="Prioridad" style="width: 110px">
                <template #body="{ data: row }: { data: TicketType }">
                  <Tag
                    :severity="row.priority === 'CRITICAL' || row.priority === 'HIGH' ? 'danger' : row.priority === 'MEDIUM' ? 'warn' : 'secondary'"
                    :value="row.priority"
                  />
                </template>
              </Column>
              <Column field="assigneeName" header="Asignado" style="width: 140px">
                <template #body="{ data: row }: { data: TicketType }">
                  <span class="text-sm text-[var(--text-muted)]">{{ row.assigneeName ?? '—' }}</span>
                </template>
              </Column>
              <Column field="createdAt" header="Creado" style="width: 140px">
                <template #body="{ data: row }: { data: TicketType }">
                  <span class="text-sm text-[var(--text-muted)]">{{ formatDate(row.createdAt) }}</span>
                </template>
              </Column>
              <template #empty>
                <div class="text-center py-8 text-[var(--text-muted)]">Este cliente no tiene tickets aún.</div>
              </template>
            </DataTable>
          </TabPanel>

          <!-- ── FINANCE TAB ─────────────────────────────────────── -->
          <TabPanel value="finance">
            <div class="space-y-4 pt-4">
              <template v-if="financeLoading">
                <Skeleton height="5rem" v-for="i in 4" :key="i" class="rounded-xl" />
              </template>
              <template v-else-if="financeSummary">
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div class="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                    <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">{{ t('finance.summary.totalInvoiced') }}</p>
                    <p class="text-xl font-bold text-[var(--text)]">{{ fmtCurrency(financeSummary.totalInvoiced) }}</p>
                    <p class="text-xs text-[var(--text-muted)] mt-0.5">{{ financeSummary.invoiceCount }} facturas</p>
                  </div>
                  <div class="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                    <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">{{ t('finance.summary.totalPaid') }}</p>
                    <p class="text-xl font-bold text-green-600 dark:text-green-400">{{ fmtCurrency(financeSummary.totalPaid) }}</p>
                    <p class="text-xs text-[var(--text-muted)] mt-0.5">{{ financeSummary.paymentCount }} pagos</p>
                  </div>
                  <div class="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                    <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">{{ t('finance.summary.outstanding') }}</p>
                    <p class="text-xl font-bold" :class="financeSummary.totalOutstanding > 0 ? 'text-orange-500' : 'text-[var(--text)]'">{{ fmtCurrency(financeSummary.totalOutstanding) }}</p>
                  </div>
                  <div class="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                    <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">{{ t('finance.summary.totalExpenses') }}</p>
                    <p class="text-xl font-bold text-red-500">{{ fmtCurrency(financeSummary.totalExpenses) }}</p>
                    <p class="text-xs text-[var(--text-muted)] mt-0.5">{{ financeSummary.expenseCount }} gastos</p>
                  </div>
                </div>
                <div v-if="financeSummary.lastInvoiceAt" class="text-xs text-[var(--text-muted)]">
                  {{ t('finance.summary.lastInvoice') }}: {{ financeSummary.lastInvoiceAt ? new Date(financeSummary.lastInvoiceAt).toLocaleDateString('es-MX') : '—' }}
                </div>
              </template>
              <div v-else class="text-center py-8 text-sm text-[var(--text-muted)]">
                Sin datos financieros para este cliente.
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>
  </div>

  <!-- Edit Client Dialog -->
  <AppDialog v-model:visible="showEditDialog" :title="t('common.edit')" :loading="isEditSubmitting">
    <form class="flex flex-col gap-4" @submit.prevent="onEditSubmit">
      <FormField :label="t('clientsPage.name')" name="edit-name" :error="editForm.errors.value.name" required>
        <InputText id="edit-name" v-model="editName" v-bind="editNameAttrs" class="w-full" :disabled="isEditSubmitting" />
      </FormField>
      <FormField :label="t('clientsPage.legalName')" name="edit-legalName" :error="editForm.errors.value.legalName">
        <InputText id="edit-legalName" v-model="editLegalName" v-bind="editLegalNameAttrs" class="w-full" :disabled="isEditSubmitting" />
      </FormField>
      <FormField :label="t('clientsPage.taxId')" name="edit-taxId" :error="editForm.errors.value.taxId">
        <InputText id="edit-taxId" v-model="editTaxId" v-bind="editTaxIdAttrs" class="w-full" :disabled="isEditSubmitting" />
      </FormField>
      <FormField :label="t('clientsPage.country')" name="edit-country" :error="editForm.errors.value.country" required>
        <InputText id="edit-country" v-model="editCountry" v-bind="editCountryAttrs" class="w-full" :disabled="isEditSubmitting" />
      </FormField>
      <FormField :label="t('clientsPage.website')" name="edit-website" :error="editForm.errors.value.website">
        <InputText id="edit-website" v-model="editWebsite" v-bind="editWebsiteAttrs" placeholder="https://example.com" class="w-full" :disabled="isEditSubmitting" />
      </FormField>
      <div class="grid grid-cols-2 gap-3">
        <FormField :label="t('clientsPage.industry')" name="edit-industry">
          <InputText id="edit-industry" v-model="editIndustry" v-bind="editIndustryAttrs" class="w-full" :disabled="isEditSubmitting" />
        </FormField>
        <FormField :label="t('clientsPage.segment')" name="edit-segment">
          <Select v-model="editSegment" :options="segmentOptions" option-label="label" option-value="value" class="w-full" :disabled="isEditSubmitting" />
        </FormField>
      </div>
      <FormField :label="t('clientsPage.notes')" name="edit-notes">
        <Textarea id="edit-notes" v-model="editNotes" v-bind="editNotesAttrs" :rows="3" class="w-full" :disabled="isEditSubmitting" />
      </FormField>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined :disabled="isEditSubmitting" @click="showEditDialog = false" />
        <Button :label="t('common.save')" :loading="isEditSubmitting" @click="onEditSubmit" />
      </div>
    </template>
  </AppDialog>

  <!-- Add/Edit Contact Dialog -->
  <AppDialog v-model:visible="showContactDialog" :title="editingContact ? t('common.edit') : t('common.create')" :loading="isSubmittingContact">
    <form class="flex flex-col gap-4" @submit.prevent="onSubmitContact">
      <FormField :label="t('clientsPage.contactFullName')" name="cf-fullName" :error="contactForm.errors.value.fullName" required>
        <InputText v-model="cfFullName" v-bind="cfFullNameAttrs" class="w-full" :disabled="isSubmittingContact" />
      </FormField>
      <div class="grid grid-cols-2 gap-3">
        <FormField :label="t('clientsPage.contactEmail')" name="cf-email" :error="contactForm.errors.value.email">
          <InputText v-model="cfEmail" v-bind="cfEmailAttrs" class="w-full" :disabled="isSubmittingContact" />
        </FormField>
        <FormField :label="t('clientsPage.contactPhone')" name="cf-phone" :error="contactForm.errors.value.phone">
          <InputText v-model="cfPhone" v-bind="cfPhoneAttrs" class="w-full" :disabled="isSubmittingContact" />
        </FormField>
      </div>
      <FormField :label="t('clientsPage.contactRole')" name="cf-role" :error="contactForm.errors.value.role" required>
        <Select v-model="cfRole" :options="contactRoleOptions" option-label="label" option-value="value" class="w-full" :disabled="isSubmittingContact" />
      </FormField>
      <FormField :label="t('clientsPage.contactNotes')" name="cf-notes">
        <Textarea v-model="cfNotes" v-bind="cfNotesAttrs" :rows="2" class="w-full" :disabled="isSubmittingContact" />
      </FormField>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined :disabled="isSubmittingContact" @click="showContactDialog = false" />
        <Button :label="editingContact ? t('common.save') : t('common.create')" :loading="isSubmittingContact" @click="onSubmitContact" />
      </div>
    </template>
  </AppDialog>

  <!-- Add Branch Dialog -->
  <AppDialog v-model:visible="showBranchDialog" :title="t('clientsPage.addBranch')" :loading="isSubmittingBranch">
    <form class="flex flex-col gap-4" @submit.prevent="onSubmitBranch">
      <FormField :label="t('clientsPage.branchName')" name="name" :error="branchForm.errors.value.name" required>
        <InputText v-model="branchNameValue" v-bind="branchNameAttrs" class="w-full" :disabled="isSubmittingBranch" />
      </FormField>
      <FormField :label="t('clientsPage.address')" name="address" :error="branchForm.errors.value.address">
        <InputText v-model="addressValue" v-bind="addressAttrs" class="w-full" :disabled="isSubmittingBranch" />
      </FormField>
      <div class="grid grid-cols-2 gap-3">
        <FormField :label="t('clientsPage.city')" name="city" :error="branchForm.errors.value.city">
          <InputText v-model="cityValue" v-bind="cityAttrs" class="w-full" :disabled="isSubmittingBranch" />
        </FormField>
        <FormField :label="t('clientsPage.country')" name="country" :error="branchForm.errors.value.country" required>
          <InputText v-model="countryValue" v-bind="countryAttrs" class="w-full" :disabled="isSubmittingBranch" />
        </FormField>
      </div>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined :disabled="isSubmittingBranch" @click="showBranchDialog = false" />
        <Button :label="t('common.create')" :loading="isSubmittingBranch" @click="onSubmitBranch" />
      </div>
    </template>
  </AppDialog>

  <!-- Edit Branch Dialog -->
  <AppDialog v-model:visible="showEditBranchDialog" :title="t('common.edit')" :loading="isEditingBranch">
    <form class="flex flex-col gap-4" @submit.prevent="onEditBranchSubmit">
      <FormField :label="t('clientsPage.branchName')" name="eb-name" :error="editBranchForm.errors.value.name" required>
        <InputText v-model="ebName" v-bind="ebNameAttrs" class="w-full" :disabled="isEditingBranch" />
      </FormField>
      <FormField :label="t('clientsPage.address')" name="eb-address" :error="editBranchForm.errors.value.address">
        <InputText v-model="ebAddress" v-bind="ebAddressAttrs" class="w-full" :disabled="isEditingBranch" />
      </FormField>
      <FormField :label="t('clientsPage.city')" name="eb-city" :error="editBranchForm.errors.value.city">
        <InputText v-model="ebCity" v-bind="ebCityAttrs" class="w-full" :disabled="isEditingBranch" />
      </FormField>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined :disabled="isEditingBranch" @click="showEditBranchDialog = false" />
        <Button :label="t('common.save')" :loading="isEditingBranch" @click="onEditBranchSubmit" />
      </div>
    </template>
  </AppDialog>

  <!-- Log Interaction Dialog -->
  <AppDialog v-model:visible="showInteractionDialog" :title="t('crm.logInteraction')" :subtitle="t('crm.logInteractionSubtitle')" :loading="isSubmittingInteraction">
    <form class="flex flex-col gap-4" @submit.prevent="onSubmitInteraction">
      <FormField :label="t('crm.title')" name="int-title" :error="interactionForm.errors.value.title" required>
        <InputText v-model="intTitle" v-bind="intTitleAttrs" class="w-full" :disabled="isSubmittingInteraction" />
      </FormField>
      <FormField :label="t('crm.type')" name="int-type" :error="interactionForm.errors.value.interactionType" required>
        <Select v-model="intType" :options="interactionTypeOptions" option-label="label" option-value="value" class="w-full" :disabled="isSubmittingInteraction" />
      </FormField>
      <FormField :label="t('crm.description')" name="int-desc">
        <Textarea v-model="intDesc" v-bind="intDescAttrs" :rows="2" class="w-full" :disabled="isSubmittingInteraction" />
      </FormField>
      <div class="grid grid-cols-2 gap-3">
        <FormField :label="t('crm.branch')" name="int-branch">
          <Select v-model="intBranch" :options="branches ?? []" option-label="name" option-value="id" :placeholder="t('crm.branch')" class="w-full" :disabled="isSubmittingInteraction" />
        </FormField>
        <FormField :label="t('crm.durationMinutes')" name="int-duration">
          <InputText v-model="intDuration" placeholder="60" class="w-full" :disabled="isSubmittingInteraction" />
        </FormField>
      </div>
      <FormField :label="t('crm.outcome')" name="int-outcome">
        <Textarea v-model="intOutcome" v-bind="intOutcomeAttrs" :rows="2" class="w-full" :disabled="isSubmittingInteraction" />
      </FormField>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined :disabled="isSubmittingInteraction" @click="showInteractionDialog = false" />
        <Button :label="t('common.save')" :loading="isSubmittingInteraction" @click="onSubmitInteraction" />
      </div>
    </template>
  </AppDialog>

  <!-- Create/Edit Opportunity Dialog -->
  <AppDialog v-model:visible="showOppDialog" :title="editingOpp ? t('crm.editOpp') : t('crm.createOpp')" :subtitle="t('crm.createOppSubtitle')" :loading="isSubmittingOpp">
    <form class="flex flex-col gap-4" @submit.prevent="onSubmitOpp">
      <FormField :label="t('crm.title')" name="opp-title" :error="oppForm.errors.value.title" required>
        <InputText v-model="oppTitle" v-bind="oppTitleAttrs" class="w-full" :disabled="isSubmittingOpp" />
      </FormField>
      <FormField :label="t('crm.description')" name="opp-desc">
        <Textarea v-model="oppDesc" v-bind="oppDescAttrs" :rows="2" class="w-full" :disabled="isSubmittingOpp" />
      </FormField>
      <div class="grid grid-cols-2 gap-3">
        <FormField :label="t('crm.value')" name="opp-value">
          <InputText v-model="oppValue" placeholder="0" class="w-full" :disabled="isSubmittingOpp" />
        </FormField>
        <FormField :label="t('crm.currency')" name="opp-currency">
          <Select v-model="oppCurrency" :options="currencyOptions" option-label="label" option-value="value" class="w-full" :disabled="isSubmittingOpp" />
        </FormField>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <FormField :label="t('crm.stage')" name="opp-stage">
          <Select v-model="oppStage" :options="stageOptions" option-label="label" option-value="value" class="w-full" :disabled="isSubmittingOpp" />
        </FormField>
        <FormField :label="t('crm.expectedCloseDate')" name="opp-close">
          <InputText v-model="oppCloseDate" type="date" class="w-full" :disabled="isSubmittingOpp" />
        </FormField>
      </div>
      <FormField :label="t('crm.source')" name="opp-source">
        <Select v-model="oppSource" :options="sourceOptions" option-label="label" option-value="value" class="w-full" :disabled="isSubmittingOpp" />
      </FormField>
      <div v-if="oppStage === 'CLOSED_LOST'" class="flex flex-col gap-2">
        <FormField :label="t('crm.lossReason')" name="opp-loss" :error="oppForm.errors.value.lossReason">
          <Textarea v-model="oppLoss" v-bind="oppLossAttrs" :rows="2" class="w-full" :disabled="isSubmittingOpp" />
        </FormField>
      </div>
    </form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined :disabled="isSubmittingOpp" @click="showOppDialog = false" />
        <Button :label="editingOpp ? t('common.save') : t('common.create')" :loading="isSubmittingOpp" @click="onSubmitOpp" />
      </div>
    </template>
  </AppDialog>
</template>
