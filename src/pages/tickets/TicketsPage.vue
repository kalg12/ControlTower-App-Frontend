<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { useRouter } from "vue-router";
import { useConfirm } from "primevue/useconfirm";
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { z } from "zod";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Tag from "primevue/tag";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import Select from "primevue/select";
import Button from "primevue/button";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";
import { Search, SlidersHorizontal, RefreshCw, AlertTriangle, AlertCircle, MessageSquare } from "lucide-vue-next";
import AppDialog from "@/components/ui/AppDialog.vue";
import FormField from "@/components/ui/FormField.vue";
import SkeletonTable from "@/components/ui/SkeletonTable.vue";
import PageInfoButton from "@/components/ui/PageInfoButton.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import Badge from "@/components/ui/Badge.vue";
import { ticketsService } from "@/services/tickets.service";
import { clientsService } from "@/services/clients.service";
import { useToast } from "@/composables/useToast";
import { useUsers } from "@/queries/users";
import dayjs from "dayjs";
import type {
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketSource,
} from "@/types/ticket";
import SourceBadge from "@/components/tickets/SourceBadge.vue";

const { t } = useI18n();
const router = useRouter();
const queryClient = useQueryClient();
const toast = useToast();
const confirm = useConfirm();

function confirmDeleteTicket(ticket: Ticket) {
  confirm.require({
    message: t("tickets.deleteConfirm", { title: ticket.title }),
    header: t("tickets.deleteHeader"),
    icon: "pi pi-exclamation-triangle",
    rejectProps: {
      label: t("common.cancel"),
      severity: "secondary",
      outlined: true,
    },
    acceptProps: { label: t("common.delete"), severity: "danger" },
    accept: async () => {
      try {
        await ticketsService.delete(ticket.id);
        await queryClient.invalidateQueries({ queryKey: ["tickets"] });
        toast.success(t("tickets.deleteSuccess"));
      } catch {
        toast.error(t("tickets.deleteFailed"));
      }
    },
  });
}

const page = ref(0);
/** Must stay in sync with DataTable paginator (rows per page). */
const pageSize = ref(20);
const statusFilter = ref<TicketStatus | null>(null);
const priorityFilter = ref<TicketPriority | null>(null);
const sourceFilter = ref<TicketSource | null>(null);
const globalFilter = ref("");

const { data: clientsData } = useQuery({
  queryKey: ["clients", "list"],
  queryFn: () => clientsService.list({ page: 0, size: 200 }),
  staleTime: 60000,
});
const clientOptions = computed(
  () =>
    clientsData.value?.content.map((c) => ({ label: c.name, value: c.id })) ??
    [],
);

const {
  data: result,
  isLoading,
  isError,
  isFetching,
  refetch,
} = useQuery({
  queryKey: computed(() => [
    "tickets",
    page.value,
    pageSize.value,
    statusFilter.value,
    priorityFilter.value,
    sourceFilter.value,
  ]),
  queryFn: () =>
    ticketsService.list({
      page: page.value,
      size: pageSize.value,
      status: statusFilter.value ?? undefined,
      priority: priorityFilter.value ?? undefined,
      source: sourceFilter.value ?? undefined,
    }),
  staleTime: 15000,
});

const ticketsPage = computed(() => result.value?.content ?? []);
const tickets = computed(() => {
  const q = globalFilter.value.trim().toLowerCase();
  if (!q) return ticketsPage.value;
  return ticketsPage.value.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q)),
  );
});
const totalRecords = computed(() => result.value?.totalElements ?? 0);

const trashPage = ref(0);
const { data: trashResult, isLoading: trashLoading } = useQuery({
  queryKey: computed(() => ["tickets-trash", trashPage.value]),
  queryFn: () => ticketsService.listTrash(trashPage.value, 50),
  staleTime: 30_000,
});
const trashTickets = computed(() => trashResult.value?.content ?? []);
const trashTotal = computed(() => trashResult.value?.totalElements ?? 0);

