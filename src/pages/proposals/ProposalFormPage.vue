<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import DatePicker from 'primevue/datepicker'
import { proposalsService } from '@/services/proposals.service'
import { useToast } from '@/composables/useToast'
import { qk } from '@/queries/keys'
import dayjs from 'dayjs'
import api from '@/services/api'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const toast = useToast()

const proposalId = computed(() => route.params.id as string | undefined)
const isEditing = computed(() => !!proposalId.value)

// Load clients for select
const { data: clientsResult } = useQuery({
  queryKey: ['clients-simple'],
  queryFn: () => import('@/services/clients.service').then(m => m.clientsService.list({ page: 0, size: 200 })),
  staleTime: 60000,
})
const clientOptions = computed(() =>
  (clientsResult.value?.content ?? []).map(c => ({ label: c.name, value: c.id }))
)

// Load existing proposal for edit
const { data: existingProposal } = useQuery({
  queryKey: qk.proposal(proposalId.value ?? ''),
  queryFn: () => proposalsService.get(proposalId.value!),
  enabled: isEditing,
})

// Form state
const clientId = ref('')
const title = ref('')
const description = ref('')
const validityDate = ref<Date | null>(null)
const currency = ref('MXN')
const taxRate = ref(16)
const notes = ref('')
const terms = ref('')
const lineItems = ref<{ description: string; quantity: number; unitPrice: number; position: number }[]>([
  { description: '', quantity: 1, unitPrice: 0, position: 0 }
])
const discountType = ref<'PERCENTAGE' | 'AMOUNT'>('PERCENTAGE')
const discountValue = ref(0)

watch(existingProposal, (p) => {
  if (!p) return
  clientId.value = p.clientId
  title.value = p.title
  description.value = p.description ?? ''
  validityDate.value = p.validityDate ? new Date(p.validityDate) : null
  currency.value = p.currency
  taxRate.value = p.taxRate
  notes.value = p.notes ?? ''
  terms.value = p.terms ?? ''
  lineItems.value = p.lineItems.map(li => ({
    description: li.description,
    quantity: li.quantity,
    unitPrice: li.unitPrice,
    position: li.position,
  }))
  discountType.value = (p.discountType as 'PERCENTAGE' | 'AMOUNT') ?? 'PERCENTAGE'
  discountValue.value = p.discountValue ?? 0
}, { immediate: true })

// Auto-calculate
const subtotal = computed(() =>
  lineItems.value.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0)
)
const discountAmount = computed(() => {
  if (!discountValue.value || discountValue.value <= 0) return 0
  if (discountType.value === 'PERCENTAGE')
    return subtotal.value * (discountValue.value / 100)
  return Math.min(discountValue.value, subtotal.value)
})
const taxableBase = computed(() => subtotal.value - discountAmount.value)
const taxAmount = computed(() => taxableBase.value * (taxRate.value / 100))
const total = computed(() => taxableBase.value + taxAmount.value)

function addLine() {
  lineItems.value.push({ description: '', quantity: 1, unitPrice: 0, position: lineItems.value.length })
}
function removeLine(index: number) {
  if (lineItems.value.length > 1) lineItems.value.splice(index, 1)
}

const currencyOptions = computed(() => [
  { label: t('proposals.currencyMXN'), value: 'MXN' },
  { label: t('proposals.currencyUSD'), value: 'USD' },
])
const discountTypeOptions = computed(() => [
  { label: t('proposals.discountPercentage'), value: 'PERCENTAGE' },
  { label: t('proposals.discountFixed'), value: 'AMOUNT' },
])

