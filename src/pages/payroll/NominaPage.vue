<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Tag from 'primevue/tag'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Dialog from 'primevue/dialog'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import { payrollService } from '@/services/payroll.service'
import { qk } from '@/queries/keys'
import { useToast } from '@/composables/useToast'
import { useConfirm } from 'primevue/useconfirm'
import dayjs from 'dayjs'
import type { Employee, PayrollPeriod, EmployeeRequest, PayrollPeriodRequest, EmployeeStatus, PayrollItemUpdateRequest } from '@/types/payroll'

const { t } = useI18n()
const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()

const activeTab = ref('employees')
const RFC_REGEX = /^[A-Z&Ñ]{4}\d{6}[A-Z\d]{3}$/

// ── Employees ─────────────────────────────────────────────────────
const empStatusFilter = ref<EmployeeStatus | undefined>(undefined)
const empFiltersKey = computed(() => JSON.stringify({ status: empStatusFilter.value }))

const { data: empResult, isLoading: empLoading } = useQuery({
  queryKey: computed(() => qk.employees(empFiltersKey.value)),
  queryFn: () => payrollService.listEmployees({ status: empStatusFilter.value, page: 0, size: 200 }),
  staleTime: 30_000,
})
const employees = computed(() => empResult.value?.content ?? [])

const empStatusOptions = [
  { label: t('nomina.all'), value: undefined },
  { label: t('nomina.active'), value: 'ACTIVE' },
  { label: t('nomina.inactive'), value: 'INACTIVE' },
  { label: t('nomina.terminated'), value: 'TERMINATED' },
]

const salaryTypeOptions = [
  { label: t('nomina.monthly'), value: 'MONTHLY' },
  { label: t('nomina.biweekly'), value: 'BIWEEKLY' },
]

function statusSeverity(s: EmployeeStatus) {
  return s === 'ACTIVE' ? 'success' : s === 'INACTIVE' ? 'warn' : 'danger'
}
function statusLabel(s: EmployeeStatus) {
  return s === 'ACTIVE' ? t('nomina.active') : s === 'INACTIVE' ? t('nomina.inactive') : t('nomina.terminated')
}

// ── Employee dialog ───────────────────────────────────────────────
const showEmpDialog = ref(false)
const editingEmpId = ref<string | null>(null)
const empFullName = ref('')
const empRfc = ref('')
const empImss = ref('')
const empCurp = ref('')
const empDept = ref('')
const empPosition = ref('')
const empSalaryType = ref<'MONTHLY' | 'BIWEEKLY'>('MONTHLY')
const empBaseSalary = ref<number>(0)
const empStartDate = ref(dayjs().format('YYYY-MM-DD'))
const empEmail = ref('')
const empBank = ref('')
const rfcError = ref('')

function openCreateEmp() {
  editingEmpId.value = null
  empFullName.value = ''
  empRfc.value = ''
  empImss.value = ''
  empCurp.value = ''
  empDept.value = ''
  empPosition.value = ''
  empSalaryType.value = 'MONTHLY'
  empBaseSalary.value = 0
  empStartDate.value = dayjs().format('YYYY-MM-DD')
  empEmail.value = ''
  empBank.value = ''
  rfcError.value = ''
  showEmpDialog.value = true
}

function openEditEmp(e: Employee) {
  editingEmpId.value = e.id
  empFullName.value = e.fullName
  empRfc.value = e.rfc
  empImss.value = e.imssNumber ?? ''
  empCurp.value = e.curp ?? ''
  empDept.value = e.department ?? ''
  empPosition.value = e.position ?? ''
  empSalaryType.value = e.salaryType
  empBaseSalary.value = e.baseSalary
  empStartDate.value = e.startDate
  empEmail.value = e.email ?? ''
  empBank.value = e.bankAccount ?? ''
  rfcError.value = ''
  showEmpDialog.value = true
}

function validateRfc() {
  rfcError.value = RFC_REGEX.test(empRfc.value.toUpperCase()) ? '' : t('nomina.rfcError')
}