async function restoreTicket(ticket: Ticket) {
  try {
    await ticketsService.restore(ticket.id);
    await queryClient.invalidateQueries({ queryKey: ["tickets-trash"] });
    await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    toast.success(t("tickets.restoreSuccess"));
  } catch {
    toast.error(t("tickets.restoreFailed"));
  }
}

const statusOptionsFilter = computed(() => [
  { label: t("tickets.allStatus"), value: null as TicketStatus | null },
  { label: t("tickets.statusOpen"), value: "OPEN" as TicketStatus },
  {
    label: t("tickets.statusInProgress"),
    value: "IN_PROGRESS" as TicketStatus,
  },
  { label: t("tickets.statusWaiting"), value: "WAITING" as TicketStatus },
  { label: t("tickets.statusResolved"), value: "RESOLVED" as TicketStatus },
  { label: t("tickets.statusClosed"), value: "CLOSED" as TicketStatus },
]);

const priorityOptionsFilter = computed(() => [
  { label: t("tickets.allPriority"), value: null as TicketPriority | null },
  { label: t("tickets.priorityLow"), value: "LOW" as TicketPriority },
  { label: t("tickets.priorityMedium"), value: "MEDIUM" as TicketPriority },
  { label: t("tickets.priorityHigh"), value: "HIGH" as TicketPriority },
  { label: t("tickets.priorityCritical"), value: "CRITICAL" as TicketPriority },
]);

const sourceOptionsFilter = computed(() => [
  { label: t("tickets.allSources"), value: null as TicketSource | null },
  { label: t("tickets.sourcePos"), value: "POS" as TicketSource },
  { label: t("tickets.sourceManual"), value: "MANUAL" as TicketSource },
  {
    label: t("tickets.sourceHealthAlert"),
    value: "HEALTH_ALERT" as TicketSource,
  },
  { label: t("tickets.sourceWebhook"), value: "WEBHOOK" as TicketSource },
  { label: t("tickets.sourceEmail"), value: "EMAIL" as TicketSource },
]);

const formPriorityOptions = computed(() => [
  { label: t("tickets.priorityLow"), value: "LOW" as const },
  { label: t("tickets.priorityMedium"), value: "MEDIUM" as const },
  { label: t("tickets.priorityHigh"), value: "HIGH" as const },
  { label: t("tickets.priorityCritical"), value: "CRITICAL" as const },
]);

const formStatusOptions = computed(() => [
  { label: t("tickets.statusOpen"), value: "OPEN" as const },
  { label: t("tickets.statusInProgress"), value: "IN_PROGRESS" as const },
  { label: t("tickets.statusWaiting"), value: "WAITING" as const },
  { label: t("tickets.statusResolved"), value: "RESOLVED" as const },
  { label: t("tickets.statusClosed"), value: "CLOSED" as const },
]);

function statusSeverity(
  status: TicketStatus,
): "info" | "warn" | "success" | "danger" | "secondary" {
  const map: Record<
    TicketStatus,
    "info" | "warn" | "success" | "danger" | "secondary"
  > = {
    OPEN: "info",
    IN_PROGRESS: "warn",
    WAITING: "warn",
    RESOLVED: "success",
    CLOSED: "secondary",
  };
  return map[status] ?? "secondary";
}

function prioritySeverity(
  priority: TicketPriority,
): "info" | "warn" | "success" | "danger" | "secondary" {
  const map: Record<
    TicketPriority,
    "info" | "warn" | "success" | "danger" | "secondary"
  > = {
    LOW: "secondary",
    MEDIUM: "warn",
    HIGH: "danger",
    CRITICAL: "danger",
  };
  return map[priority] ?? "secondary";
}

function formatDate(dateStr: string) {
  return dayjs(dateStr).format("DD MMM YYYY");
}

