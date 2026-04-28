<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { proposalsService } from '@/services/proposals.service'
import { qk } from '@/queries/keys'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'
import type { ProposalStatus } from '@/types/proposal'
import api from '@/services/api'

async function downloadPdf(proposalId: string, proposalNumber: string) {
  const res = await api.get(`/proposals/${proposalId}/pdf`, { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${t('proposals.pdfFilename')}-${proposalNumber.replace(/\//g, '-')}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()
const toast = useToast()
const confirm = useConfirm()

const id = computed(() => route.params.id as string)

const { data: proposal, isLoading } = useQuery({
  queryKey: qk.proposal(id.value),
  queryFn: () => proposalsService.get(id.value),
  staleTime: 15000,
})

function invalidate() {
  queryClient.invalidateQueries({ queryKey: qk.proposal(id.value) })
  queryClient.invalidateQueries({ queryKey: ['proposals'] })
}

const sendMutation = useMutation({
  mutationFn: () => proposalsService.send(id.value),
  onSuccess: () => { invalidate(); toast.success(t('proposals.emailSent')) },
  onError: (err: any) => toast.error(err?.response?.data?.message ?? t('proposals.emailError')),
})
const acceptMutation = useMutation({
  mutationFn: () => proposalsService.accept(id.value),
  onSuccess: () => { invalidate(); toast.success(t('proposals.accepted')) },
  onError: () => toast.error(t('proposals.acceptError')),
})
const rejectMutation = useMutation({
  mutationFn: () => proposalsService.reject(id.value),
  onSuccess: () => { invalidate(); toast.success(t('proposals.rejected')) },
  onError: () => toast.error(t('proposals.rejectError')),
})
const viewedMutation = useMutation({
  mutationFn: () => proposalsService.markViewed(id.value),
  onSuccess: () => { invalidate(); toast.success(t('proposals.viewed')) },
  onError: () => toast.error(t('common.error')),
})
const deleteMutation = useMutation({
  mutationFn: () => proposalsService.remove(id.value),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['proposals'] })
    toast.success(t('proposals.deleted'))
    router.push('/proposals')
  },
  onError: () => toast.error(t('proposals.deleteError')),
})

function confirmDelete() {
  confirm.require({
    message: t('proposals.deleteConfirm'),
    header: t('proposals.deleteHeader'),
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteMutation.mutate(),
  })
}

function confirmSend() {
  confirm.require({
    message: t('proposals.sendConfirm', { client: proposal.value?.clientName ?? '' }),
    header: t('proposals.sendTitle'),
    icon: 'pi pi-send',
    accept: () => sendMutation.mutate(),
  })
}

function statusSeverity(status: ProposalStatus) {
  const map: Record<ProposalStatus, string> = {
    DRAFT: 'secondary', SENT: 'info', VIEWED: 'warn',
    ACCEPTED: 'success', REJECTED: 'danger', EXPIRED: 'secondary',
  }
  return map[status] ?? 'secondary'
}

function statusLabel(status: ProposalStatus) {
  return t(`proposals.status.${status.toLowerCase()}`)
}

function formatDate(d?: string | null) {
  return d ? dayjs(d).format('DD MMM YYYY, HH:mm') : '—'
}
function formatCurrency(amount: number, currency: string) {
  return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} ${currency}`
}
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto space-y-6">
    <div v-if="isLoading" class="text-center py-20 text-gray-400">
      <i class="pi pi-spin pi-spinner text-3xl" />
    </div>

    <template v-else-if="proposal">
      <!-- Header -->
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-3">
          <Button icon="pi pi-arrow-left" text @click="router.back()" />
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-xl font-bold text-gray-900 dark:text-white font-mono">{{ proposal.number }}</h1>
              <Tag :severity="statusSeverity(proposal.status)" :value="statusLabel(proposal.status)" />
              <Tag v-if="proposal.emailViewedAt" severity="success" :value="`📧 ${t('proposals.emailOpened')}`" :title="t('proposals.openedOn', { date: formatDate(proposal.emailViewedAt) })" />
            </div>
            <p class="text-sm text-gray-500 mt-0.5">{{ proposal.clientName }} · {{ proposal.title }}</p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap gap-2">
          <template v-if="proposal.status === 'DRAFT'">
            <Button :label="t('common.edit')" icon="pi pi-pencil" outlined @click="router.push(`/proposals/${id}/edit`)" />
            <Button :label="t('proposals.sendEmail')" icon="pi pi-send" :loading="sendMutation.isPending.value" @click="confirmSend" />
            <Button :label="t('common.delete')" icon="pi pi-trash" severity="danger" outlined @click="confirmDelete" />
          </template>
          <template v-if="proposal.status === 'SENT'">
            <Button :label="t('proposals.markViewed')" icon="pi pi-eye" outlined :loading="viewedMutation.isPending.value" @click="viewedMutation.mutate()" />
            <Button :label="t('proposals.acceptAction')" icon="pi pi-check" severity="success" :loading="acceptMutation.isPending.value" @click="acceptMutation.mutate()" />
            <Button :label="t('proposals.rejectAction')" icon="pi pi-times" severity="danger" outlined :loading="rejectMutation.isPending.value" @click="rejectMutation.mutate()" />
          </template>
          <template v-if="proposal.status === 'VIEWED'">
            <Button :label="t('proposals.acceptAction')" icon="pi pi-check" severity="success" :loading="acceptMutation.isPending.value" @click="acceptMutation.mutate()" />
            <Button :label="t('proposals.rejectAction')" icon="pi pi-times" severity="danger" outlined :loading="rejectMutation.isPending.value" @click="rejectMutation.mutate()" />
          </template>
          <Button :label="t('buttons.downloadPdf')" icon="pi pi-download" outlined @click="downloadPdf(proposal.id, proposal.number)" />
        </div>
      </div>

      <!-- Info cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">{{ t('fields.total') }}</p>
          <p class="text-lg font-bold text-gray-900 dark:text-white">{{ formatCurrency(proposal.total, proposal.currency) }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">{{ t('fields.validUntil') }}</p>
          <p class="font-semibold text-gray-900 dark:text-white">{{ proposal.validityDate ? dayjs(proposal.validityDate).format('DD MMM YYYY') : '—' }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">{{ t('proposals.sentAt') }}</p>
          <p class="text-sm text-gray-700 dark:text-gray-300">{{ formatDate(proposal.sentAt) }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">{{ proposal.acceptedAt ? t('proposals.status.accepted') : proposal.rejectedAt ? t('proposals.status.rejected') : t('proposals.response') }}</p>
          <p class="text-sm text-gray-700 dark:text-gray-300">{{ formatDate(proposal.acceptedAt ?? proposal.rejectedAt) }}</p>
        </div>
        <div v-if="proposal.emailViewedAt" class="bg-white dark:bg-gray-800 rounded-xl border border-green-200 dark:border-green-800 p-4">
          <p class="text-xs text-green-600 uppercase tracking-wide mb-1">{{ t('proposals.emailOpened') }}</p>
          <p class="text-sm text-gray-700 dark:text-gray-300">{{ formatDate(proposal.emailViewedAt) }}</p>
        </div>
      </div>

      <!-- Line Items -->
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h2 class="font-semibold text-gray-900 dark:text-white">{{ t('proposals.items') }}</h2>
        <DataTable :value="proposal.lineItems" :pt="{ root: { class: 'text-sm' } }">
          <Column field="description" :header="t('fields.itemDescription')" />
          <Column field="quantity" :header="t('fields.quantity')" style="width: 100px" bodyClass="text-right" />
          <Column field="unitPrice" :header="t('fields.unitPrice')" style="width: 140px" bodyClass="text-right">
            <template #body="{ data }">{{ formatCurrency(data.unitPrice, proposal.currency) }}</template>
          </Column>
          <Column field="subtotal" :header="t('fields.subtotal')" style="width: 140px" bodyClass="text-right font-medium">
            <template #body="{ data }">{{ formatCurrency(data.subtotal, proposal.currency) }}</template>
          </Column>
        </DataTable>
        <div class="flex justify-end">
          <div class="w-64 space-y-1 text-sm">
            <div class="flex justify-between text-gray-500">
              <span>{{ t('fields.subtotal') }}</span><span>{{ formatCurrency(proposal.subtotal, proposal.currency) }}</span>
            </div>
            <div v-if="proposal.discountAmount && proposal.discountAmount > 0" class="flex justify-between text-red-500">
              <span>{{ t('proposals.discount') }}{{ proposal.discountType === 'PERCENTAGE' ? ` (${proposal.discountValue}%)` : '' }}</span>
              <span>-{{ formatCurrency(proposal.discountAmount, proposal.currency) }}</span>
            </div>
            <div class="flex justify-between text-gray-500">
              <span>{{ t('fields.iva') }} ({{ proposal.taxRate }}%)</span><span>{{ formatCurrency(proposal.taxAmount, proposal.currency) }}</span>
            </div>
            <div class="flex justify-between font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-600 pt-1 text-base">
              <span>{{ t('fields.total') }}</span><span>{{ formatCurrency(proposal.total, proposal.currency) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Terms -->
      <div v-if="proposal.terms" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="font-semibold text-gray-900 dark:text-white mb-3">{{ t('fields.terms') }}</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{{ proposal.terms }}</p>
      </div>

      <!-- Notes -->
      <div v-if="proposal.notes" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="font-semibold text-gray-900 dark:text-white mb-3">{{ t('fields.internalNotes') }}</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{{ proposal.notes }}</p>
      </div>
    </template>
  </div>
</template>