const saveEmpMut = useMutation({
  mutationFn: () => {
    validateRfc()
    if (rfcError.value) throw new Error(rfcError.value)
    const req: EmployeeRequest = {
      fullName: empFullName.value,
      rfc: empRfc.value.toUpperCase(),
      imssNumber: empImss.value || undefined,
      curp: empCurp.value || undefined,
      department: empDept.value || undefined,
      position: empPosition.value || undefined,
      salaryType: empSalaryType.value,
      baseSalary: empBaseSalary.value,
      startDate: empStartDate.value,
      email: empEmail.value || undefined,
      bankAccount: empBank.value || undefined,
    }
    return editingEmpId.value
      ? payrollService.updateEmployee(editingEmpId.value, req)
      : payrollService.createEmployee(req)
  },
  onSuccess: () => {
    toast.success(editingEmpId.value ? t('nomina.employeeUpdated') : t('nomina.employeeCreated'))
    showEmpDialog.value = false
    queryClient.invalidateQueries({ queryKey: ['payroll-employees'] })
  },
  onError: (e: any) => toast.error(e?.message ?? t('nomina.saveError')),
})

function confirmTerminate(emp: Employee) {
  confirm.require({
    message: t('nomina.terminateConfirm', { name: emp.fullName }),
    header: t('nomina.terminateHeader'),
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', outlined: true },
    acceptProps: { label: t('nomina.terminate'), severity: 'danger' },
    accept: () => terminateMut.mutate(emp.id),
  })
}

const terminateMut = useMutation({
  mutationFn: (id: string) => payrollService.terminateEmployee(id),
  onSuccess: () => { toast.success(t('nomina.employeeTerminated')); queryClient.invalidateQueries({ queryKey: ['payroll-employees'] }) },
  onError: () => toast.error(t('common.error')),
})

// ── Periods ───────────────────────────────────────────────────────
const { data: periodsResult, isLoading: perLoading } = useQuery({
  queryKey: qk.payrollPeriods(),
  queryFn: () => payrollService.listPeriods({ page: 0, size: 48 }),
  staleTime: 30_000,
})
const periods = computed(() => periodsResult.value?.content ?? [])

function periodStatusSeverity(s: string) {
  return s === 'PAID' ? 'success' : s === 'PROCESSED' ? 'info' : 'secondary'
}
function periodStatusLabel(s: string) {
  return s === 'PAID' ? t('nomina.paid') : s === 'PROCESSED' ? t('nomina.processed') : t('nomina.draft')
}
function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}

// ── Period create dialog ──────────────────────────────────────────
const showPeriodDialog = ref(false)
const perYear = ref(new Date().getFullYear())
const perNumber = ref(1)
const perType = ref<'MENSUAL' | 'QUINCENAL'>('MENSUAL')
const perStart = ref(dayjs().startOf('month').format('YYYY-MM-DD'))
const perEnd = ref(dayjs().endOf('month').format('YYYY-MM-DD'))
const perNotes = ref('')

const periodTypeOptions = computed(() => [
  { label: t('nomina.monthly'), value: 'MENSUAL' },
  { label: t('nomina.biweekly'), value: 'QUINCENAL' },
])

const createPeriodMut = useMutation({
  mutationFn: () => {
    const req: PayrollPeriodRequest = {
      year: perYear.value,
      periodNumber: perNumber.value,
      periodType: perType.value,
      startDate: perStart.value,
      endDate: perEnd.value,
      notes: perNotes.value || undefined,
    }
    return payrollService.createPeriod(req)
  },
  onSuccess: (p) => {
    toast.success(t('nomina.periodCreated'))
    showPeriodDialog.value = false
    queryClient.invalidateQueries({ queryKey: ['payroll-periods'] })
    selectedPeriodId.value = p.id
    activeTab.value = 'detail'
  },
  onError: () => toast.error(t('nomina.periodError')),
})

const processMut = useMutation({
  mutationFn: (id: string) => payrollService.processPeriod(id),
  onSuccess: (p) => {
    toast.success(t('nomina.periodProcessed'))
    queryClient.invalidateQueries({ queryKey: ['payroll-periods'] })
    queryClient.invalidateQueries({ queryKey: qk.payrollPeriod(p.id) })
  },
  onError: () => toast.error(t('nomina.processError')),
})

const closeMut = useMutation({
  mutationFn: (id: string) => payrollService.closePeriod(id),
  onSuccess: (p) => {
    toast.success(t('nomina.periodClosed'))
    queryClient.invalidateQueries({ queryKey: ['payroll-periods'] })
    queryClient.invalidateQueries({ queryKey: qk.payrollPeriod(p.id) })
  },
  onError: () => toast.error(t('nomina.closeError')),
})