/** Returns SLA chip info for display in the tickets list. */
function slaChip(
  ticket: Ticket,
): { label: string; cls: string; tooltip: string } | null {
  const dueAt = ticket.slaDueAt ?? ticket.slaDeadline;
  if (!dueAt) return null;

  const isDone = ticket.status === "RESOLVED" || ticket.status === "CLOSED";
  const dueMs = new Date(dueAt).getTime();
  const totalMs = dueMs - new Date(ticket.createdAt).getTime();

  // For resolved/closed tickets freeze time at updatedAt (= when status changed).
  // This stops the chip from "ticking" past resolution and avoids false overdue states.
  const refMs = isDone ? new Date(ticket.updatedAt).getTime() : Date.now();
  const elapsedMs = refMs - new Date(ticket.createdAt).getTime();
  const pct = Math.min(
    Math.round((elapsedMs / Math.max(totalMs, 1)) * 100),
    100,
  );

  if (isDone) {
    const metSla = refMs <= dueMs && !ticket.slaBreached;
    return {
      label: `${pct}%`,
      cls: metSla
        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
      tooltip: metSla
        ? `SLA cumplido (${pct}%)`
        : `SLA vencido al cerrar (${pct}%)`,
    };
  }

  // Active ticket: live countdown
  const overdue = refMs > dueMs || !!ticket.slaBreached;
  const remainMs = dueMs - refMs;
  const hoursLeft = Math.floor(Math.abs(remainMs) / 3_600_000);
  const minsLeft = Math.floor((Math.abs(remainMs) % 3_600_000) / 60_000);
  const timeLabel = overdue
    ? `Vencido hace ${hoursLeft}h ${minsLeft}m`
    : `Vence en ${hoursLeft}h ${minsLeft}m`;

  let cls =
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400";
  if (overdue)
    cls = "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  else if (pct >= 90)
    cls = "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
  else if (pct >= 75)
    cls =
      "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400";
  else if (pct >= 50)
    cls =
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400";

  return { label: `${pct}%`, cls, tooltip: timeLabel };
}

function onPage(event: { page: number; rows?: number }) {
  page.value = event.page;
  if (event.rows != null && event.rows !== pageSize.value) {
    pageSize.value = event.rows;
  }
}

function applyFilters() {
  page.value = 0;
  refetch();
}

let searchTimeout: ReturnType<typeof setTimeout>;
/** Backend list has no text search; filter the current page in the UI only. */
function onSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    page.value = 0;
  }, 400);
}

// ── Bulk actions ──────────────────────────────────────────────────────
const selectedTickets = ref<Ticket[]>([]);
const bulkAssigneeId = ref<string | null>(null);
const bulkStatus = ref<TicketStatus | null>(null);
const isBulkProcessing = ref(false);

const { data: usersPage } = useUsers(200);
const userOptions = computed(() => usersPage.value?.content ?? []);

async function bulkAssign() {
  if (!bulkAssigneeId.value || !selectedTickets.value.length) return;
  isBulkProcessing.value = true;
  try {
    await ticketsService.bulkAssign(
      selectedTickets.value.map((t) => t.id),
      bulkAssigneeId.value,
    );
    await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    toast.success(t('ticketsPage.ticketsAssigned', { count: selectedTickets.value.length }));
    selectedTickets.value = [];
    bulkAssigneeId.value = null;
  } catch {
    toast.error(t('ticketsPage.assignFailed'));
  } finally {
    isBulkProcessing.value = false;
  }
}

async function bulkChangeStatus() {
  if (!bulkStatus.value || !selectedTickets.value.length) return;
  isBulkProcessing.value = true;
  try {
    await ticketsService.bulkUpdateStatus(
      selectedTickets.value.map((t) => t.id),
      bulkStatus.value,
    );
    await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    toast.success(t('ticketsPage.ticketsUpdated', { count: selectedTickets.value.length }));
    selectedTickets.value = [];
    bulkStatus.value = null;
  } catch {
    toast.error(t('ticketsPage.updateFailed'));
  } finally {
    isBulkProcessing.value = false;
  }
}

