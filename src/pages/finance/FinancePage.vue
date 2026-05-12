<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useConfirm } from 'primevue/useconfirm'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Dialog from 'primevue/dialog'
import DatePicker from 'primevue/datepicker'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import ToggleSwitch from 'primevue/toggleswitch'
import { DollarSign, TrendingUp, TrendingDown, Activity } from 'lucide-vue-next'
import PageInfoButton from '@/components/ui/PageInfoButton.vue'
import { financeService } from '@/services/finance.service'
import { clientsService } from '@/services/clients.service'
import { useToast } from '@/composables/useToast'
import { qk } from '@/queries/keys'
import dayjs from 'dayjs'
import type {
  Invoice, Payment, Expense, PurchaseRecord,
  InvoiceLineItemRequest, InvoiceStatus, ExpenseCategory,
  RecurrenceType, PurchaseSource
} from '@/types/finance'

const { t } = useI18n()
const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()

const activeTab = ref('overview')

// ── Clients list for dropdowns ────────────────────────────────────────
const { data: clientsData } = useQuery({
  queryKey: ['clients-for-finance'],
  queryFn: () => clientsService.list({ page: 0, size: 200 }),
  staleTime: 60_000
})
const clientOptions = computed(() => [
  { label: t('finance.noClient'), value: '' },
  ...(clientsData.value?.content ?? []).map(c => ({ label: c.name, value: c.id }))
])

// ── Date range for cash flow ──────────────────────────────────────────
const now = dayjs()
const cfFrom = ref(now.startOf('year').toISOString())
const cfTo   = ref(now.endOf('year').toISOString())

// ── Invoices ─────────────────────────────────────────────────────────
const invoiceStatusFilter = ref<InvoiceStatus | ''>('')

const { data: invoicesData, isLoading: invLoading, refetch: refetchInv } = useQuery({
  queryKey: computed(() => ['finance-invoices', invoiceStatusFilter.value]),
  queryFn: () => financeService.listInvoices({ status: invoiceStatusFilter.value || undefined, page: 0, size: 50 }),
  staleTime: 30_000
})
const invoices = computed(() => invoicesData.value?.content ?? [])

// ── Payments ─────────────────────────────────────────────────────────
const { data: paymentsData, isLoading: payLoading } = useQuery({
  queryKey: ['finance-payments'],
  queryFn: () => financeService.listPayments({ page: 0, size: 50 }),
  staleTime: 30_000
})
const payments = computed(() => paymentsData.value?.content ?? [])

// ── Expenses ─────────────────────────────────────────────────────────
const expenseCategoryFilter = ref<ExpenseCategory | ''>('')
const expenseClientFilter = ref('')
const expenseVendorFilter = ref('')
const expenseAmountMin = ref<number | null>(null)
const expenseAmountMax = ref<number | null>(null)
const expenseDateRange = ref<Date[] | null>(null)

const expFiltersKey = computed(() => JSON.stringify({
  cat: expenseCategoryFilter.value, cli: expenseClientFilter.value,
  ven: expenseVendorFilter.value, min: expenseAmountMin.value,
  max: expenseAmountMax.value, range: expenseDateRange.value,
}))

const { data: expensesData, isLoading: expLoading, refetch: refetchExp } = useQuery({
  queryKey: computed(() => ['finance-expenses', expFiltersKey.value]),
  queryFn: () => financeService.listExpenses({
    category: expenseCategoryFilter.value || undefined,
    clientId: expenseClientFilter.value || undefined,
    vendor: expenseVendorFilter.value || undefined,
    amountMin: expenseAmountMin.value ?? undefined,
    amountMax: expenseAmountMax.value ?? undefined,
    from: expenseDateRange.value?.[0] ? dayjs(expenseDateRange.value[0]).toISOString() : undefined,
    to: expenseDateRange.value?.[1] ? dayjs(expenseDateRange.value[1]).toISOString() : undefined,
    page: 0, size: 100,
  }),
  staleTime: 30_000,
})
const expenses = computed(() => expensesData.value?.content ?? [])

// ── Expense Summary ───────────────────────────────────────────────────
const summaryDateRange = ref<Date[] | null>([
  dayjs().startOf('month').toDate(),
  dayjs().endOf('month').toDate(),
])
const summaryFrom = computed(() => summaryDateRange.value?.[0] ? dayjs(summaryDateRange.value[0]).toISOString() : dayjs().startOf('month').toISOString())
const summaryTo   = computed(() => summaryDateRange.value?.[1] ? dayjs(summaryDateRange.value[1]).toISOString() : dayjs().endOf('month').toISOString())

const { data: expenseSummary, isLoading: summaryLoading } = useQuery({
  queryKey: qk.expenseSummary(summaryFrom.value, summaryTo.value),
  queryFn: () => financeService.getExpenseSummary(summaryFrom.value, summaryTo.value),
  staleTime: 60_000,
})

// ── Finance Report Email Dialog ───────────────────────────────────────
const showReportDialog = ref(false)
const reportEmail = ref('')
const sendReportMut = useMutation({
  mutationFn: () => financeService.sendFinanceReport({
    toEmail: reportEmail.value,
    from: summaryFrom.value,
    to: summaryTo.value,
  }),
  onSuccess: () => {
    toast.success(t('finance.reportSent'))
    showReportDialog.value = false
    reportEmail.value = ''
  },
  onError: () => toast.error(t('finance.reportError')),
})

// ── Cash Flow ─────────────────────────────────────────────────────────
const { data: cashFlow, refetch: refetchCf } = useQuery({
  queryKey: computed(() => ['finance-cashflow', cfFrom.value, cfTo.value]),
  queryFn: () => financeService.getCashFlow(cfFrom.value, cfTo.value),
  staleTime: 60_000
})

const totalIncome   = computed(() => cashFlow.value?.totalIncome ?? 0)
const totalExpenses = computed(() => cashFlow.value?.totalExpenses ?? 0)
const netFlow       = computed(() => cashFlow.value?.netFlow ?? 0)

// ── Purchases ─────────────────────────────────────────────────────────
const purchaseSourceFilter = ref<PurchaseSource | ''>('')
const purchaseCategoryFilter = ref<ExpenseCategory | ''>('')
const purchaseVendorFilter = ref('')
const purchaseDateRange = ref<Date[] | null>(null)

const purchFiltersKey = computed(() => JSON.stringify({
  src: purchaseSourceFilter.value, cat: purchaseCategoryFilter.value,
  ven: purchaseVendorFilter.value, range: purchaseDateRange.value,
}))

const { data: purchasesData, isLoading: purchLoading, refetch: refetchPurch } = useQuery({
  queryKey: computed(() => qk.purchases(purchFiltersKey.value)),
  queryFn: () => financeService.listPurchases({
    source: purchaseSourceFilter.value || undefined,
    category: purchaseCategoryFilter.value || undefined,
    vendor: purchaseVendorFilter.value || undefined,
    from: purchaseDateRange.value?.[0] ? dayjs(purchaseDateRange.value[0]).toISOString() : undefined,
    to: purchaseDateRange.value?.[1] ? dayjs(purchaseDateRange.value[1]).toISOString() : undefined,
    page: 0, size: 100,
  }),
  staleTime: 30_000,
})
const purchases = computed(() => purchasesData.value?.content ?? [])

function invalidateAll() {
  queryClient.invalidateQueries({ queryKey: ['finance-invoices'] })
  queryClient.invalidateQueries({ queryKey: ['finance-payments'] })
  queryClient.invalidateQueries({ queryKey: ['finance-expenses'] })
  queryClient.invalidateQueries({ queryKey: ['finance-cashflow'] })
  queryClient.invalidateQueries({ queryKey: ['finance-purchases'] })
}