async function downloadPdf() {
  if (!proposalId.value) return
  const res = await api.get(`/proposals/${proposalId.value}/pdf`, { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${t('proposals.pdfFilename')}-${proposalId.value}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

function buildPayload() {
  return {
    clientId: clientId.value,
    title: title.value,
    description: description.value || undefined,
    validityDate: validityDate.value ? dayjs(validityDate.value).format('YYYY-MM-DD') : undefined,
    currency: currency.value,
    taxRate: taxRate.value,
    notes: notes.value || undefined,
    terms: terms.value || undefined,
    lineItems: lineItems.value.map((li, i) => ({
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      position: i,
    })),
    discountType: discountValue.value > 0 ? discountType.value : null,
    discountValue: discountValue.value > 0 ? discountValue.value : null,
  }
}

const createMutation = useMutation({
  mutationFn: (data: ReturnType<typeof buildPayload>) => proposalsService.create(data),
  onSuccess: (p) => {
    queryClient.invalidateQueries({ queryKey: ['proposals'] })
    toast.success(t('proposals.saveSuccess'))
    router.push(`/proposals/${p.id}`)
  },
  onError: () => toast.error(t('proposals.createFailed')),
})

const updateMutation = useMutation({
  mutationFn: (data: ReturnType<typeof buildPayload>) => proposalsService.update(proposalId.value!, data),
  onSuccess: (p) => {
    queryClient.invalidateQueries({ queryKey: ['proposals'] })
    queryClient.invalidateQueries({ queryKey: qk.proposal(proposalId.value!) })
    toast.success(t('proposals.updateSuccess'))
    router.push(`/proposals/${p.id}`)
  },
  onError: () => toast.error(t('proposals.updateFailed')),
})

const isSubmitting = computed(() => createMutation.isPending.value || updateMutation.isPending.value)

function onSubmit() {
  if (!clientId.value || !title.value) {
    toast.warning(t('proposals.validationRequired'))
    return
  }
  const payload = buildPayload()
  if (isEditing.value) updateMutation.mutate(payload)
  else createMutation.mutate(payload)
}
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <Button icon="pi pi-arrow-left" text @click="router.back()" />
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">
          {{ isEditing ? t('proposals.editTitle') : t('proposals.newTitle') }}
        </h1>
      </div>
      <Button v-if="isEditing" :label="t('buttons.downloadPdf')" icon="pi pi-download" outlined size="small" @click="downloadPdf" />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('fields.client') }} <span class="text-red-500">*</span></label>
        <Select v-model="clientId" :options="clientOptions" optionLabel="label" optionValue="value" :placeholder="t('placeholders.selectClient')" class="w-full" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('fields.title') }} <span class="text-red-500">*</span></label>
        <InputText v-model="title" :placeholder="t('placeholders.proposalTitle')" class="w-full" />
      </div>
      <div class="flex flex-col gap-1 md:col-span-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('fields.description') }}</label>
        <Textarea v-model="description" rows="3" class="w-full" :placeholder="t('placeholders.proposalDescription')" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('fields.currency') }}</label>
        <Select v-model="currency" :options="currencyOptions" optionLabel="label" optionValue="value" class="w-full" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('fields.validUntil') }}</label>
        <DatePicker v-model="validityDate" showIcon dateFormat="dd/mm/yy" class="w-full" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('fields.iva') }}</label>
        <InputNumber v-model="taxRate" :min="0" :max="100" :maxFractionDigits="2" class="w-full" />
      </div>
    </div>

    <!-- Line Items -->
    <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold text-gray-900 dark:text-white">{{ t('proposals.items') }}</h2>
        <Button :label="t('buttons.addLine')" icon="pi pi-plus" size="small" outlined @click="addLine" />
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
              <th class="pb-2 w-1/2">{{ t('fields.itemDescription') }}</th>
              <th class="pb-2 w-24 text-right">{{ t('fields.quantity') }}</th>
              <th class="pb-2 w-32 text-right">{{ t('fields.unitPrice') }}</th>
              <th class="pb-2 w-32 text-right">{{ t('fields.subtotal') }}</th>
              <th class="pb-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, i) in lineItems" :key="i" class="border-b border-gray-100 dark:border-gray-700">
              <td class="py-2 pr-3">
                <InputText v-model="item.description" class="w-full" :placeholder="t('placeholders.itemDescription')" />
              </td>
              <td class="py-2 pr-3">
                <InputNumber v-model="item.quantity" :min="0.01" :maxFractionDigits="2" inputClass="w-full text-right" />
              </td>
              <td class="py-2 pr-3">
                <InputNumber v-model="item.unitPrice" :min="0" mode="currency" :currency="currency" locale="es-MX" inputClass="w-full text-right" />
              </td>
              <td class="py-2 pr-3 text-right font-medium text-gray-700 dark:text-gray-300">
                ${{ (item.quantity * item.unitPrice).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}
              </td>
              <td class="py-2">
                <Button icon="pi pi-times" text severity="danger" size="small" @click="removeLine(i)" :disabled="lineItems.length <= 1" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Discount + Totals -->
      <div class="flex flex-col sm:flex-row justify-between gap-6">
        <!-- Discount input -->
        <div class="flex items-end gap-2">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ t('proposals.discount') }}</label>
            <Select v-model="discountType" :options="discountTypeOptions" optionLabel="label" optionValue="value" class="w-40" />
          </div>
          <InputNumber
            v-model="discountValue"
            :min="0"
            :max="discountType === 'PERCENTAGE' ? 100 : undefined"
            :maxFractionDigits="2"
            :suffix="discountType === 'PERCENTAGE' ? ' %' : ''"
            :mode="discountType === 'AMOUNT' ? 'currency' : 'decimal'"
            :currency="discountType === 'AMOUNT' ? currency : undefined"
            locale="es-MX"
            inputClass="w-36 text-right"
            :placeholder="t('placeholders.zero')"
          />
        </div>

        <!-- Totals -->
        <div class="w-64 space-y-1 text-sm self-end">
          <div class="flex justify-between text-gray-600 dark:text-gray-400">
            <span>{{ t('fields.subtotal') }}</span>
            <span>${{ subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</span>
          </div>
          <div v-if="discountAmount > 0" class="flex justify-between text-red-500">
            <span>{{ t('proposals.discountLabel') }} {{ discountType === 'PERCENTAGE' ? `(${discountValue}%)` : '' }}</span>
            <span>-${{ discountAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</span>
          </div>
          <div class="flex justify-between text-gray-600 dark:text-gray-400">
            <span>{{ t('fields.iva') }} ({{ taxRate }}%)</span>
            <span>${{ taxAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 }) }}</span>
          </div>
          <div class="flex justify-between font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-600 pt-1">
            <span>{{ t('fields.total') }}</span>
            <span>${{ total.toLocaleString('es-MX', { minimumFractionDigits: 2 }) }} {{ currency }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Notes & Terms -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('fields.internalNotes') }}</label>
        <Textarea v-model="notes" rows="4" class="w-full" :placeholder="t('placeholders.internalNotes')" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ t('fields.terms') }}</label>
        <Textarea v-model="terms" rows="4" class="w-full" :placeholder="t('placeholders.terms')" />
      </div>
    </div>

    <div class="flex justify-end gap-3">
      <Button :label="t('buttons.cancel')" text @click="router.back()" />
      <Button :label="t('buttons.saveProposal')" icon="pi pi-save" :loading="isSubmitting" @click="onSubmit" />
    </div>
  </div>
</template>