function bulkDeleteConfirm() {
  if (!selectedTickets.value.length) return;
  confirm.require({
message: t('ticketsPage.bulkDeleteConfirm', { count: selectedTickets.value.length }),
        header: t('ticketsPage.bulkDeleteHeader'),
    icon: "pi pi-exclamation-triangle",
    rejectProps: {
      label: t("common.cancel"),
      severity: "secondary",
      outlined: true,
    },
    acceptProps: { label: t("common.delete"), severity: "danger" },
    accept: async () => {
      isBulkProcessing.value = true;
      try {
        await Promise.all(
          selectedTickets.value.map((t) => ticketsService.delete(t.id)),
        );
        await queryClient.invalidateQueries({ queryKey: ["tickets"] });
        toast.success(t('ticketsPage.bulkDeleteSuccess', { count: selectedTickets.value.length }));
        selectedTickets.value = [];
      } catch {
        toast.error(t('ticketsPage.deleteAllFailed'));
      } finally {
        isBulkProcessing.value = false;
      }
    },
  });
}

// --- CSV Export ---
const exporting = ref(false);
async function handleExport() {
  exporting.value = true;
  try {
    const blob = await ticketsService.exportCsv({
      status: statusFilter.value ?? undefined,
      priority: priorityFilter.value ?? undefined,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tickets-${dayjs().format("YYYY-MM-DD")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("tickets.exportSuccess"));
  } catch {
    toast.error(t("tickets.exportFailed"));
  } finally {
    exporting.value = false;
  }
}

// --- Create Ticket Modal ---
const showCreateDialog = ref(false);
const isSubmitting = ref(false);

const createSchema = z.object({
  title: z.string().min(3, t("tickets.titleMin")).max(200),
  description: z.string().min(10, t("tickets.descMin")),
  priority: z.string().min(1),
  clientId: z.string().optional(),
});

const createForm = useForm({
  validationSchema: toTypedSchema(createSchema),
  initialValues: {
    title: "",
    description: "",
    priority: "MEDIUM",
    clientId: "",
  },
});

const [titleValue, titleAttrs] = createForm.defineField("title");
const [descriptionValue, descriptionAttrs] =
  createForm.defineField("description");
const [priorityValue, priorityAttrs] = createForm.defineField("priority");
const [clientIdValue, clientIdAttrs] = createForm.defineField("clientId");

function openCreateDialog() {
  createForm.resetForm();
  showCreateDialog.value = true;
}

const onSubmit = createForm.handleSubmit(async (values) => {
  isSubmitting.value = true;
  try {
    await ticketsService.create({
      title: values.title,
      description: values.description,
      priority: values.priority as any,
      clientId: values.clientId || undefined,
    });
    await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    showCreateDialog.value = false;
    toast.success(t("tickets.createSuccess"));
  } catch {
    toast.error(t("tickets.createFailed"));
  } finally {
    isSubmitting.value = false;
  }
});

// --- Edit Ticket Modal ---
const showEditDialog = ref(false);
const editingTicket = ref<Ticket | null>(null);
const isEditSubmitting = ref(false);

const editSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"]),
});

const editForm = useForm({
  validationSchema: toTypedSchema(editSchema),
  initialValues: { status: "OPEN" as const },
});

const [editStatus, editStatusAttrs] = editForm.defineField("status");

function openEditDialog(ticket: Ticket) {
  editingTicket.value = ticket;
  editForm.setValues({
    status: ticket.status,
  });
  showEditDialog.value = true;
}

const onEditSubmit = editForm.handleSubmit(async (values) => {
  if (!editingTicket.value) return;
  isEditSubmitting.value = true;
  try {
    await ticketsService.updateStatus(editingTicket.value.id, values.status);
    await queryClient.invalidateQueries({ queryKey: ["tickets"] });
    showEditDialog.value = false;
    toast.success(t("tickets.updateSuccess"));
  } catch {
    toast.error(t("tickets.updateFailed"));
  } finally {
    isEditSubmitting.value = false;
  }
});
</script>

