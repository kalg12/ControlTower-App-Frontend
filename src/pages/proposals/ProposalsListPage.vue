<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { useConfirm } from "primevue/useconfirm";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Tag from "primevue/tag";
import Button from "primevue/button";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import { proposalsService } from "@/services/proposals.service";
import { qk } from "@/queries/keys";
import { useToast } from "@/composables/useToast";
import dayjs from "dayjs";
import type { ProposalStatus } from "@/types/proposal";

const { t, locale } = useI18n();
const router = useRouter();
const queryClient = useQueryClient();
const toast = useToast();
const confirm = useConfirm();

const statusFilter = ref<ProposalStatus | undefined>(undefined);
const clientFilter = ref<string | undefined>(undefined);
const dateRange = ref<Date[] | null>(null);

const filters = computed(() => ({
  status: statusFilter.value,
  clientId: clientFilter.value,
  from: dateRange.value?.[0]
    ? dayjs(dateRange.value[0]).toISOString()
    : undefined,
  to: dateRange.value?.[1]
    ? dayjs(dateRange.value[1]).toISOString()
    : undefined,
  page: 0,
  size: 50,
}));

const filtersKey = computed(() => JSON.stringify(filters.value));

const { data: result, isLoading } = useQuery({
  queryKey: qk.proposals(filtersKey.value),
  queryFn: () => proposalsService.list(filters.value),
  staleTime: 30000,
});

const proposals = computed(() => result.value?.content ?? []);

const deleteMutation = useMutation({
  mutationFn: (id: string) => proposalsService.remove(id),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["proposals"] });
    toast.success(t("proposals.deleteSuccess"));
  },
  onError: () => toast.error(t("proposals.deleteFailed")),
});

function confirmDelete(id: string) {
  confirm.require({
    message: t("proposals.deleteConfirm"),
    header: t("proposals.deleteHeader"),
    icon: "pi pi-exclamation-triangle",
    acceptClass: "p-button-danger",
    accept: () => deleteMutation.mutate(id),
  });
}

function statusSeverity(status: ProposalStatus) {
  const map: Record<ProposalStatus, string> = {
    DRAFT: "secondary",
    SENT: "info",
    VIEWED: "warn",
    ACCEPTED: "success",
    REJECTED: "danger",
    EXPIRED: "secondary",
  };
  return map[status] ?? "secondary";
}

function statusLabel(status: ProposalStatus) {
  return t(`proposals.status.${status.toLowerCase()}`);
}

const statusOptions = computed(() => [
  { label: t("proposals.all"), value: undefined },
  { label: t("proposals.status.draft"), value: "DRAFT" },
  { label: t("proposals.status.sent"), value: "SENT" },
  { label: t("proposals.status.viewed"), value: "VIEWED" },
  { label: t("proposals.status.accepted"), value: "ACCEPTED" },
  { label: t("proposals.status.rejected"), value: "REJECTED" },
  { label: t("proposals.status.expired"), value: "EXPIRED" },
]);

function formatCurrency(amount: number, currency: string) {
  const numberLocale = locale.value === "es" ? "es-MX" : "en-US";
  return `$${amount.toLocaleString(numberLocale, { minimumFractionDigits: 2 })} ${currency}`;
}

function formatDate(d?: string | null) {
  return d ? dayjs(d).format("DD MMM YYYY") : "—";
}
</script>

<template>
  <div class="p-6 space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">
          {{ t("proposals.title") }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {{ t("proposals.subtitle") }}
        </p>
      </div>
      <Button
        :label="t('proposals.new')"
        icon="pi pi-plus"
        @click="router.push('/proposals/new')"
      />
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3">
      <Select
        v-model="statusFilter"
        :options="statusOptions"
        optionLabel="label"
        optionValue="value"
        :placeholder="t('proposals.statusPlaceholder')"
        class="w-44"
      />
      <DatePicker
        v-model="dateRange"
        selectionMode="range"
        :placeholder="t('proposals.dateRangePlaceholder')"
        showIcon
        class="w-72"
        dateFormat="dd/mm/yy"
      />
    </div>

    <DataTable
      :value="proposals"
      :loading="isLoading"
      stripedRows
      paginator
      :rows="20"
      :rowsPerPageOptions="[10, 20, 50]"
      tableStyle="min-width: 60rem"
    >
      <Column
        field="number"
        :header="t('proposals.number')"
        style="width: 140px"
      >
        <template #body="{ data }">
          <span
            class="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400"
            >{{ data.number }}</span
          >
        </template>
      </Column>
      <Column field="clientName" :header="t('proposals.client')" />
      <Column field="title" :header="t('proposals.titleCol')" />
      <Column
        field="status"
        :header="t('proposals.status')"
        style="width: 120px"
      >
        <template #body="{ data }">
          <Tag
            :severity="statusSeverity(data.status)"
            :value="statusLabel(data.status)"
          />
        </template>
      </Column>
      <Column field="total" :header="t('proposals.total')" style="width: 160px">
        <template #body="{ data }">
          <span class="font-semibold">{{
            formatCurrency(data.total, data.currency)
          }}</span>
        </template>
      </Column>
      <Column
        field="validityDate"
        :header="t('proposals.validUntil')"
        style="width: 130px"
      >
        <template #body="{ data }">{{
          formatDate(data.validityDate)
        }}</template>
      </Column>
      <Column
        field="createdAt"
        :header="t('proposals.createdAt')"
        style="width: 120px"
      >
        <template #body="{ data }">{{ formatDate(data.createdAt) }}</template>
      </Column>
      <Column :header="t('common.actions')" style="width: 150px">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button
              icon="pi pi-eye"
              size="small"
              text
              @click="router.push(`/proposals/${data.id}`)"
              :tooltip="t('common.view')"
            />
            <Button
              v-if="data.status === 'DRAFT'"
              icon="pi pi-pencil"
              size="small"
              text
              severity="secondary"
              @click="router.push(`/proposals/${data.id}/edit`)"
              :tooltip="t('common.edit')"
            />
            <Button
              v-if="data.status === 'DRAFT'"
              icon="pi pi-trash"
              size="small"
              text
              severity="danger"
              @click="confirmDelete(data.id)"
              :tooltip="t('common.delete')"
            />
          </div>
        </template>
      </Column>
      <template #empty>
        <div class="text-center py-12 text-gray-500">
          <i class="pi pi-file-edit text-4xl mb-3 block opacity-40" />
          <p>{{ t("proposals.empty") }}</p>
        </div>
      </template>
    </DataTable>
  </div>
</template>