// ── Recurrence options ────────────────────────────────────────────────
const recurrenceTypeOptions = computed(() => [
  { label: t('finance.recurrenceTypes.DAILY'), value: 'DAILY' },
  { label: t('finance.recurrenceTypes.WEEKLY'), value: 'WEEKLY' },
  { label: t('finance.recurrenceTypes.BIWEEKLY'), value: 'BIWEEKLY' },
  { label: t('finance.recurrenceTypes.MONTHLY'), value: 'MONTHLY' },
  { label: t('finance.recurrenceTypes.QUARTERLY'), value: 'QUARTERLY' },
  { label: t('finance.recurrenceTypes.YEARLY'), value: 'YEARLY' },
])

// ── Invoice Create/Edit Dialog ────────────────────────────────────────
const showInvoiceDialog = ref(false)
const showEditInvoiceDialog = ref(false)
const editingInvoiceId = ref<string | null>(null)
const invClientId = ref('')
const invCurrency = ref('MXN')
const invTaxRate = ref(16)
const invNotes = ref('')
const invIssuedAt = ref(dayjs().format('YYYY-MM-DD'))
const invDueDate = ref('')
const invLines = ref<InvoiceLineItemRequest[]>([
  { description: '', quantity: 1, unitPrice: 0, position: 0 }
])
const invIsRecurring = ref(false)
const invRecurrenceType = ref<RecurrenceType | ''>('')
const invRecurrenceEndDate = ref('')

function addLine() {
  invLines.value.push({ description: '', quantity: 1, unitPrice: 0, position: invLines.value.length })
}
function removeLine(idx: number) {
  invLines.value.splice(idx, 1)
}

const invSubtotal = computed(() => invLines.value.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0))
const invTaxAmount = computed(() => invSubtotal.value * (invTaxRate.value / 100))
const invTotal = computed(() => invSubtotal.value + invTaxAmount.value)

function resetInvoiceForm() {
  invClientId.value = ''
  invCurrency.value = 'MXN'
  invTaxRate.value = 16
  invNotes.value = ''
  invIssuedAt.value = dayjs().format('YYYY-MM-DD')
  invDueDate.value = ''
  invLines.value = [{ description: '', quantity: 1, unitPrice: 0, position: 0 }]
  invIsRecurring.value = false
  invRecurrenceType.value = ''
  invRecurrenceEndDate.value = ''
}

function buildInvoicePayload() {
  return {
    clientId: invClientId.value || undefined,
    currency: invCurrency.value,
    taxRate: invTaxRate.value,
    notes: invNotes.value || undefined,
    issuedAt: invIssuedAt.value || undefined,
    dueDate: invDueDate.value || undefined,
    lineItems: invLines.value.filter(l => l.description.trim()),
    isRecurring: invIsRecurring.value || undefined,
    recurrenceType: invIsRecurring.value && invRecurrenceType.value ? invRecurrenceType.value as RecurrenceType : undefined,
    recurrenceEndDate: invIsRecurring.value && invRecurrenceEndDate.value ? invRecurrenceEndDate.value : undefined,
  }
}

const createInvoiceMut = useMutation({
  mutationFn: () => financeService.createInvoice(buildInvoicePayload()),
  onSuccess: () => { toast.success(t('finance.invoiceCreated')); showInvoiceDialog.value = false; invalidateAll() },
  onError: () => toast.error(t('errors.loadFailed'))
})

const updateInvoiceMut = useMutation({
  mutationFn: () => financeService.updateInvoice(editingInvoiceId.value!, buildInvoicePayload()),
  onSuccess: () => {
    toast.success(t('finance.invoiceUpdated'))
    showEditInvoiceDialog.value = false
    editingInvoiceId.value = null
    invalidateAll()
  },
  onError: () => toast.error(t('errors.loadFailed'))
})

function openInvoiceDialog() { resetInvoiceForm(); showInvoiceDialog.value = true }

function openEditDialog(inv: Invoice) {
  editingInvoiceId.value = inv.id
  invClientId.value = inv.clientId ?? ''
  invCurrency.value = inv.currency
  invTaxRate.value = inv.taxRate ?? 16
  invNotes.value = inv.notes ?? ''
  invIssuedAt.value = inv.issuedAt ? dayjs(inv.issuedAt).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')
  invDueDate.value = inv.dueDate ? dayjs(inv.dueDate).format('YYYY-MM-DD') : ''
  invLines.value = (inv.lineItems ?? []).map((l, i) => ({
    description: l.description, quantity: l.quantity, unitPrice: l.unitPrice, position: i
  }))
  if (invLines.value.length === 0) invLines.value = [{ description: '', quantity: 1, unitPrice: 0, position: 0 }]
  invIsRecurring.value = inv.isRecurring ?? false
  invRecurrenceType.value = inv.recurrenceType ?? ''
  invRecurrenceEndDate.value = inv.recurrenceEndDate ?? ''
  showEditInvoiceDialog.value = true
}