<template>
  <div class="tickets-page space-y-6">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <div>
          <h1 class="text-xl font-bold text-[var(--text)]">{{ t("tickets.title") }}</h1>
          <p class="text-sm text-[var(--text-muted)]">{{ totalRecords }} {{ t("tickets.totalCount") }}</p>
        </div>
        <PageInfoButton :title="t('tickets.title')" :description="t('pageInfo.tickets')" />
      </div>
      <div class="flex gap-2">
        <Button
          :label="t('tickets.exportCsv')"
          icon="pi pi-download"
          severity="secondary"
          outlined
          :loading="exporting"
          @click="handleExport"
        />
        <Button
          :label="t('tickets.newTicket')"
          icon="pi pi-plus"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <Tabs value="active">
      <TabList>
        <Tab value="active">{{ t("tickets.activeTab") }}</Tab>
        <Tab value="trash">
          {{ t("tickets.trashTab") }}
          <Badge v-if="trashTotal > 0" variant="default" pill class="ml-1.5">{{ trashTotal }}</Badge>
        </Tab>
      </TabList>

      <TabPanels class="px-0! pt-4!">
        <!-- Active tickets panel -->
        <TabPanel value="active" class="px-0!">
          <div class="space-y-4">
            <!-- Filters -->
            <div class="toolbar-row">
              <div class="search-wrapper">
                <Search class="search-icon" />
                <InputText
                  v-model="globalFilter"
                  :placeholder="t('tickets.searchPlaceholder')"
                  class="search-input"
                  @input="onSearch"
                />
              </div>
              <div class="filter-group">
                <Select
                  v-model="statusFilter"
                  :options="statusOptionsFilter"
                  option-label="label"
                  option-value="value"
                  :placeholder="t('tickets.allStatus')"
                  class="filter-select"
                  @change="applyFilters"
                />
                <Select
                  v-model="priorityFilter"
                  :options="priorityOptionsFilter"
                  option-label="label"
                  option-value="value"
                  :placeholder="t('tickets.allPriority')"
                  class="filter-select"
                  @change="applyFilters"
                />
                <Select
                  v-model="sourceFilter"
                  :options="sourceOptionsFilter"
                  option-label="label"
                  option-value="value"
                  :placeholder="t('tickets.allSources')"
                  class="filter-select"
                  @change="applyFilters"
                />
                <button
                  class="toolbar-icon-btn"
                  v-tooltip.top="t('common.clearFilters')"
                  @click="() => { statusFilter = null; priorityFilter = null; sourceFilter = null; globalFilter = ''; applyFilters() }"
                >
                  <SlidersHorizontal class="w-4 h-4" />
                </button>
                <button
                  class="toolbar-icon-btn"
                  v-tooltip.top="t('common.refresh')"
                  @click="refetch()"
                >
                  <RefreshCw class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- Error state -->
            <div
              v-if="isError"
              class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center justify-between"
            >
              <div class="flex items-center gap-2">
                <AlertCircle class="w-4 h-4" />
                <span>{{ t("tickets.loadFailed") }}</span>
              </div>
              <Button
                :label="t('common.retry')"
                size="small"
                severity="danger"
                text
                @click="refetch()"
              />
            </div>

            <!-- Skeleton on first load -->
            <SkeletonTable v-if="isLoading && !result" :rows="5" :cols="5" />

            <!-- Bulk actions toolbar -->
            <div
              v-if="selectedTickets.length > 0"
              class="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 flex-wrap shadow-sm"
            >
              <span class="text-sm font-semibold text-[var(--text)] shrink-0">{{ t('ticketsPage.selected', { count: selectedTickets.length }) }}</span>
              <div class="h-4 w-px bg-[var(--border)]" />
              <div class="flex items-center gap-2">
                <Select
                  v-model="bulkAssigneeId"
                  :options="userOptions"
                  option-label="fullName"
                  option-value="id"
                  :placeholder="t('tickets.assignTo')"
                  class="w-40"
                  :disabled="isBulkProcessing"
                />
                <Button
                  :label="t('tickets.assign')"
                  size="small"
                  :loading="isBulkProcessing"
                  :disabled="!bulkAssigneeId"
                  @click="bulkAssign"
                />
              </div>
              <div class="flex items-center gap-2">
                <Select
                  v-model="bulkStatus"
                  :options="formStatusOptions"
                  option-label="label"
                  option-value="value"
                  :placeholder="t('tickets.changeStatus')"
                  class="w-44"
                  :disabled="isBulkProcessing"
                />
                <Button
                  :label="t('common.apply')"
                  size="small"
                  severity="secondary"
                  :loading="isBulkProcessing"
                  :disabled="!bulkStatus"
                  @click="bulkChangeStatus"
                />
              </div>
              <div class="ml-auto flex items-center gap-1">
                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  outlined
                  size="small"
                  :loading="isBulkProcessing"
                  :v-tooltip.top="t('ticketsPage.deleteSelected')"
                  @click="bulkDeleteConfirm"
                />
                <Button
                  icon="pi pi-times"
                  severity="secondary"
                  text
                  size="small"
                  @click="selectedTickets = []"
                />
              </div>
            </div>

            <!-- DataTable -->
            <DataTable
              v-else
              v-model:selection="selectedTickets"
              lazy
              :first="page * pageSize"
              :value="tickets"
              :loading="isFetching"
              :rows="pageSize"
              :total-records="totalRecords"
              paginator
              :paginator-template="'PrevPageLink PageLinks NextPageLink RowsPerPageDropdown'"
              :rows-per-page-options="[10, 20, 50]"
              removable-sort
              striped-rows
              class="rounded-[var(--radius-lg)] overflow-hidden"
              @page="onPage"
            >
              <Column selection-mode="multiple" style="width: 3rem" />
              <Column
                field="title"
                :header="t('tickets.formTitle')"
                sortable
                style="min-width: 240px"
              >
                <template #body="{ data: row }: { data: Ticket }">
                  <button
                    class="font-medium text-[var(--text)] line-clamp-1 text-left hover:text-[var(--primary)] hover:underline cursor-pointer transition-colors"
                    @click="router.push('/tickets/' + row.id)"
                  >
                    {{ row.title }}
                  </button>
                </template>
              </Column>

              <Column
                field="status"
                :header="t('tickets.status')"
                style="width: 140px"
              >
                <template #body="{ data: row }: { data: Ticket }">
                  <Tag
                    :severity="statusSeverity(row.status)"
                    :value="row.status.replace('_', ' ')"
                  />
                </template>
              </Column>

              <Column
                field="priority"
                :header="t('tickets.priority')"
                style="width: 120px"
              >
                <template #body="{ data: row }: { data: Ticket }">
                  <div class="flex items-center gap-1.5">
                    <Tag
                      :severity="prioritySeverity(row.priority)"
                      :value="row.priority"
                    />
                    <span
                      v-if="(row as any).escalatedAt"
                      v-tooltip.top="t('ticketDetail.escalated')"
                      class="text-orange-500"
                    >
                      <AlertTriangle class="w-3.5 h-3.5" />
                    </span>
                  </div>
                </template>
              </Column>

              <Column header="SLA" style="width: 85px">
                <template #body="{ data: row }: { data: Ticket }">
                  <span
                    v-if="slaChip(row)"
                    v-tooltip.top="slaChip(row)!.tooltip"
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold cursor-default"
                    :class="slaChip(row)!.cls"
                  >
                    {{ slaChip(row)!.label }}
                  </span>
                  <span v-else class="text-[var(--text-muted)] text-xs">—</span>
                </template>
              </Column>

              <Column
                field="source"
                :header="t('tickets.source')"
                style="width: 130px"
              >
                <template #body="{ data: row }: { data: Ticket }">
                  <SourceBadge :source="row.source" />
                </template>
              </Column>

              <Column
                field="clientId"
                :header="t('tickets.client')"
                style="min-width: 140px"
              >
                <template #body="{ data: row }: { data: Ticket }">
                  <span class="text-[var(--text-muted)] text-sm">{{
                    row.clientName ?? row.clientId ?? "—"
                  }}</span>
                </template>
              </Column>

              <Column
                field="createdAt"
                :header="t('tickets.createdAt')"
                sortable
                style="width: 120px"
              >
                <template #body="{ data: row }: { data: Ticket }">
                  <span class="text-[var(--text-muted)] text-sm whitespace-nowrap">{{
                    formatDate(row.createdAt)
                  }}</span>
                </template>
              </Column>

              <Column :header="t('common.actions')" style="width: 130px">
                <template #body="{ data: row }: { data: Ticket }">
                  <div class="flex gap-1">
                    <Button
                      icon="pi pi-pencil"
                      severity="secondary"
                      text
                      rounded
                      v-tooltip.top="t('common.edit')"
                      @click="openEditDialog(row)"
                    />
                    <Button
                      icon="pi pi-eye"
                      severity="secondary"
                      text
                      rounded
                      v-tooltip.top="t('common.view')"
                      @click="router.push('/tickets/' + row.id)"
                    />
                    <Button
                      icon="pi pi-trash"
                      severity="danger"
                      text
                      rounded
                      v-tooltip.top="t('common.delete')"
                      @click="confirmDeleteTicket(row)"
                    />
                  </div>
                </template>
              </Column>

              <template #empty>
                <EmptyState
                  :title="t('common.noRows')"
                  :description="t('tickets.emptyDescription')"
                >
                  <template #icon>
                    <MessageSquare class="w-6 h-6 text-[var(--text-muted)]" />
                  </template>
                </EmptyState>
              </template>
            </DataTable>
          </div>
        </TabPanel>

        <!-- Trash panel -->
        <TabPanel value="trash" class="px-0!">
          <SkeletonTable
            v-if="trashLoading && !trashResult"
            :rows="5"
            :cols="3"
          />
          <DataTable
            v-else
            :value="trashTickets"
            :loading="trashLoading"
            :rows="50"
            :total-records="trashTotal"
            striped-rows
            class="rounded-[var(--radius-lg)] overflow-hidden"
          >
            <Column
              field="title"
              :header="t('tickets.formTitle')"
              style="min-width: 240px"
            >
              <template #body="{ data: row }: { data: Ticket }">
                <span class="font-medium text-[var(--text)] line-clamp-1">{{
                  row.title
                }}</span>
              </template>
            </Column>

            <Column
              field="priority"
              :header="t('tickets.priority')"
              style="width: 120px"
            >
              <template #body="{ data: row }: { data: Ticket }">
                <Tag
                  :severity="prioritySeverity(row.priority)"
                  :value="row.priority"
                />
              </template>
            </Column>

            <Column :header="t('tickets.deletedAt')" style="width: 150px">
              <template #body="{ data: row }: { data: Ticket }">
                <span class="text-[var(--text-muted)] text-sm">{{ row.deletedAt ? formatDate(row.deletedAt) : "—" }}</span>
              </template>
            </Column>

            <Column :header="t('common.actions')" style="width: 130px">
              <template #body="{ data: row }: { data: Ticket }">
                <Button
                  icon="pi pi-arrow-up-left"
                  :label="t('tickets.restore')"
                  severity="secondary"
                  outlined
                  size="small"
                  @click="restoreTicket(row)"
                />
              </template>
            </Column>

            <template #empty>
              <EmptyState
                :title="t('tickets.trashEmpty')"
                :description="t('ticketsPage.trashEmptyDescription')"
              >
                <template #icon>
                  <MessageSquare class="w-6 h-6 text-[var(--text-muted)]" />
                </template>
              </EmptyState>
            </template>
          </DataTable>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>

  <!-- Create Ticket Dialog -->
  <AppDialog
    v-model:visible="showCreateDialog"
    :title="t('tickets.createTitle')"
    :subtitle="t('tickets.createSubtitle')"
    :loading="isSubmitting"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
      <FormField
        :label="t('tickets.formTitle')"
        name="title"
        :error="createForm.errors.value.title"
        required
      >
        <InputText
          id="title"
          v-model="titleValue"
          v-bind="titleAttrs"
          :placeholder="t('tickets.formTitlePlaceholder')"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField
        :label="t('tickets.formDescription')"
        name="description"
        :error="createForm.errors.value.description"
        required
      >
        <Textarea
          id="description"
          v-model="descriptionValue"
          v-bind="descriptionAttrs"
          :placeholder="t('tickets.formDescriptionPlaceholder')"
          :rows="3"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField
        :label="t('tickets.priority')"
        name="priority"
        :error="createForm.errors.value.priority"
        required
      >
        <Select
          id="priority"
          v-model="priorityValue"
          v-bind="priorityAttrs"
          :options="formPriorityOptions"
          option-label="label"
          option-value="value"
          :placeholder="t('tickets.formPriorityPlaceholder')"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField
        :label="t('tickets.client')"
        name="clientId"
        :error="createForm.errors.value.clientId"
      >
        <Select
          id="clientId"
          v-model="clientIdValue"
          v-bind="clientIdAttrs"
          :options="clientOptions"
          option-label="label"
          option-value="value"
          :placeholder="t('tickets.formClientPlaceholder')"
          filter
          show-clear
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          :label="t('common.cancel')"
          severity="secondary"
          outlined
          :disabled="isSubmitting"
          @click="showCreateDialog = false"
        />
        <Button
          :label="t('tickets.newTicket')"
          :loading="isSubmitting"
          @click="onSubmit"
        />
      </div>
    </template>
  </AppDialog>

  <!-- Edit Ticket Dialog -->
  <AppDialog
    v-model:visible="showEditDialog"
    :title="t('tickets.editTitle')"
    :subtitle="t('tickets.editSubtitle')"
    :loading="isEditSubmitting"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onEditSubmit">
      <FormField
        :label="t('tickets.status')"
        name="edit-status"
        :error="editForm.errors.value.status"
        required
      >
        <Select
          id="edit-status"
          v-model="editStatus"
          v-bind="editStatusAttrs"
          :options="formStatusOptions"
          option-label="label"
          option-value="value"
          :placeholder="t('tickets.formStatusPlaceholder')"
          class="w-full"
          :disabled="isEditSubmitting"
        />
      </FormField>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          :label="t('common.cancel')"
          severity="secondary"
          outlined
          :disabled="isEditSubmitting"
          @click="showEditDialog = false"
        />
        <Button
          :label="t('tickets.saveChanges')"
          :loading="isEditSubmitting"
          @click="onEditSubmit"
        />
      </div>
    </template>
  </AppDialog>
