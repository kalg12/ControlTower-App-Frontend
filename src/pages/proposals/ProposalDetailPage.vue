<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { useConfirm } from "primevue/useconfirm";
import Button from "primevue/button";
import Tag from "primevue/tag";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import VuePdfEmbed from "vue-pdf-embed";
import { proposalsService } from "@/services/proposals.service";
import { qk } from "@/queries/keys";
import { useToast } from "@/composables/useToast";
import dayjs from "dayjs";
import type { ProposalStatus } from "@/types/proposal";
import api from "@/services/api";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const toast = useToast();
const confirm = useConfirm();

const id = computed(() => route.params.id as string);

const { data: proposal, isLoading } = useQuery({
  queryKey: qk.proposal(id.value),
  queryFn: () => proposalsService.get(id.value),
  staleTime: 15000,
});

// ── PDF viewer ──────────────────────────────────────────────────────────
const pdfSource = ref<ArrayBuffer | null>(null);
const pdfLoading = ref(false);
const pdfError = ref(false);
const showPdf = ref(false);

async function loadPdf() {
  if (pdfSource.value) { showPdf.value = true; return }
  pdfLoading.value = true;
  pdfError.value = false;
  try {
    const res = await api.get(`/proposals/${id.value}/pdf`, {
      responseType: "arraybuffer",
    });
    pdfSource.value = res.data;
    showPdf.value = true;
  } catch {
    pdfError.value = true;
  } finally {
    pdfLoading.value = false;
  }
}

watch(() => proposal.value, (val) => {
  if (val) loadPdf();
}, { immediate: true });

function togglePdf() {
  if (showPdf.value) {
    showPdf.value = false;
  } else {
    loadPdf();
  }
}