// ── Invoice Actions ──────────────────────────────────────────────────
const sendInvMut = useMutation({
  mutationFn: (id: string) => financeService.sendInvoice(id),
  onSuccess: () => { toast.success(t('finance.invoiceSent')); invalidateAll() },
  onError: () => toast.error(t('errors.loadFailed'))
})
const payInvMut = useMutation({
  mutationFn: (id: string) => financeService.payInvoice(id),
  onSuccess: () => { toast.success(t('finance.invoicePaid')); invalidateAll() },
  onError: () => toast.error(t('errors.loadFailed'))
})
const voidInvMut = useMutation({
  mutationFn: (id: string) => financeService.voidInvoice(id),
  onSuccess: () => { toast.success(t('finance.invoiceVoided')); invalidateAll() },
  onError: () => toast.error(t('errors.loadFailed'))
})
const deleteInvMut = useMutation({
  mutationFn: (id: string) => financeService.deleteInvoice(id),
  onSuccess: () => { toast.success(t('finance.invoiceDeleted')); invalidateAll() },
  onError: () => toast.error(t('errors.loadFailed'))
})
function confirmDeleteInvoice(inv: Invoice) {
  confirm.require({
    message: `¿Eliminar factura ${inv.number}? Esta acción no se puede deshacer.`,
    header: t('finance.deleteInvoice'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: () => deleteInvMut.mutate(inv.id)
  })
}

const downloadingPdf = ref<string | null>(null)
async function downloadInvoicePdf(inv: Invoice) {
  downloadingPdf.value = inv.id
  try { await financeService.downloadInvoicePdf(inv.id, inv.number) }
  catch { toast.error(t('financePage.pdfError')) }
  finally { downloadingPdf.value = null }
}

// ── Invoice options for payment dialog ──────────────────────────────
const invoiceOptions = computed(() => [
  { label: t('finance.noInvoice'), value: '' },
  ...(invoicesData.value?.content ?? [])
    .filter(i => i.status === 'SENT' || i.status === 'OVERDUE')
    .map(i => ({ label: `${i.number} — ${fmt(i.total, i.currency)}`, value: i.id }))
])

// ── Payment Create Dialog ────────────────────────────────────────────
const showPaymentDialog = ref(false)
const payAmount = ref<number>(0)
const payClientId = ref('')
const payInvoiceId = ref('')
const payCurrency = ref('MXN')
const payMethod = ref('BANK_TRANSFER')
const payReference = ref('')
const payNotes = ref('')
const paySource = ref<'MANUAL' | 'POS_IMPORT'>('MANUAL')
const payPosReference = ref('')
const payIsRecurring = ref(false)
const payRecurrenceType = ref<RecurrenceType | ''>('')
const payRecurrenceEndDate = ref('')

const payMethodOptions = computed(() => [
  { label: t('finance.transfer'), value: 'BANK_TRANSFER' },
  { label: t('finance.cash'), value: 'CASH' },
  { label: t('finance.card'), value: 'CARD' },
  { label: t('finance.check'), value: 'CHECK' },
  { label: t('finance.crypto'), value: 'CRYPTO' },
  { label: t('finance.other'), value: 'OTHER' },
])
const paySourceOptions = computed(() => [
  { label: t('finance.sourceManual'), value: 'MANUAL' },
  { label: t('finance.sourcePosImport'), value: 'POS_IMPORT' },
])

const createPaymentMut = useMutation({
  mutationFn: () => financeService.createPayment({
    clientId: payClientId.value || undefined,
    invoiceId: payInvoiceId.value || undefined,
    amount: payAmount.value,
    currency: payCurrency.value,
    method: payMethod.value as any,
    reference: payReference.value || undefined,
    notes: payNotes.value || undefined,
    source: paySource.value,
    posReference: paySource.value === 'POS_IMPORT' && payPosReference.value ? payPosReference.value : undefined,
    isRecurring: payIsRecurring.value || undefined,
    recurrenceType: payIsRecurring.value && payRecurrenceType.value ? payRecurrenceType.value as RecurrenceType : undefined,
    recurrenceEndDate: payIsRecurring.value && payRecurrenceEndDate.value ? payRecurrenceEndDate.value : undefined,
  }),
  onSuccess: () => {
    toast.success(t('finance.paymentCreated'))
    showPaymentDialog.value = false
    invalidateAll()
  },
  onError: () => toast.error(t('errors.loadFailed'))
})

function openPaymentDialog() {
  payAmount.value = 0
  payClientId.value = ''
  payInvoiceId.value = ''
  payCurrency.value = 'MXN'
  payMethod.value = 'BANK_TRANSFER'
  payReference.value = ''
  payNotes.value = ''
  paySource.value = 'MANUAL'
  payPosReference.value = ''
  payIsRecurring.value = false
  payRecurrenceType.value = ''
  payRecurrenceEndDate.value = ''
  showPaymentDialog.value = true
}

const deletePaymentMut = useMutation({
  mutationFn: (id: string) => financeService.deletePayment(id),
  onSuccess: () => { toast.success(t('common.delete')); invalidateAll() },
  onError: () => toast.error(t('errors.loadFailed'))
})

// ── Expense Create Dialog ────────────────────────────────────────────
const showExpenseDialog = ref(false)
const expDescription = ref('')
const expAmount = ref<number>(0)
const expCategory = ref<ExpenseCategory>('OTHER')
const expCurrency = ref('MXN')
const expVendor = ref('')
const expNotes = ref('')
const expClientId = ref('')
const expIsRecurring = ref(false)
const expRecurrenceType = ref<RecurrenceType | ''>('')
const expRecurrenceEndDate = ref('')

const expCategoryOptions = computed(() => [
  { label: t('finance.payroll'), value: 'PAYROLL' },
  { label: t('finance.services'), value: 'SERVICES' },
  { label: t('finance.rent'), value: 'RENT' },
  { label: t('finance.marketing'), value: 'MARKETING' },
  { label: t('finance.tech'), value: 'TECH' },
  { label: t('finance.travel'), value: 'TRAVEL' },
  { label: t('finance.supplies'), value: 'SUPPLIES' },
  { label: t('finance.taxes'), value: 'TAXES' },
  { label: t('finance.other'), value: 'OTHER' },
])
const expCategoryFilterOptions = computed(() => [
  { label: t('finance.allCategories'), value: '' },
  ...expCategoryOptions.value,
])
const invStatusOptions = computed(() => [
  { label: t('finance.allStatus'), value: '' },
  { label: t('finance.draft'), value: 'DRAFT' },
  { label: t('finance.sent'), value: 'SENT' },
  { label: t('finance.paid'), value: 'PAID' },
  { label: t('finance.overdue'), value: 'OVERDUE' },
  { label: t('finance.cancelled'), value: 'CANCELLED' },
  { label: t('finance.voided'), value: 'VOIDED' },
])

const createExpenseMut = useMutation({
  mutationFn: () => financeService.createExpense({
    clientId: expClientId.value || undefined,
    description: expDescription.value,
    amount: expAmount.value,
    category: expCategory.value,
    currency: expCurrency.value,
    vendor: expVendor.value || undefined,
    notes: expNotes.value || undefined,
    isRecurring: expIsRecurring.value || undefined,
    recurrenceType: expIsRecurring.value && expRecurrenceType.value ? expRecurrenceType.value as RecurrenceType : undefined,
    recurrenceEndDate: expIsRecurring.value && expRecurrenceEndDate.value ? expRecurrenceEndDate.value : undefined,
  }),
  onSuccess: () => {
    toast.success(t('finance.expenseCreated'))
    showExpenseDialog.value = false
    invalidateAll()
  },
  onError: () => toast.error(t('errors.loadFailed'))
})

function openExpenseDialog() {
  expDescription.value = ''
  expAmount.value = 0
  expCategory.value = 'OTHER'
  expCurrency.value = 'MXN'
  expClientId.value = ''
  expVendor.value = ''
  expNotes.value = ''
  expIsRecurring.value = false
  expRecurrenceType.value = ''
  expRecurrenceEndDate.value = ''
  showExpenseDialog.value = true
}

const deleteExpenseMut = useMutation({
  mutationFn: (id: string) => financeService.deleteExpense(id),
  onSuccess: () => { toast.success(t('common.delete')); invalidateAll() },
  onError: () => toast.error(t('errors.loadFailed'))
})

// ── Purchase Create/Edit Dialog ───────────────────────────────────────
const showPurchaseDialog = ref(false)
const showEditPurchaseDialog = ref(false)
const editingPurchaseId = ref<string | null>(null)
const purchVendor = ref('')
const purchDescription = ref('')
const purchAmount = ref<number>(0)
const purchCurrency = ref('MXN')
const purchCategory = ref<ExpenseCategory>('OTHER')
const purchQuantity = ref(1)
const purchUnitPrice = ref<number | null>(null)
const purchNotes = ref('')
const purchSource = ref<PurchaseSource>('MANUAL')
const purchPosReference = ref('')
const purchIsRecurring = ref(false)
const purchRecurrenceType = ref<RecurrenceType | ''>('')
const purchRecurrenceEndDate = ref('')

const purchSourceOptions = computed(() => [
  { label: t('finance.sourceManual'), value: 'MANUAL' },
  { label: t('finance.sourcePosImport'), value: 'POS_IMPORT' },
])
const purchSourceFilterOptions = computed(() => [
  { label: t('financePage.allSources'), value: '' },
  ...purchSourceOptions.value,
])

function buildPurchasePayload() {
  return {
    vendor: purchVendor.value || undefined,
    description: purchDescription.value,
    amount: purchAmount.value,
    currency: purchCurrency.value,
    category: purchCategory.value,
    quantity: purchQuantity.value,
    unitPrice: purchUnitPrice.value ?? undefined,
    notes: purchNotes.value || undefined,
    source: purchSource.value,
    posReference: purchSource.value === 'POS_IMPORT' && purchPosReference.value ? purchPosReference.value : undefined,
    isRecurring: purchIsRecurring.value || undefined,
    recurrenceType: purchIsRecurring.value && purchRecurrenceType.value ? purchRecurrenceType.value as RecurrenceType : undefined,
    recurrenceEndDate: purchIsRecurring.value && purchRecurrenceEndDate.value ? purchRecurrenceEndDate.value : undefined,
  }
}

function resetPurchaseForm() {
  purchVendor.value = ''
  purchDescription.value = ''
  purchAmount.value = 0
  purchCurrency.value = 'MXN'
  purchCategory.value = 'OTHER'
  purchQuantity.value = 1
  purchUnitPrice.value = null
  purchNotes.value = ''
  purchSource.value = 'MANUAL'
  purchPosReference.value = ''
  purchIsRecurring.value = false
  purchRecurrenceType.value = ''
  purchRecurrenceEndDate.value = ''
}

const createPurchaseMut = useMutation({
  mutationFn: () => financeService.createPurchase(buildPurchasePayload()),
  onSuccess: () => {
    toast.success(t('finance.purchaseCreated'))
    showPurchaseDialog.value = false
    invalidateAll()
  },
  onError: () => toast.error(t('errors.loadFailed'))
})

const updatePurchaseMut = useMutation({
  mutationFn: () => financeService.updatePurchase(editingPurchaseId.value!, buildPurchasePayload()),
  onSuccess: () => {
    toast.success(t('finance.purchaseUpdated'))
    showEditPurchaseDialog.value = false
    editingPurchaseId.value = null
    invalidateAll()
  },
  onError: () => toast.error(t('errors.loadFailed'))
})

const deletePurchaseMut = useMutation({
  mutationFn: (id: string) => financeService.deletePurchase(id),
  onSuccess: () => { toast.success(t('finance.purchaseDeleted')); invalidateAll() },
  onError: () => toast.error(t('errors.loadFailed'))
})

function openPurchaseDialog() { resetPurchaseForm(); showPurchaseDialog.value = true }

function openEditPurchaseDialog(p: PurchaseRecord) {
  editingPurchaseId.value = p.id
  purchVendor.value = p.vendor ?? ''
  purchDescription.value = p.description
  purchAmount.value = p.amount
  purchCurrency.value = p.currency
  purchCategory.value = p.category
  purchQuantity.value = p.quantity
  purchUnitPrice.value = p.unitPrice ?? null
  purchNotes.value = p.notes ?? ''
  purchSource.value = p.source
  purchPosReference.value = p.posReference ?? ''
  purchIsRecurring.value = p.isRecurring ?? false
  purchRecurrenceType.value = p.recurrenceType ?? ''
  purchRecurrenceEndDate.value = p.recurrenceEndDate ?? ''
  showEditPurchaseDialog.value = true
}

function confirmDeletePurchase(p: PurchaseRecord) {
  confirm.require({
    message: `¿Eliminar compra "${p.description}"?`,
    header: t('finance.deletePurchase'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: () => deletePurchaseMut.mutate(p.id)
  })
}

// ── PDF Downloads ─────────────────────────────────────────────────────
let expenseDownloading = ref(false)
async function downloadExpensePdf() {
  expenseDownloading.value = true
  try { await financeService.downloadExpenseReportPdf(summaryFrom.value, summaryTo.value) }
  catch { toast.error(t('financePage.pdfError')) }
  finally { expenseDownloading.value = false }
}

// ── Helpers ───────────────────────────────────────────────────────────
function fmt(n: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(n)
}
function fmtDate(s?: string | null) {
  if (!s) return '—'
  return dayjs(s).format('DD MMM YYYY')
}
function statusSeverity(s: InvoiceStatus): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
  const map: Record<InvoiceStatus, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
    DRAFT: 'secondary', SENT: 'info', PAID: 'success',
    OVERDUE: 'danger', CANCELLED: 'warn', VOIDED: 'warn'
  }
  return map[s] ?? 'secondary'
}
function confirmDeletePayment(p: Payment) {
  confirm.require({
    message: `¿Eliminar pago de ${fmt(p.amount, p.currency)}?`,
    header: t('finance.deletePayment'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: () => deletePaymentMut.mutate(p.id)
  })
}
function confirmDeleteExpense(e: Expense) {
  confirm.require({
    message: `¿Eliminar gasto "${e.description}"?`,
    header: t('finance.deleteExpense'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: () => deleteExpenseMut.mutate(e.id)
  })
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <DollarSign class="w-6 h-6 text-[var(--primary)]" />
        <div>
          <h1 class="text-lg font-bold text-[var(--text)]">{{ t('finance.title') }}</h1>
          <p class="text-sm text-[var(--text-muted)]">{{ t('finance.subtitle') }}</p>
        </div>
        <PageInfoButton :title="t('finance.title')" :description="t('pageInfo.finance')" />
      </div>
    </div>

    <Tabs v-model:value="activeTab">
      <TabList class="flex gap-1 rounded-xl bg-[var(--surface)] p-1 border border-[var(--border)]">
        <Tab value="overview">{{ t('finance.tabOverview') }}</Tab>
        <Tab value="invoices">{{ t('finance.tabInvoices') }}</Tab>
        <Tab value="payments">{{ t('finance.tabPayments') }}</Tab>
        <Tab value="expenses">{{ t('finance.tabExpenses') }}</Tab>
        <Tab value="purchases">{{ t('finance.tabPurchases') }}</Tab>
      </TabList>

      <TabPanels>

        <!-- ── OVERVIEW TAB ──────────────────────────────────────────── -->
        <TabPanel value="overview">
          <div class="space-y-4 pt-4">
            <!-- KPI cards -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                <div class="flex items-center gap-2 mb-1">
                  <TrendingUp class="w-4 h-4 text-green-500" />
                  <span class="text-xs text-[var(--text-muted)] uppercase tracking-wide">{{ t('finance.totalIncome') }}</span>
                </div>
                <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ fmt(totalIncome) }}</p>
              </div>
              <div class="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                <div class="flex items-center gap-2 mb-1">
                  <TrendingDown class="w-4 h-4 text-red-500" />
                  <span class="text-xs text-[var(--text-muted)] uppercase tracking-wide">{{ t('finance.totalExpenses') }}</span>
                </div>
                <p class="text-2xl font-bold text-red-600 dark:text-red-400">{{ fmt(totalExpenses) }}</p>
              </div>
              <div class="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                <div class="flex items-center gap-2 mb-1">
                  <Activity class="w-4 h-4 text-blue-500" />
                  <span class="text-xs text-[var(--text-muted)] uppercase tracking-wide">{{ t('finance.netFlow') }}</span>
                </div>
                <p :class="['text-2xl font-bold', netFlow >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400']">
                  {{ fmt(netFlow) }}
                </p>
              </div>
            </div>

            <!-- Monthly breakdown table -->
            <div class="bg-[var(--surface)] border border-[var(--border)] rounded-xl">
              <div class="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <h2 class="text-sm font-semibold text-[var(--text)]">{{ t('finance.monthlyBreakdown') }}</h2>
                <Button icon="pi pi-refresh" text rounded size="small" @click="refetchCf()" />
              </div>
              <div v-if="!cashFlow?.byMonth?.length" class="py-8 text-center text-sm text-[var(--text-muted)]">
                {{ t('finance.noData') }}
              </div>
              <DataTable v-else :value="cashFlow!.byMonth" class="border-0" striped-rows>
                <Column field="month" :header="t('finance.month')" style="min-width:100px" />
                <Column field="income" :header="t('finance.income')">
                  <template #body="{ data }">
                    <span class="text-green-600 dark:text-green-400 font-medium">{{ fmt(data.income) }}</span>
                  </template>
                </Column>
                <Column field="expenses" :header="t('finance.expenses')">
                  <template #body="{ data }">
                    <span class="text-red-600 dark:text-red-400 font-medium">{{ fmt(data.expenses) }}</span>
                  </template>
                </Column>
                <Column field="net" :header="t('finance.net')">
                  <template #body="{ data }">
                    <span :class="data.net >= 0 ? 'text-green-600 dark:text-green-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold'">
                      {{ fmt(data.net) }}
                    </span>
                  </template>
                </Column>
              </DataTable>
            </div>
          </div>
        </TabPanel>

        <!-- ── INVOICES TAB ──────────────────────────────────────────── -->
        <TabPanel value="invoices">
          <div class="space-y-3 pt-4">
            <div class="flex flex-wrap gap-2 items-center justify-between">
              <Select v-model="invoiceStatusFilter" :options="invStatusOptions" option-label="label" option-value="value" class="w-48" @change="refetchInv()" />
              <Button :label="t('finance.newInvoice')" icon="pi pi-plus" @click="openInvoiceDialog" />
            </div>

            <DataTable :value="invoices" :loading="invLoading" striped-rows class="rounded-xl border border-[var(--border)]">
              <Column field="number" :header="t('finance.invoiceNumber')" style="min-width:120px">
                <template #body="{ data: row }: { data: Invoice }">
                  <span class="font-medium">{{ row.number }}</span>
                  <Tag v-if="row.isRecurring" value="↻" severity="info" class="ml-1 text-xs" v-tooltip="row.recurrenceType" />
                </template>
              </Column>
              <Column field="clientName" :header="t('finance.client')" style="min-width:130px">
                <template #body="{ data: row }: { data: Invoice }">{{ row.clientName ?? '—' }}</template>
              </Column>
              <Column field="status" :header="t('finance.status')" style="width:110px">
                <template #body="{ data: row }: { data: Invoice }">
                  <Tag :severity="statusSeverity(row.status)" :value="row.status" class="text-xs" />
                </template>
              </Column>
              <Column field="issuedAt" :header="t('finance.issuedAt')" style="width:110px">
                <template #body="{ data: row }: { data: Invoice }">{{ fmtDate(row.issuedAt) }}</template>
              </Column>
              <Column field="dueDate" :header="t('finance.dueDate')" style="width:110px">
                <template #body="{ data: row }: { data: Invoice }">{{ fmtDate(row.dueDate) }}</template>
              </Column>
              <Column field="total" :header="t('finance.total')" style="width:130px">
                <template #body="{ data: row }: { data: Invoice }">
                  <span class="font-semibold">{{ fmt(row.total, row.currency) }}</span>
                </template>
              </Column>
              <Column :header="t('common.actions')" style="width:200px">
                <template #body="{ data: row }: { data: Invoice }">
                  <div class="flex gap-1 items-center flex-wrap">
                    <Button v-if="row.status === 'DRAFT'" size="small" icon="pi pi-pencil" severity="secondary" text rounded @click="openEditDialog(row)" v-tooltip="'Editar'" />
                    <Button v-if="row.status === 'DRAFT'" size="small" :label="$t('financePage.send')" severity="info" text @click="sendInvMut.mutate(row.id)" />
                    <Button v-if="row.status === 'SENT' || row.status === 'OVERDUE'" size="small" :label="t('finance.markPaid')" severity="success" text @click="payInvMut.mutate(row.id)" />
                    <Button v-if="row.status === 'SENT' || row.status === 'OVERDUE' || row.status === 'CANCELLED'" size="small" :label="t('finance.void')" severity="warn" text @click="voidInvMut.mutate(row.id)" />
                    <Button size="small" icon="pi pi-file-pdf" severity="secondary" text rounded :loading="downloadingPdf === row.id" @click="downloadInvoicePdf(row)" v-tooltip="t('finance.downloadPdf')" />
                    <Button v-if="row.status !== 'PAID'" icon="pi pi-trash" severity="danger" text rounded size="small" @click="confirmDeleteInvoice(row)" />
                  </div>
                </template>
              </Column>
              <template #empty>
                <div class="text-center py-8 text-[var(--text-muted)] text-sm">{{ t('finance.noInvoices') }}</div>
              </template>
            </DataTable>
          </div>
        </TabPanel>

        <!-- ── PAYMENTS TAB ──────────────────────────────────────────── -->
        <TabPanel value="payments">
          <div class="space-y-3 pt-4">
            <div class="flex justify-end">
              <Button :label="t('finance.newPayment')" icon="pi pi-plus" @click="openPaymentDialog" />
            </div>

            <DataTable :value="payments" :loading="payLoading" striped-rows class="rounded-xl border border-[var(--border)]">
              <Column field="paidAt" :header="t('finance.paidAt')" style="width:130px">
                <template #body="{ data: row }: { data: Payment }">{{ fmtDate(row.paidAt) }}</template>
              </Column>
              <Column field="clientName" :header="t('finance.client')" style="min-width:130px">
                <template #body="{ data: row }: { data: Payment }">{{ row.clientName ?? '—' }}</template>
              </Column>
              <Column field="amount" :header="t('finance.amount')">
                <template #body="{ data: row }: { data: Payment }">
                  <span class="font-semibold text-green-600 dark:text-green-400">{{ fmt(row.amount, row.currency) }}</span>
                </template>
              </Column>
              <Column field="method" :header="t('finance.method')" style="width:140px" />
              <Column field="source" :header="t('finance.source')" style="width:100px">
                <template #body="{ data: row }: { data: Payment }">
                  <Tag v-if="row.source === 'POS_IMPORT'" value="POS" severity="info" class="text-xs" />
                  <span v-else class="text-xs text-[var(--text-muted)]">{{ $t('financePage.manual') }}</span>
                </template>
              </Column>
              <Column field="reference" :header="t('finance.reference')">
                <template #body="{ data: row }: { data: Payment }">{{ row.posReference ?? row.reference ?? '—' }}</template>
              </Column>
              <Column :header="t('common.actions')" style="width:60px">
                <template #body="{ data: row }: { data: Payment }">
                  <Button icon="pi pi-trash" severity="danger" text rounded size="small" @click="confirmDeletePayment(row)" />
                </template>
              </Column>
              <template #empty>
                <div class="text-center py-8 text-[var(--text-muted)] text-sm">{{ t('finance.noPayments') }}</div>
              </template>
            </DataTable>
          </div>
        </TabPanel>

        <!-- ── EXPENSES TAB ──────────────────────────────────────────── -->
        <TabPanel value="expenses">
          <div class="space-y-4 pt-4">
            <!-- Filters row -->
            <div class="flex flex-wrap gap-2 items-center justify-between">
              <div class="flex gap-2 flex-wrap items-center">
                <Select v-model="expenseCategoryFilter" :options="expCategoryFilterOptions" option-label="label" option-value="value" class="w-44" @change="refetchExp()" />
                <Select v-model="expenseClientFilter" :options="clientOptions" option-label="label" option-value="value" class="w-44" :placeholder="t('finance.client')" @change="refetchExp()" />
                <InputText v-model="expenseVendorFilter" :placeholder="t('finance.vendorPlaceholder')" class="w-36" @keyup.enter="refetchExp()" />
                <InputNumber v-model="expenseAmountMin" :placeholder="t('finance.amountMinPlaceholder')" :min="0" :maxFractionDigits="2" class="w-28" @blur="refetchExp()" />
                <InputNumber v-model="expenseAmountMax" :placeholder="t('finance.amountMaxPlaceholder')" :min="0" :maxFractionDigits="2" class="w-28" @blur="refetchExp()" />
                <DatePicker v-model="expenseDateRange" selectionMode="range" :placeholder="t('finance.periodPlaceholder')" showIcon class="w-64" dateFormat="dd/mm/yy" @hide="refetchExp()" />
              </div>
              <Button :label="t('finance.newExpense')" icon="pi pi-plus" @click="openExpenseDialog" />
            </div>

            <!-- Expense Summary panel -->
            <div class="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3">
              <div class="flex items-center justify-between flex-wrap gap-2">
                <h3 class="font-semibold text-[var(--text)]">{{ t('finance.expenseSummary') }}</h3>
                <div class="flex items-center gap-2">
                  <DatePicker v-model="summaryDateRange" selectionMode="range" :placeholder="t('finance.summaryPeriodPlaceholder')" showIcon class="w-64" dateFormat="dd/mm/yy" />
                  <Button :label="$t('financePage.sendReport')" icon="pi pi-envelope" outlined size="small" @click="showReportDialog = true" />
                  <Button :label="t('finance.exportPdf')" icon="pi pi-file-pdf" outlined size="small" :loading="expenseDownloading" @click="downloadExpensePdf" />
                </div>
              </div>
              <div v-if="summaryLoading" class="text-center py-4 text-[var(--text-muted)] text-sm">
                <i class="pi pi-spin pi-spinner mr-2" />{{ $t('financePage.calculating') }}
              </div>
              <div v-else-if="expenseSummary" class="space-y-2">
                <p class="text-sm text-[var(--text-muted)]">{{ $t('financePage.periodTotal') }} <strong class="text-red-600 dark:text-red-400">{{ fmt(expenseSummary.grandTotal) }}</strong></p>
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  <div v-for="cat in expenseSummary.byCategory" :key="cat.category" class="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3">
                    <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide">{{ cat.category }}</p>
                    <p class="font-semibold text-[var(--text)]">{{ fmt(cat.total) }}</p>
                    <p class="text-xs text-[var(--text-muted)]">{{ cat.percentage.toFixed(1) }}% · {{ $t('financePage.countExpenses', { count: cat.count }) }}</p>
                    <div class="mt-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div class="h-full bg-red-500 rounded-full" :style="{ width: cat.percentage + '%' }" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DataTable :value="expenses" :loading="expLoading" striped-rows class="rounded-xl border border-[var(--border)]">
              <Column field="paidAt" :header="t('finance.date')" style="width:110px">
                <template #body="{ data: row }: { data: Expense }">{{ fmtDate(row.paidAt) }}</template>
              </Column>
              <Column field="category" :header="t('finance.category')" style="width:120px" />
              <Column field="description" :header="t('finance.description')">
                <template #body="{ data: row }: { data: Expense }">
                  <span>{{ row.description }}</span>
                  <Tag v-if="row.isRecurring" value="↻" severity="info" class="ml-1 text-xs" v-tooltip="row.recurrenceType" />
                </template>
              </Column>
              <Column field="vendor" :header="t('finance.vendor')">
                <template #body="{ data: row }: { data: Expense }">{{ row.vendor ?? '—' }}</template>
              </Column>
              <Column field="amount" :header="t('finance.amount')" style="width:130px">
                <template #body="{ data: row }: { data: Expense }">
                  <span class="font-semibold text-red-600 dark:text-red-400">{{ fmt(row.amount, row.currency) }}</span>
                </template>
              </Column>
              <Column :header="t('common.actions')" style="width:60px">
                <template #body="{ data: row }: { data: Expense }">
                  <Button icon="pi pi-trash" severity="danger" text rounded size="small" @click="confirmDeleteExpense(row)" />
                </template>
              </Column>
              <template #empty>
                <div class="text-center py-8 text-[var(--text-muted)] text-sm">{{ t('finance.noExpenses') }}</div>
              </template>
            </DataTable>
          </div>
        </TabPanel>

        <!-- ── PURCHASES TAB ──────────────────────────────────────────── -->
        <TabPanel value="purchases">
          <div class="space-y-3 pt-4">
            <div class="flex flex-wrap gap-2 items-center justify-between">
              <div class="flex gap-2 flex-wrap items-center">
                <Select v-model="purchaseSourceFilter" :options="purchSourceFilterOptions" option-label="label" option-value="value" class="w-44" @change="refetchPurch()" />
                <Select v-model="purchaseCategoryFilter" :options="expCategoryFilterOptions" option-label="label" option-value="value" class="w-44" @change="refetchPurch()" />
                <InputText v-model="purchaseVendorFilter" :placeholder="t('finance.vendorPlaceholder')" class="w-36" @keyup.enter="refetchPurch()" />
                <DatePicker v-model="purchaseDateRange" selectionMode="range" :placeholder="t('finance.periodPlaceholder')" showIcon class="w-64" dateFormat="dd/mm/yy" @hide="refetchPurch()" />
              </div>
              <Button :label="t('finance.newPurchase')" icon="pi pi-plus" @click="openPurchaseDialog" />
            </div>

            <DataTable :value="purchases" :loading="purchLoading" striped-rows class="rounded-xl border border-[var(--border)]">
              <Column field="purchasedAt" :header="t('finance.date')" style="width:110px">
                <template #body="{ data: row }: { data: PurchaseRecord }">{{ fmtDate(row.purchasedAt) }}</template>
              </Column>
              <Column field="vendor" :header="t('finance.vendor')">
                <template #body="{ data: row }: { data: PurchaseRecord }">{{ row.vendor ?? '—' }}</template>
              </Column>
              <Column field="description" :header="t('finance.description')">
                <template #body="{ data: row }: { data: PurchaseRecord }">
                  <span>{{ row.description }}</span>
                  <Tag v-if="row.isRecurring" value="↻" severity="info" class="ml-1 text-xs" />
                </template>
              </Column>
              <Column field="category" :header="t('finance.category')" style="width:120px" />
              <Column field="source" :header="t('finance.source')" style="width:90px">
                <template #body="{ data: row }: { data: PurchaseRecord }">
                  <Tag v-if="row.source === 'POS_IMPORT'" value="POS" severity="info" class="text-xs" />
                  <span v-else class="text-xs text-[var(--text-muted)]">{{ $t('financePage.manual') }}</span>
                </template>
              </Column>
              <Column field="quantity" :header="t('finance.purchaseQuantity')" style="width:80px">
                <template #body="{ data: row }: { data: PurchaseRecord }">{{ row.quantity }}</template>
              </Column>
              <Column field="amount" :header="t('finance.amount')" style="width:130px">
                <template #body="{ data: row }: { data: PurchaseRecord }">
                  <span class="font-semibold text-orange-600 dark:text-orange-400">{{ fmt(row.amount, row.currency) }}</span>
                </template>
              </Column>
              <Column :header="t('common.actions')" style="width:90px">
                <template #body="{ data: row }: { data: PurchaseRecord }">
                  <div class="flex gap-1">
                    <Button icon="pi pi-pencil" severity="secondary" text rounded size="small" @click="openEditPurchaseDialog(row)" />
                    <Button icon="pi pi-trash" severity="danger" text rounded size="small" @click="confirmDeletePurchase(row)" />
                  </div>
                </template>
              </Column>
              <template #empty>
                <div class="text-center py-8 text-[var(--text-muted)] text-sm">{{ t('finance.noPurchases') }}</div>
              </template>
            </DataTable>
          </div>
        </TabPanel>

      </TabPanels>
    </Tabs>
  </div>

  <!-- ── CREATE INVOICE DIALOG ──────────────────────────────────────── -->
  <Dialog v-model:visible="showInvoiceDialog" :header="t('finance.newInvoice')" modal class="w-full max-w-2xl">
    <div class="flex flex-col gap-4 pt-2">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">{{ t('finance.client') }}</label>
        <Select v-model="invClientId" :options="clientOptions" option-label="label" option-value="value" filter class="w-full" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.currency') }}</label>
          <Select v-model="invCurrency" :options="[{label:'MXN',value:'MXN'},{label:'USD',value:'USD'}]" option-label="label" option-value="value" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ $t('financePage.vatLabel') }}</label>
          <InputNumber v-model="invTaxRate" :min="0" :max="100" :fraction-digits="2" class="w-full" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.issuedAt') }}</label>
          <InputText v-model="invIssuedAt" type="date" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.dueDate') }}</label>
          <InputText v-model="invDueDate" type="date" class="w-full" />
        </div>
      </div>

      <!-- Line items -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium">{{ t('finance.lineItems') }}</label>
          <Button :label="t('finance.addLine')" icon="pi pi-plus" size="small" text @click="addLine" />
        </div>
        <div class="space-y-2">
          <div v-for="(line, idx) in invLines" :key="idx" class="grid grid-cols-12 gap-2 items-center">
            <InputText v-model="line.description" :placeholder="t('finance.lineDescription')" class="col-span-5" />
            <InputNumber v-model="line.quantity" :min="0.01" :fraction-digits="2" :placeholder="t('finance.qty')" class="col-span-2" />
            <InputNumber v-model="line.unitPrice" :min="0" :fraction-digits="2" :placeholder="t('finance.unitPrice')" class="col-span-3" mode="currency" currency="MXN" />
            <span class="col-span-1 text-sm font-medium text-right">{{ fmt(line.quantity * line.unitPrice) }}</span>
            <Button icon="pi pi-trash" severity="danger" text rounded size="small" class="col-span-1" :disabled="invLines.length <= 1" @click="removeLine(idx)" />
          </div>
        </div>
        <div class="mt-3 border-t border-[var(--border)] pt-3 text-right space-y-1">
          <p class="text-sm text-[var(--text-muted)]">{{ $t('financePage.subtotal') }} <strong>{{ fmt(invSubtotal, invCurrency) }}</strong></p>
          <p class="text-sm text-[var(--text-muted)]">{{ $t('financePage.vatLine', { rate: invTaxRate }) }} <strong>{{ fmt(invTaxAmount, invCurrency) }}</strong></p>
          <p class="text-base font-bold text-[var(--text)]">{{ $t('financePage.total') }} {{ fmt(invTotal, invCurrency) }}</p>
        </div>
      </div>

      <!-- Recurring section -->
      <div class="border border-[var(--border)] rounded-lg p-3 space-y-3">
        <div class="flex items-center gap-3">
          <ToggleSwitch v-model="invIsRecurring" inputId="inv-recurring" />
          <label for="inv-recurring" class="text-sm font-medium cursor-pointer">{{ t('finance.recurringToggleLabel') }}</label>
        </div>
        <div v-if="invIsRecurring" class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('finance.recurrenceType') }}</label>
            <Select v-model="invRecurrenceType" :options="recurrenceTypeOptions" option-label="label" option-value="value" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('finance.recurrenceEndDate') }}</label>
            <InputText v-model="invRecurrenceEndDate" type="date" class="w-full" />
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">{{ t('finance.notes') }}</label>
        <Textarea v-model="invNotes" :rows="2" class="w-full" />
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined @click="showInvoiceDialog = false" />
        <Button :label="t('common.create')" :loading="createInvoiceMut.isPending.value" @click="createInvoiceMut.mutate()" />
      </div>
    </template>
  </Dialog>

  <!-- ── EDIT INVOICE DIALOG ──────────────────────────────────────── -->
  <Dialog v-model:visible="showEditInvoiceDialog" :header="$t('financePage.editInvoice')" modal class="w-full max-w-2xl">
    <div class="flex flex-col gap-4 pt-2">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">{{ t('finance.client') }}</label>
        <Select v-model="invClientId" :options="clientOptions" option-label="label" option-value="value" filter class="w-full" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.currency') }}</label>
          <Select v-model="invCurrency" :options="[{label:'MXN',value:'MXN'},{label:'USD',value:'USD'}]" option-label="label" option-value="value" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ $t('financePage.vatLabel') }}</label>
          <InputNumber v-model="invTaxRate" :min="0" :max="100" :fraction-digits="2" class="w-full" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.issuedAt') }}</label>
          <InputText v-model="invIssuedAt" type="date" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.dueDate') }}</label>
          <InputText v-model="invDueDate" type="date" class="w-full" />
        </div>
      </div>
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium">{{ t('finance.lineItems') }}</label>
          <Button :label="t('finance.addLine')" icon="pi pi-plus" size="small" text @click="addLine" />
        </div>
        <div class="space-y-2">
          <div v-for="(line, idx) in invLines" :key="idx" class="grid grid-cols-12 gap-2 items-center">
            <InputText v-model="line.description" :placeholder="t('finance.lineDescription')" class="col-span-5" />
            <InputNumber v-model="line.quantity" :min="0.01" :fraction-digits="2" :placeholder="t('finance.qty')" class="col-span-2" />
            <InputNumber v-model="line.unitPrice" :min="0" :fraction-digits="2" :placeholder="t('finance.unitPrice')" class="col-span-3" mode="currency" currency="MXN" />
            <span class="col-span-1 text-sm font-medium text-right">{{ fmt(line.quantity * line.unitPrice) }}</span>
            <Button icon="pi pi-trash" severity="danger" text rounded size="small" class="col-span-1" :disabled="invLines.length <= 1" @click="removeLine(idx)" />
          </div>
        </div>
        <div class="mt-3 border-t border-[var(--border)] pt-3 text-right space-y-1">
          <p class="text-sm text-[var(--text-muted)]">{{ $t('financePage.subtotal') }} <strong>{{ fmt(invSubtotal, invCurrency) }}</strong></p>
          <p class="text-sm text-[var(--text-muted)]">{{ $t('financePage.vatLine', { rate: invTaxRate }) }} <strong>{{ fmt(invTaxAmount, invCurrency) }}</strong></p>
          <p class="text-base font-bold text-[var(--text)]">{{ $t('financePage.total') }} {{ fmt(invTotal, invCurrency) }}</p>
        </div>
      </div>
      <!-- Recurring section -->
      <div class="border border-[var(--border)] rounded-lg p-3 space-y-3">
        <div class="flex items-center gap-3">
          <ToggleSwitch v-model="invIsRecurring" inputId="inv-edit-recurring" />
          <label for="inv-edit-recurring" class="text-sm font-medium cursor-pointer">{{ t('finance.recurringToggleLabel') }}</label>
        </div>
        <div v-if="invIsRecurring" class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('finance.recurrenceType') }}</label>
            <Select v-model="invRecurrenceType" :options="recurrenceTypeOptions" option-label="label" option-value="value" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('finance.recurrenceEndDate') }}</label>
            <InputText v-model="invRecurrenceEndDate" type="date" class="w-full" />
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">{{ t('finance.notes') }}</label>
        <Textarea v-model="invNotes" :rows="2" class="w-full" />
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined @click="showEditInvoiceDialog = false" />
        <Button :label="$t('financePage.saveChanges')" :loading="updateInvoiceMut.isPending.value" @click="updateInvoiceMut.mutate()" />
      </div>
    </template>
  </Dialog>

  <!-- ── CREATE PAYMENT DIALOG ─────────────────────────────────────── -->
  <Dialog v-model:visible="showPaymentDialog" :header="t('finance.newPayment')" modal class="w-full max-w-md">
    <div class="flex flex-col gap-3 pt-2">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">{{ t('finance.amount') }} *</label>
        <InputNumber v-model="payAmount" :min="0.01" :fraction-digits="2" mode="currency" currency="MXN" class="w-full" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.method') }}</label>
          <Select v-model="payMethod" :options="payMethodOptions" option-label="label" option-value="value" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.currency') }}</label>
          <Select v-model="payCurrency" :options="[{label:'MXN',value:'MXN'},{label:'USD',value:'USD'}]" option-label="label" option-value="value" class="w-full" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.source') }}</label>
          <Select v-model="paySource" :options="paySourceOptions" option-label="label" option-value="value" class="w-full" />
        </div>
        <div v-if="paySource === 'POS_IMPORT'" class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.posReference') }}</label>
          <InputText v-model="payPosReference" :placeholder="t('finance.posReferencePlaceholder')" class="w-full" />
        </div>
        <div v-else class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.reference') }}</label>
          <InputText v-model="payReference" :placeholder="t('finance.referencePlaceholder')" class="w-full" />
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">{{ t('finance.client') }}</label>
        <Select v-model="payClientId" :options="clientOptions" option-label="label" option-value="value" filter class="w-full" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">{{ t('finance.invoiceId') }}</label>
        <Select v-model="payInvoiceId" :options="invoiceOptions" option-label="label" option-value="value" filter class="w-full" />
      </div>
      <!-- Recurring -->
      <div class="border border-[var(--border)] rounded-lg p-3 space-y-3">
        <div class="flex items-center gap-3">
          <ToggleSwitch v-model="payIsRecurring" inputId="pay-recurring" />
          <label for="pay-recurring" class="text-sm font-medium cursor-pointer">{{ t('finance.recurringToggleLabel') }}</label>
        </div>
        <div v-if="payIsRecurring" class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('finance.recurrenceType') }}</label>
            <Select v-model="payRecurrenceType" :options="recurrenceTypeOptions" option-label="label" option-value="value" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('finance.recurrenceEndDate') }}</label>
            <InputText v-model="payRecurrenceEndDate" type="date" class="w-full" />
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">{{ t('finance.notes') }}</label>
        <Textarea v-model="payNotes" :rows="2" class="w-full" />
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined @click="showPaymentDialog = false" />
        <Button :label="t('common.create')" :loading="createPaymentMut.isPending.value" :disabled="!payAmount" @click="createPaymentMut.mutate()" />
      </div>
    </template>
  </Dialog>

  <!-- ── FINANCE REPORT EMAIL DIALOG ─────────────────────────────── -->
  <Dialog v-model:visible="showReportDialog" :header="$t('financePage.sendReportTitle')" modal class="w-full max-w-sm">
    <div class="flex flex-col gap-3 pt-2">
      <p class="text-sm text-[var(--text-muted)]">{{ t('finance.reportEmailDesc') }}</p>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">{{ t('finance.email') }}</label>
        <InputText v-model="reportEmail" type="email" :placeholder="t('finance.emailPlaceholder')" class="w-full" />
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="$t('financePage.cancel')" severity="secondary" outlined @click="showReportDialog = false" />
        <Button :label="$t('financePage.send')" icon="pi pi-send" :loading="sendReportMut.isPending.value" :disabled="!reportEmail" @click="sendReportMut.mutate()" />
      </div>
    </template>
  </Dialog>

  <!-- ── CREATE EXPENSE DIALOG ─────────────────────────────────────── -->
  <Dialog v-model:visible="showExpenseDialog" :header="t('finance.newExpense')" modal class="w-full max-w-md">
    <div class="flex flex-col gap-3 pt-2">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">{{ t('finance.client') }}</label>
        <Select v-model="expClientId" :options="clientOptions" option-label="label" option-value="value" filter class="w-full" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">{{ t('finance.description') }} *</label>
        <InputText v-model="expDescription" class="w-full" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.amount') }} *</label>
          <InputNumber v-model="expAmount" :min="0.01" :fraction-digits="2" mode="currency" currency="MXN" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.category') }}</label>
          <Select v-model="expCategory" :options="expCategoryOptions" option-label="label" option-value="value" class="w-full" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.vendor') }}</label>
          <InputText v-model="expVendor" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.currency') }}</label>
          <Select v-model="expCurrency" :options="[{label:'MXN',value:'MXN'},{label:'USD',value:'USD'}]" option-label="label" option-value="value" class="w-full" />
        </div>
      </div>
      <!-- Recurring -->
      <div class="border border-[var(--border)] rounded-lg p-3 space-y-3">
        <div class="flex items-center gap-3">
          <ToggleSwitch v-model="expIsRecurring" inputId="exp-recurring" />
          <label for="exp-recurring" class="text-sm font-medium cursor-pointer">{{ t('finance.recurringToggleLabel') }}</label>
        </div>
        <div v-if="expIsRecurring" class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('finance.recurrenceType') }}</label>
            <Select v-model="expRecurrenceType" :options="recurrenceTypeOptions" option-label="label" option-value="value" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('finance.recurrenceEndDate') }}</label>
            <InputText v-model="expRecurrenceEndDate" type="date" class="w-full" />
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">{{ t('finance.notes') }}</label>
        <Textarea v-model="expNotes" :rows="2" class="w-full" />
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined @click="showExpenseDialog = false" />
        <Button :label="t('common.create')" :loading="createExpenseMut.isPending.value" :disabled="!expDescription || !expAmount" @click="createExpenseMut.mutate()" />
      </div>
    </template>
  </Dialog>

  <!-- ── CREATE PURCHASE DIALOG ────────────────────────────────────── -->
  <Dialog v-model:visible="showPurchaseDialog" :header="t('finance.newPurchase')" modal class="w-full max-w-lg">
    <div class="flex flex-col gap-3 pt-2">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">{{ t('finance.description') }} *</label>
        <InputText v-model="purchDescription" class="w-full" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.amount') }} *</label>
          <InputNumber v-model="purchAmount" :min="0.01" :fraction-digits="2" mode="currency" currency="MXN" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.category') }}</label>
          <Select v-model="purchCategory" :options="expCategoryOptions" option-label="label" option-value="value" class="w-full" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.vendor') }}</label>
          <InputText v-model="purchVendor" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.currency') }}</label>
          <Select v-model="purchCurrency" :options="[{label:'MXN',value:'MXN'},{label:'USD',value:'USD'}]" option-label="label" option-value="value" class="w-full" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.purchaseQuantity') }}</label>
          <InputNumber v-model="purchQuantity" :min="0.01" :fraction-digits="2" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.purchaseUnitPrice') }}</label>
          <InputNumber v-model="purchUnitPrice" :min="0" :fraction-digits="2" mode="currency" currency="MXN" class="w-full" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.source') }}</label>
          <Select v-model="purchSource" :options="purchSourceOptions" option-label="label" option-value="value" class="w-full" />
        </div>
        <div v-if="purchSource === 'POS_IMPORT'" class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.posReference') }}</label>
          <InputText v-model="purchPosReference" :placeholder="t('finance.posReferencePlaceholder')" class="w-full" />
        </div>
      </div>
      <!-- Recurring -->
      <div class="border border-[var(--border)] rounded-lg p-3 space-y-3">
        <div class="flex items-center gap-3">
          <ToggleSwitch v-model="purchIsRecurring" inputId="purch-recurring" />
          <label for="purch-recurring" class="text-sm font-medium cursor-pointer">{{ t('finance.recurringToggleLabel') }}</label>
        </div>
        <div v-if="purchIsRecurring" class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('finance.recurrenceType') }}</label>
            <Select v-model="purchRecurrenceType" :options="recurrenceTypeOptions" option-label="label" option-value="value" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('finance.recurrenceEndDate') }}</label>
            <InputText v-model="purchRecurrenceEndDate" type="date" class="w-full" />
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">{{ t('finance.notes') }}</label>
        <Textarea v-model="purchNotes" :rows="2" class="w-full" />
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined @click="showPurchaseDialog = false" />
        <Button :label="t('common.create')" :loading="createPurchaseMut.isPending.value" :disabled="!purchDescription || !purchAmount" @click="createPurchaseMut.mutate()" />
      </div>
    </template>
  </Dialog>

  <!-- ── EDIT PURCHASE DIALOG ──────────────────────────────────────── -->
  <Dialog v-model:visible="showEditPurchaseDialog" :header="$t('financePage.editPurchase')" modal class="w-full max-w-lg">
    <div class="flex flex-col gap-3 pt-2">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">{{ t('finance.description') }} *</label>
        <InputText v-model="purchDescription" class="w-full" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.amount') }} *</label>
          <InputNumber v-model="purchAmount" :min="0.01" :fraction-digits="2" mode="currency" currency="MXN" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.category') }}</label>
          <Select v-model="purchCategory" :options="expCategoryOptions" option-label="label" option-value="value" class="w-full" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.vendor') }}</label>
          <InputText v-model="purchVendor" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('finance.source') }}</label>
          <Select v-model="purchSource" :options="purchSourceOptions" option-label="label" option-value="value" class="w-full" />
        </div>
      </div>
      <div v-if="purchSource === 'POS_IMPORT'" class="flex flex-col gap-1">
        <label class="text-sm font-medium">{{ t('finance.posReference') }}</label>
        <InputText v-model="purchPosReference" :placeholder="t('finance.posReferencePlaceholder')" class="w-full" />
      </div>
      <!-- Recurring -->
      <div class="border border-[var(--border)] rounded-lg p-3 space-y-3">
        <div class="flex items-center gap-3">
          <ToggleSwitch v-model="purchIsRecurring" inputId="purch-edit-recurring" />
          <label for="purch-edit-recurring" class="text-sm font-medium cursor-pointer">{{ t('finance.recurringToggleLabel') }}</label>
        </div>
        <div v-if="purchIsRecurring" class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('finance.recurrenceType') }}</label>
            <Select v-model="purchRecurrenceType" :options="recurrenceTypeOptions" option-label="label" option-value="value" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('finance.recurrenceEndDate') }}</label>
            <InputText v-model="purchRecurrenceEndDate" type="date" class="w-full" />
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">{{ t('finance.notes') }}</label>
        <Textarea v-model="purchNotes" :rows="2" class="w-full" />
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button :label="t('common.cancel')" severity="secondary" outlined @click="showEditPurchaseDialog = false" />
        <Button :label="$t('financePage.saveChanges')" :loading="updatePurchaseMut.isPending.value" @click="updatePurchaseMut.mutate()" />
      </div>
    </template>
  </Dialog>
</template>
