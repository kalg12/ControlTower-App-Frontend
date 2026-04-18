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
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import { DollarSign, TrendingUp, TrendingDown, Activity, Plus, Trash2 } from 'lucide-vue-next'
import { financeService } from '@/services/finance.service'
import { clientsService } from '@/services/clients.service'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import type { Invoice, Payment, Expense, InvoiceLineItemRequest, InvoiceStatus, ExpenseCategory } from '@/types/finance'

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
const { data: paymentsData, isLoading: payLoading, refetch: refetchPay } = useQuery({
  queryKey: ['finance-payments'],
  queryFn: () => financeService.listPayments({ page: 0, size: 50 }),
  staleTime: 30_000
})
const payments = computed(() => paymentsData.value?.content ?? [])

// ── Expenses ─────────────────────────────────────────────────────────
const expenseCategoryFilter = ref<ExpenseCategory | ''>('')
const expenseClientFilter = ref('')

const { data: expensesData, isLoading: expLoading, refetch: refetchExp } = useQuery({
  queryKey: computed(() => ['finance-expenses', expenseCategoryFilter.value, expenseClientFilter.value]),
  queryFn: () => financeService.listExpenses({
    category: expenseCategoryFilter.value || undefined,
    clientId: expenseClientFilter.value || undefined,
    page: 0, size: 50
  }),
  staleTime: 30_000
})
const expenses = computed(() => expensesData.value?.content ?? [])

// ── Cash Flow ─────────────────────────────────────────────────────────
const { data: cashFlow, refetch: refetchCf } = useQuery({
  queryKey: computed(() => ['finance-cashflow', cfFrom.value, cfTo.value]),
  queryFn: () => financeService.getCashFlow(cfFrom.value, cfTo.value),
  staleTime: 60_000
})

const totalIncome   = computed(() => cashFlow.value?.totalIncome ?? 0)
const totalExpenses = computed(() => cashFlow.value?.totalExpenses ?? 0)
const netFlow       = computed(() => cashFlow.value?.netFlow ?? 0)

function invalidateAll() {
  queryClient.invalidateQueries({ queryKey: ['finance-invoices'] })
  queryClient.invalidateQueries({ queryKey: ['finance-payments'] })
  queryClient.invalidateQueries({ queryKey: ['finance-expenses'] })
  queryClient.invalidateQueries({ queryKey: ['finance-cashflow'] })
}

// ── Invoice Create Dialog ────────────────────────────────────────────
const showInvoiceDialog = ref(false)
const invClientId = ref('')
const invCurrency = ref('MXN')
const invTaxRate = ref(16)
const invNotes = ref('')
const invIssuedAt = ref(dayjs().format('YYYY-MM-DD'))
const invDueDate = ref('')
const invLines = ref<InvoiceLineItemRequest[]>([
  { description: '', quantity: 1, unitPrice: 0, position: 0 }
])
const savingInv = ref(false)

function addLine() {
  invLines.value.push({ description: '', quantity: 1, unitPrice: 0, position: invLines.value.length })
}
function removeLine(idx: number) {
  invLines.value.splice(idx, 1)
}

const invSubtotal = computed(() =>
  invLines.value.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
)
const invTaxAmount = computed(() => invSubtotal.value * (invTaxRate.value / 100))
const invTotal = computed(() => invSubtotal.value + invTaxAmount.value)

const createInvoiceMut = useMutation({
  mutationFn: () => financeService.createInvoice({
    clientId: invClientId.value || undefined,
    currency: invCurrency.value,
    taxRate: invTaxRate.value,
    notes: invNotes.value || undefined,
    issuedAt: invIssuedAt.value || undefined,
    dueDate: invDueDate.value || undefined,
    lineItems: invLines.value.filter(l => l.description.trim())
  }),
  onSuccess: () => {
    toast.success(t('finance.invoiceCreated'))
    showInvoiceDialog.value = false
    invalidateAll()
  },
  onError: () => toast.error(t('errors.loadFailed'))
})

function openInvoiceDialog() {
  invClientId.value = ''
  invCurrency.value = 'MXN'
  invTaxRate.value = 16
  invNotes.value = ''
  invIssuedAt.value = dayjs().format('YYYY-MM-DD')
  invDueDate.value = ''
  invLines.value = [{ description: '', quantity: 1, unitPrice: 0, position: 0 }]
  showInvoiceDialog.value = true
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
    header: 'Eliminar factura',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: () => deleteInvMut.mutate(inv.id)
  })
}