</template>

<style scoped>
.toolbar-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.search-wrapper {
  position: relative;
  flex: 1 1 240px;
  min-width: 180px;
}

.search-wrapper .search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  color: var(--text-muted);
  pointer-events: none;
}

.search-wrapper :deep(.search-input) {
  width: 100%;
  height: 44px;
  padding-left: 2.5rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.875rem;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.search-wrapper :deep(.search-input:focus) {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-select {
  min-width: 140px;
  height: 44px;
}

.filter-select :deep(.p-select-label) {
  font-size: 0.875rem;
}

.toolbar-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast);
}

.toolbar-icon-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 8%, transparent);
}

.toolbar-icon-btn:active {
  background: color-mix(in srgb, var(--primary) 14%, transparent);
}
</style>

<style>
.tickets-page .p-tablist {
  border-bottom: 1px solid var(--border);
}

.tickets-page .p-tablist-tab-list {
  gap: 0;
}

.tickets-page .p-tab {
  padding: 0.75rem 1.25rem;
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--text-muted);
  border-bottom: 2px solid transparent;
  transition: color var(--transition-fast), border-color var(--transition-fast);
  cursor: pointer;
}

.tickets-page .p-tab:hover {
  color: var(--text);
}

.tickets-page .p-tab.p-tab-active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.tickets-page .p-tab:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
  border-radius: var(--radius);
}

/* Select dropdown (teleported) overrides */
.tickets-page .p-select {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--surface);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.tickets-page .p-select:not(.p-disabled):hover {
  border-color: var(--primary);
}

.tickets-page .p-select.p-focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent);
}

.tickets-page .p-select-overlay {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: var(--shadow-lg);
}

.tickets-page .p-select-overlay .p-select-option {
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  color: var(--text);
  transition: background var(--transition-fast);
}

.tickets-page .p-select-overlay .p-select-option:hover {
  background: var(--surface-raised);
}

.tickets-page .p-select-overlay .p-select-option.p-select-option-selected {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
}

/* DataTable styling */
.tickets-page .p-datatable-table-container {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  overflow: hidden;
}
</style>