async function downloadPdf(proposalId: string, proposalNumber: string) {
  if (!pdfSource.value) {
    const res = await api.get(`/proposals/${proposalId}/pdf`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t("proposals.pdfFilename")}-${proposalNumber.replace(/\//g, "-")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    return
  }
  const blob = new Blob([pdfSource.value], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${t("proposals.pdfFilename")}-${proposalNumber.replace(/\//g, "-")}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

function invalidate() {
  queryClient.invalidateQueries({ queryKey: qk.proposal(id.value) });
  queryClient.invalidateQueries({ queryKey: ["proposals"] });
}

const sendMutation = useMutation({
  mutationFn: () => proposalsService.send(id.value),
  onSuccess: () => { invalidate(); toast.success(t("proposals.emailSent")) },
  onError: (err: any) => toast.error(err?.response?.data?.message ?? t("proposals.emailError")),
});
const acceptMutation = useMutation({
  mutationFn: () => proposalsService.accept(id.value),
  onSuccess: () => { invalidate(); toast.success(t("proposals.accepted")) },
  onError: () => toast.error(t("proposals.acceptError")),
});
const rejectMutation = useMutation({
  mutationFn: () => proposalsService.reject(id.value),
  onSuccess: () => { invalidate(); toast.success(t("proposals.rejected")) },
  onError: () => toast.error(t("proposals.rejectError")),
});
const viewedMutation = useMutation({
  mutationFn: () => proposalsService.markViewed(id.value),
  onSuccess: () => { invalidate(); toast.success(t("proposals.viewed")) },
  onError: () => toast.error(t("common.error")),
});
const deleteMutation = useMutation({
  mutationFn: () => proposalsService.remove(id.value),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["proposals"] });
    toast.success(t("proposals.deleted"));
    router.push("/proposals");
  },
  onError: () => toast.error(t("proposals.deleteError")),
});

function confirmDelete() {
  confirm.require({
    message: t("proposals.deleteConfirm"),
    header: t("proposals.deleteHeader"),
    icon: "pi pi-exclamation-triangle",
    acceptClass: "p-button-danger",
    accept: () => deleteMutation.mutate(),
  });
}

function confirmSend() {
  confirm.require({
    message: t("proposals.sendConfirm", { client: proposal.value?.clientName ?? "" }),
    header: t("proposals.sendTitle"),
    icon: "pi pi-send",
    accept: () => sendMutation.mutate(),
  });
}

function statusSeverity(status: ProposalStatus) {
  const map: Record<ProposalStatus, string> = {
    DRAFT: "secondary", SENT: "info", VIEWED: "warn",
    ACCEPTED: "success", REJECTED: "danger", EXPIRED: "secondary",
  };
  return map[status] ?? "secondary";
}

function statusLabel(status: ProposalStatus) {
  return t(`proposals.status.${status.toLowerCase()}`);
}

function formatDate(d?: string | null) {
  return d ? dayjs(d).format("DD MMM YYYY, HH:mm") : "—";
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(amount);
}
</script>

<template>
  <div class="proposal-detail">
    <div v-if="isLoading" class="flex items-center justify-center py-32">
      <i class="pi pi-spin pi-spinner text-3xl text-[var(--text-muted)]" />
    </div>

    <template v-else-if="proposal">
      <!-- ── Header ──────────────────────────────────────────────── -->
      <div class="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div class="flex items-center gap-3 min-w-0">
          <Button icon="pi pi-arrow-left" text @click="router.back()" />
          <div class="min-w-0">
            <div class="flex items-center gap-3 flex-wrap">
              <h1 class="text-xl font-bold text-[var(--text)] font-mono truncate">
                {{ proposal.number }}
              </h1>
              <Tag :severity="statusSeverity(proposal.status)" :value="statusLabel(proposal.status)" />
              <Tag v-if="proposal.emailViewedAt" severity="success" :value="`📧 ${t('proposals.emailOpened')}`" />
            </div>
            <p class="text-sm text-[var(--text-muted)] mt-0.5 truncate">
              {{ proposal.clientName }} · {{ proposal.title }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 shrink-0">
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
          <Button
            :label="showPdf ? t('common.close') : t('fields.preview')"
            icon="pi pi-eye"
            :severity="showPdf ? 'secondary' : 'info'"
            :outlined="!showPdf"
            @click="togglePdf"
          />
        </div>
      </div>

      <!-- ── Info Cards ──────────────────────────────────────────── -->
      <div class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
        <div class="card-info">
          <p class="card-info-label">{{ t("fields.total") }}</p>
          <p class="card-info-value">{{ formatCurrency(proposal.total, proposal.currency) }}</p>
        </div>
        <div class="card-info">
          <p class="card-info-label">{{ t("fields.validUntil") }}</p>
          <p class="card-info-value text-sm">
            {{ proposal.validityDate ? dayjs(proposal.validityDate).format("DD MMM YYYY") : "—" }}
          </p>
        </div>
        <div class="card-info">
          <p class="card-info-label">{{ t("proposals.sentAt") }}</p>
          <p class="card-info-value text-sm">{{ formatDate(proposal.sentAt) }}</p>
        </div>
        <div class="card-info">
          <p class="card-info-label">
            {{ proposal.acceptedAt ? t("proposals.status.accepted") : proposal.rejectedAt ? t("proposals.status.rejected") : t("proposals.response") }}
          </p>
          <p class="card-info-value text-sm">{{ formatDate(proposal.acceptedAt ?? proposal.rejectedAt) }}</p>
        </div>
        <div v-if="proposal.emailViewedAt" class="card-info border-l-2 border-[var(--success)]">
          <p class="card-info-label text-[var(--success)]">{{ t("proposals.emailOpened") }}</p>
          <p class="card-info-value text-sm">{{ formatDate(proposal.emailViewedAt) }}</p>
        </div>
      </div>

      <!-- ── Two-column layout: details + PDF ────────────────────── -->
      <div class="flex flex-col xl:flex-row gap-6">
        <!-- Left: Line items, summary, terms, notes -->
        <div class="flex-1 min-w-0 space-y-6">
          <div class="card-section">
            <h2 class="card-section-title">{{ t("proposals.items") }}</h2>
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
            <div class="flex justify-end mt-4">
              <div class="w-72 space-y-1.5 text-sm">
                <div class="flex justify-between text-[var(--text-muted)]">
                  <span>{{ t("fields.subtotal") }}</span>
                  <span>{{ formatCurrency(proposal.subtotal, proposal.currency) }}</span>
                </div>
                <div v-if="proposal.discountAmount && proposal.discountAmount > 0" class="flex justify-between text-red-500">
                  <span>{{ t("proposals.discount") }}{{ proposal.discountType === "PERCENTAGE" ? ` (${proposal.discountValue}%)` : "" }}</span>
                  <span>-{{ formatCurrency(proposal.discountAmount, proposal.currency) }}</span>
                </div>
                <div class="flex justify-between text-[var(--text-muted)]">
                  <span>{{ t("fields.iva") }} ({{ proposal.taxRate }}%)</span>
                  <span>{{ formatCurrency(proposal.taxAmount, proposal.currency) }}</span>
                </div>
                <div class="flex justify-between font-bold text-[var(--text)] border-t border-[var(--border)] pt-2 text-base">
                  <span>{{ t("fields.total") }}</span>
                  <span>{{ formatCurrency(proposal.total, proposal.currency) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="proposal.terms" class="card-section">
            <h2 class="card-section-title">{{ t("fields.terms") }}</h2>
            <p class="text-sm text-[var(--text-muted)] whitespace-pre-wrap">{{ proposal.terms }}</p>
          </div>

          <div v-if="proposal.notes" class="card-section">
            <h2 class="card-section-title">{{ t("fields.internalNotes") }}</h2>
            <p class="text-sm text-[var(--text-muted)] whitespace-pre-wrap">{{ proposal.notes }}</p>
          </div>
        </div>

        <!-- Right: PDF Viewer -->
        <div v-if="showPdf" class="xl:w-[560px] shrink-0">
          <div class="card-section">
            <div class="flex items-center justify-between mb-3">
              <h2 class="card-section-title !mb-0">{{ t("fields.preview") }}</h2>
              <button class="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors" @click="showPdf = false">✕</button>
            </div>
            <div v-if="pdfLoading" class="flex items-center justify-center py-16">
              <i class="pi pi-spin pi-spinner text-2xl text-[var(--text-muted)]" />
            </div>
            <div v-else-if="pdfError" class="flex flex-col items-center justify-center py-16 text-[var(--text-muted)] gap-2">
              <i class="pi pi-exclamation-triangle text-2xl" />
              <p class="text-sm">{{ t("common.error") }}</p>
            </div>
            <div v-else-if="pdfSource" class="pdf-container">
              <VuePdfEmbed :source="pdfSource" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.proposal-detail {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.card-info {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1rem;
}

.card-info-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 0.25rem;
}

.card-info-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text);
}

.card-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 1.5rem;
}

.card-section-title {
  font-weight: 600;
  font-size: 1rem;
  color: var(--text);
  margin-bottom: 1rem;
}

.pdf-container {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--bg-subtle);
}

.pdf-container :deep(.vue-pdf-embed) {
  width: 100%;
}

.pdf-container :deep(.vue-pdf-embed > div) {
  margin: 0 auto;
}
</style>