// ── Invoice options for payment dialog ──────────────────────────────
const invoiceOptions = computed(() => [
  { label: '— Sin factura —', value: '' },
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
const savingPay = ref(false)

const payMethodOptions = [
  { label: 'Transferencia bancaria', value: 'BANK_TRANSFER' },
  { label: 'Efectivo', value: 'CASH' },
  { label: 'Tarjeta', value: 'CARD' },
  { label: 'Cheque', value: 'CHECK' },
  { label: 'Crypto', value: 'CRYPTO' },
  { label: 'Otro', value: 'OTHER' },
]

const createPaymentMut = useMutation({
  mutationFn: () => financeService.createPayment({
    clientId: payClientId.value || undefined,
    invoiceId: payInvoiceId.value || undefined,
    amount: payAmount.value,
    currency: payCurrency.value,
    method: payMethod.value as any,
    reference: payReference.value || undefined,
    notes: payNotes.value || undefined,
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
const savingExp = ref(false)

const expCategoryOptions = [
  { label: 'Nómina', value: 'PAYROLL' },
  { label: 'Servicios', value: 'SERVICES' },
  { label: 'Renta', value: 'RENT' },
  { label: 'Marketing', value: 'MARKETING' },
  { label: 'Tecnología', value: 'TECH' },
  { label: 'Viajes', value: 'TRAVEL' },
  { label: 'Suministros', value: 'SUPPLIES' },
  { label: 'Impuestos', value: 'TAXES' },
  { label: 'Otro', value: 'OTHER' },
]

const expCategoryFilterOptions = computed(() => [{ label: '— Todas —', value: '' }, ...expCategoryOptions])

const invStatusOptions = computed(() => [
  { label: '— Todas —', value: '' },
  { label: 'Borrador', value: 'DRAFT' },
  { label: 'Enviada', value: 'SENT' },
  { label: 'Pagada', value: 'PAID' },
  { label: 'Vencida', value: 'OVERDUE' },
  { label: 'Cancelada', value: 'CANCELLED' },
  { label: 'Anulada', value: 'VOIDED' },
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
  showExpenseDialog.value = true
}

const deleteExpenseMut = useMutation({
  mutationFn: (id: string) => financeService.deleteExpense(id),
  onSuccess: () => { toast.success(t('common.delete')); invalidateAll() },
  onError: () => toast.error(t('errors.loadFailed'))
})

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
    header: 'Eliminar pago',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: () => deletePaymentMut.mutate(p.id)
  })
}

function confirmDeleteExpense(e: Expense) {
  confirm.require({
    message: `¿Eliminar gasto "${e.description}"?`,
    header: 'Eliminar gasto',
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
      </div>
    </div>

    <Tabs v-model:value="activeTab">
      <TabList class="flex gap-1 rounded-xl bg-[var(--surface)] p-1 border border-[var(--border)]">
        <Tab value="overview">{{ t('finance.tabOverview') }}</Tab>
        <Tab value="invoices">{{ t('finance.tabInvoices') }}</Tab>
        <Tab value="payments">{{ t('finance.tabPayments') }}</Tab>
        <Tab value="expenses">{{ t('finance.tabExpenses') }}</Tab>
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
              <Column field="number" :header="t('finance.invoiceNumber')" style="min-width:120px" />
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
              <Column :header="t('common.actions')" style="width:160px">
                <template #body="{ data: row }: { data: Invoice }">
                  <div class="flex gap-1 items-center">
                    <Button v-if="row.status === 'DRAFT'" size="small" label="Enviar" severity="info" text @click="sendInvMut.mutate(row.id)" />
                    <Button v-if="row.status === 'SENT' || row.status === 'OVERDUE'" size="small" :label="t('finance.markPaid')" severity="success" text @click="payInvMut.mutate(row.id)" />
                    <Button v-if="row.status === 'SENT' || row.status === 'OVERDUE' || row.status === 'CANCELLED'" size="small" :label="t('finance.void')" severity="warn" text @click="voidInvMut.mutate(row.id)" />
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
              <Column field="reference" :header="t('finance.reference')">
                <template #body="{ data: row }: { data: Payment }">{{ row.reference ?? '—' }}</template>
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
          <div class="space-y-3 pt-4">
            <div class="flex flex-wrap gap-2 items-center justify-between">
              <div class="flex gap-2 flex-wrap">
                <Select v-model="expenseCategoryFilter" :options="expCategoryFilterOptions" option-label="label" option-value="value" class="w-44" @change="refetchExp()" />
                <Select v-model="expenseClientFilter" :options="clientOptions" option-label="label" option-value="value" class="w-44" :placeholder="t('finance.client')" @change="refetchExp()" />
              </div>
              <Button :label="t('finance.newExpense')" icon="pi pi-plus" @click="openExpenseDialog" />
            </div>

            <DataTable :value="expenses" :loading="expLoading" striped-rows class="rounded-xl border border-[var(--border)]">
              <Column field="paidAt" :header="t('finance.date')" style="width:110px">
                <template #body="{ data: row }: { data: Expense }">{{ fmtDate(row.paidAt) }}</template>
              </Column>
              <Column field="category" :header="t('finance.category')" style="width:120px" />
              <Column field="description" :header="t('finance.description')" />
              <Column field="clientName" :header="t('finance.client')" style="min-width:130px">
                <template #body="{ data: row }: { data: Expense }">{{ row.clientName ?? '—' }}</template>
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
          <label class="text-sm font-medium">IVA %</label>
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
          <p class="text-sm text-[var(--text-muted)]">Subtotal: <strong>{{ fmt(invSubtotal, invCurrency) }}</strong></p>
          <p class="text-sm text-[var(--text-muted)]">IVA ({{ invTaxRate }}%): <strong>{{ fmt(invTaxAmount, invCurrency) }}</strong></p>
          <p class="text-base font-bold text-[var(--text)]">Total: {{ fmt(invTotal, invCurrency) }}</p>
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
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">{{ t('finance.reference') }}</label>
        <InputText v-model="payReference" :placeholder="t('finance.referencePlaceholder')" class="w-full" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">{{ t('finance.client') }}</label>
        <Select v-model="payClientId" :options="clientOptions" option-label="label" option-value="value" filter class="w-full" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">{{ t('finance.invoiceId') }}</label>
        <Select v-model="payInvoiceId" :options="invoiceOptions" option-label="label" option-value="value" filter class="w-full" />
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
</template>