// ── Period detail ─────────────────────────────────────────────────
const selectedPeriodId = ref<string | null>(null)

const { data: selectedPeriod, isLoading: detailLoading } = useQuery({
  queryKey: computed(() => qk.payrollPeriod(selectedPeriodId.value ?? '')),
  queryFn: () => payrollService.getPeriod(selectedPeriodId.value!),
  enabled: computed(() => !!selectedPeriodId.value),
  staleTime: 30_000,
})

function openDetail(p: PayrollPeriod) {
  selectedPeriodId.value = p.id
  activeTab.value = 'detail'
}

// ── Item edit dialog ──────────────────────────────────────────────
const showItemDialog = ref(false)
const editingItem = ref<any>(null)
const itemDays = ref<number>(0)
const itemOvertime = ref<number>(0)
const itemOther = ref<number>(0)
const itemNotes = ref('')

function openItemEdit(item: any) {
  editingItem.value = item
  itemDays.value = item.daysWorked
  itemOvertime.value = item.overtimeHours
  itemOther.value = item.otherDeductions
  itemNotes.value = item.notes ?? ''
  showItemDialog.value = true
}

const updateItemMut = useMutation({
  mutationFn: () => {
    const req: PayrollItemUpdateRequest = {
      daysWorked: itemDays.value,
      overtimeHours: itemOvertime.value,
      otherDeductions: itemOther.value,
      notes: itemNotes.value || undefined,
    }
    return payrollService.updateItem(selectedPeriodId.value!, editingItem.value.id, req)
  },
  onSuccess: () => {
    toast.success(t('nomina.itemUpdated'))
    showItemDialog.value = false
    queryClient.invalidateQueries({ queryKey: qk.payrollPeriod(selectedPeriodId.value!) })
  },
  onError: () => toast.error(t('nomina.itemError')),
})

const sendReceiptMut = useMutation({
  mutationFn: (itemId: string) => payrollService.sendReceipt(selectedPeriodId.value!, itemId),
  onSuccess: () => {
    toast.success(t('nomina.receiptSent'))
    queryClient.invalidateQueries({ queryKey: qk.payrollPeriod(selectedPeriodId.value!) })
  },
  onError: () => toast.error(t('nomina.receiptError')),
})

function sendAllReceipts() {
  const items = selectedPeriod.value?.items ?? []
  const pending = items.filter(i => !i.receiptSent && i.employeeId)
  pending.forEach(i => sendReceiptMut.mutate(i.id))
}

