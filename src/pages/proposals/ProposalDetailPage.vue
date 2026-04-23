<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
  onSuccess: () => { invalidate(); toast.success('Propuesta enviada por email') },
  onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error al enviar'),
})
const acceptMutation = useMutation({
  mutationFn: () => proposalsService.accept(id.value),
  onSuccess: () => { invalidate(); toast.success('Propuesta aceptada') },
  onError: () => toast.error('Error al aceptar'),
})
const rejectMutation = useMutation({
  mutationFn: () => proposalsService.reject(id.value),
  onSuccess: () => { invalidate(); toast.success('Propuesta rechazada') },
  onError: () => toast.error('Error al rechazar'),
})
const viewedMutation = useMutation({
  mutationFn: () => proposalsService.markViewed(id.value),
  onSuccess: () => { invalidate(); toast.success('Marcada como vista') },
  onError: () => toast.error('Error'),
})
const deleteMutation = useMutation({
  mutationFn: () => proposalsService.remove(id.value),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['proposals'] })
    toast.success('Propuesta eliminada')
    router.push('/proposals')
  },
  onError: () => toast.error('Error al eliminar'),
})

function confirmDelete() {
  confirm.require({
    message: '¿Eliminar esta propuesta?',
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => deleteMutation.mutate(),
  })
}

function confirmSend() {
  confirm.require({
    message: `Se enviará la propuesta por email al cliente ${proposal.value?.clientName}. ¿Continuar?`,
    header: 'Enviar propuesta',
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
  const map: Record<ProposalStatus, string> = {
    DRAFT: 'Borrador', SENT: 'Enviada', VIEWED: 'Vista',
    ACCEPTED: 'Aceptada', REJECTED: 'Rechazada', EXPIRED: 'Vencida',
  }
  return map[status] ?? status
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
            </div>
            <p class="text-sm text-gray-500 mt-0.5">{{ proposal.clientName }} · {{ proposal.title }}</p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap gap-2">
          <template v-if="proposal.status === 'DRAFT'">
            <Button label="Editar" icon="pi pi-pencil" outlined @click="router.push(`/proposals/${id}/edit`)" />
            <Button label="Enviar por email" icon="pi pi-send" :loading="sendMutation.isPending.value" @click="confirmSend" />
            <Button label="Eliminar" icon="pi pi-trash" severity="danger" outlined @click="confirmDelete" />
          </template>
          <template v-if="proposal.status === 'SENT'">
            <Button label="Marcar como vista" icon="pi pi-eye" outlined :loading="viewedMutation.isPending.value" @click="viewedMutation.mutate()" />
            <Button label="Aceptar" icon="pi pi-check" severity="success" :loading="acceptMutation.isPending.value" @click="acceptMutation.mutate()" />
            <Button label="Rechazar" icon="pi pi-times" severity="danger" outlined :loading="rejectMutation.isPending.value" @click="rejectMutation.mutate()" />
          </template>
          <template v-if="proposal.status === 'VIEWED'">
            <Button label="Aceptar" icon="pi pi-check" severity="success" :loading="acceptMutation.isPending.value" @click="acceptMutation.mutate()" />
            <Button label="Rechazar" icon="pi pi-times" severity="danger" outlined :loading="rejectMutation.isPending.value" @click="rejectMutation.mutate()" />
          </template>
          <Button label="Descargar PDF" icon="pi pi-download" text disabled v-tooltip="'Próximamente'" />
        </div>
      </div>

      <!-- Info cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Total</p>
          <p class="text-lg font-bold text-gray-900 dark:text-white">{{ formatCurrency(proposal.total, proposal.currency) }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Válida hasta</p>
          <p class="font-semibold text-gray-900 dark:text-white">{{ proposal.validityDate ? dayjs(proposal.validityDate).format('DD MMM YYYY') : '—' }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Enviada</p>
          <p class="text-sm text-gray-700 dark:text-gray-300">{{ formatDate(proposal.sentAt) }}</p>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">{{ proposal.acceptedAt ? 'Aceptada' : proposal.rejectedAt ? 'Rechazada' : 'Respuesta' }}</p>
          <p class="text-sm text-gray-700 dark:text-gray-300">{{ formatDate(proposal.acceptedAt ?? proposal.rejectedAt) }}</p>
        </div>
      </div>

      <!-- Line Items -->
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h2 class="font-semibold text-gray-900 dark:text-white">Conceptos</h2>
        <DataTable :value="proposal.lineItems" :pt="{ root: { class: 'text-sm' } }">
          <Column field="description" header="Descripción" />
          <Column field="quantity" header="Cantidad" style="width: 100px" bodyClass="text-right" />
          <Column field="unitPrice" header="Precio unit." style="width: 140px" bodyClass="text-right">
            <template #body="{ data }">{{ formatCurrency(data.unitPrice, proposal.currency) }}</template>
          </Column>
          <Column field="subtotal" header="Subtotal" style="width: 140px" bodyClass="text-right font-medium">
            <template #body="{ data }">{{ formatCurrency(data.subtotal, proposal.currency) }}</template>
          </Column>
        </DataTable>
        <div class="flex justify-end">
          <div class="w-64 space-y-1 text-sm">
            <div class="flex justify-between text-gray-500">
              <span>Subtotal</span><span>{{ formatCurrency(proposal.subtotal, proposal.currency) }}</span>
            </div>
            <div class="flex justify-between text-gray-500">
              <span>IVA ({{ proposal.taxRate }}%)</span><span>{{ formatCurrency(proposal.taxAmount, proposal.currency) }}</span>
            </div>
            <div class="flex justify-between font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-600 pt-1 text-base">
              <span>Total</span><span>{{ formatCurrency(proposal.total, proposal.currency) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Terms -->
      <div v-if="proposal.terms" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="font-semibold text-gray-900 dark:text-white mb-3">Términos y condiciones</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{{ proposal.terms }}</p>
      </div>

      <!-- Notes -->
      <div v-if="proposal.notes" class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="font-semibold text-gray-900 dark:text-white mb-3">Notas internas</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{{ proposal.notes }}</p>
      </div>
    </template>
  </div>
</template>