async function downloadExport(type: 'csv' | 'xml') {
  if (!selectedPeriodId.value) return
  const { default: api } = await import('@/services/api')
  const ext = type === 'csv' ? 'export.csv' : 'cfdi.xml'
  const res = await api.get(`/payroll/periods/${selectedPeriodId.value}/${ext}`, { responseType: 'blob' })
  const period = selectedPeriod.value
  const name = `nomina-${period?.year}-P${period?.periodNumber}.${type === 'csv' ? 'csv' : 'xml'}`
  const url = URL.createObjectURL(new Blob([res.data]))
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-4 p-4">
    <div>
      <h1 class="text-xl font-bold text-[var(--text)]">{{ t('nomina.title') }}</h1>
      <p class="text-sm text-[var(--text-muted)]">{{ t('nomina.subtitle') }}</p>
    </div>

    <Tabs v-model:value="activeTab">
      <TabList>
        <Tab value="employees">{{ t('nomina.employees') }}</Tab>
        <Tab value="periods">{{ t('nomina.periods') }}</Tab>
        <Tab value="detail" :disabled="!selectedPeriodId">{{ t('nomina.periodDetail') }}</Tab>
      </TabList>

      <TabPanels class="mt-4">

        <!-- ── Employees tab ─────────────────────────────────── -->
        <TabPanel value="employees">
          <div class="space-y-3">
            <div class="flex items-center justify-between flex-wrap gap-3">
              <Select v-model="empStatusFilter" :options="empStatusOptions" option-label="label" option-value="value" :placeholder="t('nomina.statusPlaceholder')" class="w-40" />
              <Button :label="t('nomina.newEmployee')" icon="pi pi-plus" @click="openCreateEmp" />
            </div>

            <DataTable :value="employees" :loading="empLoading" stripedRows>
              <Column field="fullName" :header="t('nomina.name')" />
              <Column field="rfc" header="RFC" style="width:140px" />
              <Column field="department" :header="t('nomina.department')" />
              <Column field="position" :header="t('nomina.position')" />
              <Column :header="t('nomina.salaryType')" style="width:110px">
                <template #body="{ data }">{{ data.salaryType === 'MONTHLY' ? t('nomina.monthly') : t('nomina.biweekly') }}</template>
              </Column>
              <Column :header="t('nomina.baseSalary')" style="width:130px">
                <template #body="{ data }">{{ fmt(data.baseSalary) }}</template>
              </Column>
              <Column :header="t('nomina.status')" style="width:100px">
                <template #body="{ data }">
                  <Tag :severity="statusSeverity(data.status)" :value="statusLabel(data.status)" />
                </template>
              </Column>
              <Column :header="t('common.actions')" style="width:110px">
                <template #body="{ data }">
                  <div class="flex gap-1">
                    <Button v-if="data.status !== 'TERMINATED'" icon="pi pi-pencil" size="small" severity="secondary" text rounded :tooltip="t('common.edit')" @click="openEditEmp(data)" />
                    <Button v-if="data.status === 'ACTIVE'" icon="pi pi-user-minus" size="small" severity="danger" text rounded :tooltip="t('nomina.terminate')" @click="confirmTerminate(data)" />
                  </div>
                </template>
              </Column>
              <template #empty>
                <div class="text-center py-8 text-sm text-[var(--text-muted)]">{{ t('nomina.noEmployees') }}</div>
              </template>
            </DataTable>
          </div>
        </TabPanel>

        <!-- ── Periods tab ───────────────────────────────────── -->
        <TabPanel value="periods">
          <div class="space-y-3">
            <div class="flex justify-end">
              <Button :label="t('nomina.newPeriod')" icon="pi pi-plus" @click="showPeriodDialog = true" />
            </div>

            <DataTable :value="periods" :loading="perLoading" stripedRows>
              <Column field="year" :header="t('nomina.year')" style="width:80px" />
              <Column field="periodNumber" header="#" style="width:60px" />
              <Column :header="t('nomina.type')" style="width:100px">
                <template #body="{ data }">{{ data.periodType === 'MENSUAL' ? t('nomina.monthly') : t('nomina.biweekly') }}</template>
              </Column>
              <Column :header="t('nomina.dates')" style="width:200px">
                <template #body="{ data }">{{ dayjs(data.startDate).format('DD/MM/YY') }} — {{ dayjs(data.endDate).format('DD/MM/YY') }}</template>
              </Column>
              <Column :header="t('nomina.status')" style="width:110px">
                <template #body="{ data }">
                  <Tag :severity="periodStatusSeverity(data.status)" :value="periodStatusLabel(data.status)" />
                </template>
              </Column>
              <Column :header="t('nomina.net')" style="width:130px">
                <template #body="{ data }">{{ fmt(data.totalNet) }}</template>
              </Column>
              <Column :header="t('common.actions')" style="width:180px">
                <template #body="{ data }">
                  <div class="flex gap-1">
                    <Button icon="pi pi-eye" size="small" severity="secondary" text rounded :tooltip="t('nomina.viewDetail')" @click="openDetail(data)" />
                    <Button v-if="data.status === 'DRAFT'" :label="t('nomina.calculate')" size="small" severity="info" text :loading="processMut.isPending.value" @click="processMut.mutate(data.id)" />
                    <Button v-if="data.status === 'PROCESSED'" :label="t('nomina.pay')" size="small" severity="success" text :loading="closeMut.isPending.value" @click="closeMut.mutate(data.id)" />
                  </div>
                </template>
              </Column>
              <template #empty>
                <div class="text-center py-8 text-sm text-[var(--text-muted)]">{{ t('nomina.noPeriods') }}</div>
              </template>
            </DataTable>
          </div>
        </TabPanel>

        <!-- ── Period detail tab ─────────────────────────────── -->
        <TabPanel value="detail">
          <div v-if="detailLoading" class="py-8 text-center text-[var(--text-muted)]">{{ t('common.loading') }}</div>
          <div v-else-if="!selectedPeriod" class="py-8 text-center text-sm text-[var(--text-muted)]">{{ t('nomina.selectPeriod') }}</div>
          <div v-else class="space-y-4">
            <!-- Header -->
            <div class="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 class="text-lg font-bold text-[var(--text)]">
                  {{ selectedPeriod.periodType }} {{ selectedPeriod.periodNumber }}/{{ selectedPeriod.year }}
                  <Tag :severity="periodStatusSeverity(selectedPeriod.status)" :value="periodStatusLabel(selectedPeriod.status)" class="ml-2" />
                </h2>
                <p class="text-sm text-[var(--text-muted)]">{{ dayjs(selectedPeriod.startDate).format('DD/MM/YYYY') }} — {{ dayjs(selectedPeriod.endDate).format('DD/MM/YYYY') }}</p>
              </div>
              <div class="flex gap-2 flex-wrap">
                <Button v-if="selectedPeriod.status !== 'PAID'" :label="t('nomina.sendAllReceipts')" icon="pi pi-send" severity="info" outlined size="small" @click="sendAllReceipts" />
                <Button label="CSV" icon="pi pi-download" severity="secondary" outlined size="small" :title="t('nomina.exportCsv')" @click="downloadExport('csv')" />
                <Button label="CFDI XML" icon="pi pi-file-export" severity="secondary" outlined size="small" :title="t('nomina.exportCfdi')" @click="downloadExport('xml')" />
              </div>
            </div>

            <!-- Totals -->
            <div class="grid grid-cols-3 gap-3">
              <div class="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] text-center">
                <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide">{{ t('nomina.grossTotal') }}</p>
                <p class="text-xl font-bold text-[var(--text)]">{{ fmt(selectedPeriod.totalGross) }}</p>
              </div>
              <div class="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] text-center">
                <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide">{{ t('nomina.deductions') }}</p>
                <p class="text-xl font-bold text-red-500">{{ fmt(selectedPeriod.totalDeductions) }}</p>
              </div>
              <div class="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] text-center">
                <p class="text-xs text-[var(--text-muted)] uppercase tracking-wide">{{ t('nomina.netToPay') }}</p>
                <p class="text-xl font-bold text-green-500">{{ fmt(selectedPeriod.totalNet) }}</p>
              </div>
            </div>

            <!-- Items table -->
            <DataTable :value="selectedPeriod.items" stripedRows>
              <Column field="employeeName" :header="t('nomina.employee')" />
              <Column field="employeeRfc" header="RFC" style="width:130px" />
              <Column :header="t('nomina.days')" style="width:70px">
                <template #body="{ data }">{{ data.daysWorked }}</template>
              </Column>
              <Column :header="t('nomina.gross')" style="width:120px">
                <template #body="{ data }">{{ fmt(data.grossPay) }}</template>
              </Column>
              <Column header="IMSS" style="width:110px">
                <template #body="{ data }">{{ fmt(data.imssEmployee) }}</template>
              </Column>
              <Column header="ISR" style="width:110px">
                <template #body="{ data }">{{ fmt(data.isr) }}</template>
              </Column>
              <Column header="INFONAVIT" style="width:110px">
                <template #body="{ data }">{{ fmt(data.infonavit) }}</template>
              </Column>
              <Column :header="t('nomina.net')" style="width:120px">
                <template #body="{ data }">
                  <span class="font-semibold text-green-600 dark:text-green-400">{{ fmt(data.netPay) }}</span>
                </template>
              </Column>
              <Column :header="t('nomina.receipt')" style="width:80px">
                <template #body="{ data }">
                  <Tag v-if="data.receiptSent" :value="t('nomina.sent')" severity="success" />
                  <Tag v-else :value="t('nomina.pending')" severity="secondary" />
                </template>
              </Column>
              <Column :header="t('common.actions')" style="width:100px">
                <template #body="{ data }">
                  <div class="flex gap-1">
                    <Button v-if="selectedPeriod.status !== 'PAID'" icon="pi pi-pencil" size="small" severity="secondary" text rounded :tooltip="t('common.edit')" @click="openItemEdit(data)" />
                    <Button icon="pi pi-send" size="small" severity="info" text rounded :tooltip="t('nomina.sendReceipt')" :loading="sendReceiptMut.isPending.value" @click="sendReceiptMut.mutate(data.id)" />
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>
        </TabPanel>

      </TabPanels>
    </Tabs>

    <!-- Employee create/edit dialog -->
    <Dialog v-model:visible="showEmpDialog" :header="editingEmpId ? t('nomina.editEmployee') : t('nomina.newEmployee')" modal class="w-full max-w-2xl">
      <div class="flex flex-col gap-4 pt-2">
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('nomina.fullName') }} *</label>
            <InputText v-model="empFullName" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">RFC *</label>
            <InputText v-model="empRfc" class="w-full" @blur="validateRfc" :placeholder="t('nomina.rfcPlaceholder')" />
            <p v-if="rfcError" class="text-xs text-red-500">{{ rfcError }}</p>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('nomina.imss') }}</label>
            <InputText v-model="empImss" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">CURP</label>
            <InputText v-model="empCurp" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('nomina.department') }}</label>
            <InputText v-model="empDept" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('nomina.position') }}</label>
            <InputText v-model="empPosition" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('nomina.salaryType') }} *</label>
            <Select v-model="empSalaryType" :options="salaryTypeOptions" option-label="label" option-value="value" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('nomina.baseSalary') }} *</label>
            <InputNumber v-model="empBaseSalary" mode="currency" currency="MXN" :min="0.01" :fraction-digits="2" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('nomina.startDate') }} *</label>
            <InputText v-model="empStartDate" type="date" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('nomina.email') }}</label>
            <InputText v-model="empEmail" type="email" class="w-full" />
          </div>
          <div class="flex flex-col gap-1 col-span-2">
            <label class="text-sm font-medium">{{ t('nomina.bankAccount') }}</label>
            <InputText v-model="empBank" class="w-full" />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button :label="t('common.cancel')" severity="secondary" outlined @click="showEmpDialog = false" />
          <Button :label="editingEmpId ? t('common.save') : t('nomina.register')" :loading="saveEmpMut.isPending.value" :disabled="!empFullName || !empRfc || !empBaseSalary" @click="saveEmpMut.mutate()" />
        </div>
      </template>
    </Dialog>

    <!-- Period create dialog -->
    <Dialog v-model:visible="showPeriodDialog" :header="t('nomina.newPeriod')" modal class="w-full max-w-md">
      <div class="flex flex-col gap-4 pt-2">
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('nomina.year') }} *</label>
            <InputNumber v-model="perYear" :min="2020" :max="2099" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('nomina.periodNumber') }} *</label>
            <InputNumber v-model="perNumber" :min="1" :max="24" class="w-full" />
          </div>
          <div class="flex flex-col gap-1 col-span-2">
            <label class="text-sm font-medium">{{ t('nomina.type') }} *</label>
            <Select v-model="perType" :options="periodTypeOptions" option-label="label" option-value="value" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('nomina.startDate') }} *</label>
            <InputText v-model="perStart" type="date" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">{{ t('nomina.endDate') }} *</label>
            <InputText v-model="perEnd" type="date" class="w-full" />
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button :label="t('common.cancel')" severity="secondary" outlined @click="showPeriodDialog = false" />
          <Button :label="t('nomina.createPeriod')" :loading="createPeriodMut.isPending.value" @click="createPeriodMut.mutate()" />
        </div>
      </template>
    </Dialog>

    <!-- Item edit dialog -->
    <Dialog v-model:visible="showItemDialog" :header="`${t('nomina.editItem')}: ${editingItem?.employeeName ?? ''}`" modal class="w-full max-w-sm">
      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('nomina.daysWorked') }} *</label>
          <InputNumber v-model="itemDays" :min="0" :max="31" :fraction-digits="2" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('nomina.overtime') }}</label>
          <InputNumber v-model="itemOvertime" :min="0" :fraction-digits="2" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium">{{ t('nomina.otherDeductions') }}</label>
          <InputNumber v-model="itemOther" mode="currency" currency="MXN" :min="0" :fraction-digits="2" class="w-full" />
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button :label="t('common.cancel')" severity="secondary" outlined @click="showItemDialog = false" />
          <Button :label="t('nomina.recalculate')" :loading="updateItemMut.isPending.value" @click="updateItemMut.mutate()" />
        </div>
      </template>
    </Dialog>
  </div>
</template>
