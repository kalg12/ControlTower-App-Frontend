<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { useI18n } from "vue-i18n";
import { useConfirm } from "primevue/useconfirm";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Tag from "primevue/tag";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import Dialog from "primevue/dialog";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";
import { integrationsService } from "@/services/integrations.service";
import { healthService } from "@/services/health.service";
import { clientsService } from "@/services/clients.service";
import { useToast } from "@/composables/useToast";
import { useAuthStore } from "@/stores/auth";
import type {
  Integration,
  IntegrationCreateResponse,
} from "@/types/integration";
import type { HealthCheck, HealthIncident } from "@/types/health";

dayjs.extend(relativeTime);
dayjs.locale("es");

const { t } = useI18n();
const qc = useQueryClient();
const toast = useToast();
const confirm = useConfirm();
const auth = useAuthStore();

const activeTab = ref("endpoints");
const ctBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080"
).replace(/\/api\/v1$/, "");

// ── Data queries ─────────────────────────────────────────────────────────────

const { data: endpointsPage, isLoading: loadingEndpoints } = useQuery({
  queryKey: ["pos-endpoints"],
  queryFn: () => integrationsService.list(0, 100, "POS"),
  staleTime: 30_000,
});
const endpoints = computed(() => endpointsPage.value?.content ?? []);

const { data: healthChecks } = useQuery({
  queryKey: ["pos-health-checks"],
  queryFn: () => healthService.getClients(),
  staleTime: 15_000,
  refetchInterval: 30_000,
});

const { data: incidentsPage, isLoading: loadingIncidents } = useQuery({
  queryKey: ["pos-incidents"],
  queryFn: () => healthService.getIncidentLog({ page: 0, size: 50 }),
  staleTime: 30_000,
});
const incidents = computed(() => incidentsPage.value?.content ?? []);

const { data: clientsPage } = useQuery({
  queryKey: ["pos-clients"],
  queryFn: () => clientsService.list({ page: 0, size: 200 } as any),
  staleTime: 60_000,
});
const allClients = computed(() => clientsPage.value?.content ?? []);

// ── Health join ───────────────────────────────────────────────────────────────

function healthForEndpoint(ep: Integration): HealthCheck | undefined {
  return healthChecks.value?.find((h) => h.branchId === ep.clientBranchId);
}

// ── Summary cards ─────────────────────────────────────────────────────────────

const totalCount = computed(() => endpoints.value.length);
const activeCount = computed(
  () => endpoints.value.filter((e) => e.active).length,
);
const incidentCount = computed(
  () =>
    endpoints.value.filter(
      (e) => (healthForEndpoint(e)?.openIncidents ?? 0) > 0,
    ).length,
);
const noDataCount = computed(
  () => endpoints.value.filter((e) => !healthForEndpoint(e)).length,
);

// ── Status helpers ─────────────────────────────────────────────────────────────

function statusSeverity(ep: Integration) {
  if (!ep.active) return "secondary";
  const h = healthForEndpoint(ep);
  if (!h) return "secondary";
  if (h.status === "UP" || h.status === "HEALTHY") return "success";
  if (h.status === "DEGRADED") return "warn";
  if (h.status === "DOWN") return "danger";
  return "secondary";
}

function statusLabel(ep: Integration) {
  if (!ep.active) return t("pos.inactive");
  const h = healthForEndpoint(ep);
  if (!h) return t("pos.noData");
  if (h.status === "UP" || h.status === "HEALTHY") return t("pos.active");
  if (h.status === "DEGRADED") return t("pos.degraded");
  if (h.status === "DOWN") return t("pos.down");
  return h.status;
}

function lastContact(ep: Integration) {
  const h = healthForEndpoint(ep);
  if (!h?.lastCheckedAt) return t("common.none");
  return dayjs(h.lastCheckedAt).fromNow();
}

function intervalLabel(secs: number) {
  if (secs < 60) return t("pos.everySeconds", { s: secs });
  return t("pos.everyMinutes", { m: Math.round(secs / 60) });
}

function incidentSeverity(s: string) {
  return s === "CRITICAL" ? "danger" : s === "HIGH" ? "warn" : "secondary";
}

function formatDate(d?: string | null) {
  return d ? dayjs(d).format("DD/MM/YYYY HH:mm") : t("common.none");
}

function normalizeHealthUrl(url: string): string {
  if (!url) return url;
  const trimmed = url.trim().replace(/\/$/, "");
  if (/\/health(\/check)?$/i.test(trimmed)) return trimmed;
  return trimmed + "/health";
}

// ── Copy helper ───────────────────────────────────────────────────────────────

const copiedKey = ref<string | null>(null);
async function copy(text: string, key: string) {
  try {
    await navigator.clipboard.writeText(text);
    copiedKey.value = key;
    setTimeout(() => {
      copiedKey.value = null;
    }, 2000);
  } catch {
    /* ignore */
  }
}

// ── Register ──────────────────────────────────────────────────────────────────

const showRegister = ref(false);
const regClientId = ref<string | null>(null);
const regBranchId = ref<string | null>(null);
const regName = ref("");
const regUrl = ref("");
const regUrlPreview = computed(() =>
  regUrl.value ? normalizeHealthUrl(regUrl.value) : "",
);
const regInterval = ref(300);
const regLoading = ref(false);

const { data: regBranchesData } = useQuery({
  queryKey: computed(() => ["pos-reg-branches", regClientId.value]),
  queryFn: () => clientsService.getBranches(regClientId.value!),
  enabled: computed(() => !!regClientId.value),
});
const regBranches = computed(() => regBranchesData.value ?? []);

watch(regClientId, () => {
  regBranchId.value = null;
});

function openRegister() {
  regClientId.value = null;
  regBranchId.value = null;
  regName.value = "";
  regUrl.value = "";
  regInterval.value = 300;
  showRegister.value = true;
}

async function submitRegister() {
  if (!regBranchId.value) {
    toast.error(t("pos.selectBranchRequired"));
    return;
  }
  if (!regUrl.value) {
    toast.error(t("pos.enterUrlRequired"));
    return;
  }
  regLoading.value = true;
  try {
    const result = await integrationsService.create({
      clientBranchId: regBranchId.value,
      name: regName.value || undefined,
      type: "POS",
      pullUrl: normalizeHealthUrl(regUrl.value),
      heartbeatIntervalSeconds: regInterval.value,
    });
    qc.invalidateQueries({ queryKey: ["pos-endpoints"] });
    showRegister.value = false;
    openSetupGuide(result, true);
  } catch {
    toast.error(t("pos.registerError"));
  } finally {
    regLoading.value = false;
  }
}

// ── Setup Guide ───────────────────────────────────────────────────────────────

const showGuide = ref(false);
const guideEndpoint = ref<Integration | null>(null);
const guideApiKey = ref<string | null>(null);
const guideIsNew = ref(false);
const guideIsRegen = ref(false);
const guideDialogHeader = computed(() => {
  if (guideIsNew.value) return t('posPage.guideRegistered');
  if (guideIsRegen.value) return t('posPage.guideRegenerated');
  return t('posPage.guideDefault');
});

function openSetupGuide(
  result: IntegrationCreateResponse | Integration,
  isNew = false,
  isRegen = false,
) {
  if ("endpoint" in result && "generatedApiKey" in result) {
    guideEndpoint.value = (result as IntegrationCreateResponse).endpoint;
    guideApiKey.value = (result as IntegrationCreateResponse).generatedApiKey;
  } else {
    guideEndpoint.value = result as Integration;
    guideApiKey.value = null;
  }
  guideIsNew.value = isNew;
  guideIsRegen.value = isRegen;
  showGuide.value = true;
}

const guideDotEnv = computed(() => {
  const ep = guideEndpoint.value;
  if (!ep) return "";
  const tenantId = auth.user?.tenantId ?? "<tu-tenant-id>";
  const widgetUrl = `${typeof window !== "undefined" ? window.location.origin : ctBaseUrl}/widget/chat`;
  return `# Control Tower — Variables de conexión
CT_BASE_URL=${ctBaseUrl}
CT_API_KEY=${guideApiKey.value ?? "<regenera la clave desde Editar>"}
CT_ENDPOINT_ID=${ep.id}
CT_BRANCH_SLUG=${ep.branchSlug ?? "<slug-sucursal>"}

# Control Tower — Live Chat (widget)
NEXT_PUBLIC_CT_BASE_URL=${ctBaseUrl}
NEXT_PUBLIC_CT_WIDGET_URL=${widgetUrl}
NEXT_PUBLIC_CT_TENANT_ID=${tenantId}`;
});

const guideHealthFormat = `{
  "status": "ok",
  "version": "1.0.0",
  "uptimeSeconds": 3600,
  "checks": {
    "database":     { "status": "up" },
    "memory":       { "status": "up", "usagePercent": 60 },
    "controlTower": { "status": "up" }
  }
}`;

const guideUrls = computed(() => {
  const ep = guideEndpoint.value;
  if (!ep) return "";
  return `# Heartbeat (POS → CT, opcional)
POST ${ctBaseUrl}/api/v1/health/heartbeat/${ep.branchSlug ?? "{branch-slug}"}

# Push de eventos (tickets, soporte)
POST ${ctBaseUrl}/api/v1/integrations/events
Header: X-Api-Key: {CT_API_KEY}

# Consultar estado de ticket
GET  ${ctBaseUrl}/api/v1/integrations/${ep.id}/pos-tickets/{ticketId}/status
Header: X-Api-Key: {CT_API_KEY}`;
});

// ── Check now ─────────────────────────────────────────────────────────────────

const checkingId = ref<string | null>(null);

async function checkNow(ep: Integration) {
  checkingId.value = ep.id;
  try {
    await integrationsService.checkNow(ep.id);
    await qc.invalidateQueries({ queryKey: ["pos-health-checks"] });
    toast.success(t("pos.healthCheckLaunched"));
  } catch {
    toast.error(t("pos.healthCheckError"));
  } finally {
    checkingId.value = null;
  }
}

// ── Toggle active ─────────────────────────────────────────────────────────────

const toggleMut = useMutation({
  mutationFn: async (ep: Integration): Promise<Integration | void> =>
    ep.active
      ? await integrationsService.deactivate(ep.id)
      : await integrationsService.activate(ep.id),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["pos-endpoints"] }),
    onError: () => toast.error(t('posPage.statusError')),
});

function confirmToggle(ep: Integration) {
  confirm.require({
    message: ep.active
      ? t('posPage.pauseConfirm', { name: ep.name ?? ep.pullUrl })
      : t('posPage.reactivateConfirm', { name: ep.name ?? ep.pullUrl }),
    header: ep.active ? t('posPage.pauseTitle') : t('posPage.reactivateTitle'),
    icon: ep.active ? "pi pi-pause" : "pi pi-play",
    accept: () => toggleMut.mutate(ep),
  });
}

// ── Delete ────────────────────────────────────────────────────────────────────

const deleteMut = useMutation({
  mutationFn: (id: string) => integrationsService.delete(id),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["pos-endpoints"] });
    toast.success(t('posPage.deleted'));
  },
    onError: () => toast.error(t('posPage.deleteError')),
});

function confirmDelete(ep: Integration) {
  confirm.require({
    message: t("pos.deleteConfirm", { name: ep.name ?? ep.pullUrl }),
    header: t("pos.deleteHeader"),
    icon: "pi pi-exclamation-triangle",
    acceptClass: "p-button-danger",
    accept: () => deleteMut.mutate(ep.id),
  });
}

// ── Edit ──────────────────────────────────────────────────────────────────────

const showEdit = ref(false);
const editId = ref<string | null>(null);
const editName = ref("");
const editUrl = ref("");
const editUrlPreview = computed(() =>
  editUrl.value ? normalizeHealthUrl(editUrl.value) : "",
);
const editInterval = ref(300);
const currentEditEndpoint = ref<Integration | null>(null);
const editLoading = ref(false);
const regenLoading = ref(false);

function openEdit(ep: Integration) {
  editId.value = ep.id;
  currentEditEndpoint.value = ep;
  editName.value = ep.name ?? "";
  editUrl.value = ep.pullUrl ?? "";
  editInterval.value = ep.heartbeatIntervalSeconds;
  showEdit.value = true;
}

async function submitEdit() {
  if (!editId.value) return;
  editLoading.value = true;
  try {
    await integrationsService.update(editId.value, {
      name: editName.value || undefined,
      pullUrl: editUrl.value ? normalizeHealthUrl(editUrl.value) : undefined,
      heartbeatIntervalSeconds: editInterval.value,
    });
    qc.invalidateQueries({ queryKey: ["pos-endpoints"] });
    showEdit.value = false;
    toast.success(t("pos.updated"));
  } catch {
    toast.error(t("pos.saveError"));
  } finally {
    editLoading.value = false;
  }
}

async function regenerateKey() {
  if (!editId.value || !currentEditEndpoint.value) return;
  regenLoading.value = true;
  try {
    const newKey = await integrationsService.regenerateApiKey(editId.value);
    showEdit.value = false;
    openSetupGuide(
      { endpoint: currentEditEndpoint.value, generatedApiKey: newKey },
      false,
      true,
    );
  } catch {
    toast.error(t("pos.regenerateError"));
  } finally {
    regenLoading.value = false;
  }
}

// ── Resolve incident ──────────────────────────────────────────────────────────

const resolvingId = ref<string | null>(null);

async function resolveIncident(inc: HealthIncident) {
  if (!inc.id) return;
  resolvingId.value = inc.id;
  try {
    await healthService.resolveIncident(inc.id);
    qc.invalidateQueries({ queryKey: ["pos-incidents"] });
    toast.success(t("pos.incidentResolved"));
  } catch {
    toast.error(t("pos.resolveError"));
  } finally {
    resolvingId.value = null;
  }
}
</script>

<template>
  <div class="space-y-4 p-4">
    <!-- Header -->
    <div class="flex items-start justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-xl font-bold text-[var(--text)]">{{ $t('posPage.title') }}</h1>
        <p class="text-sm text-[var(--text-muted)]">
          {{ $t('posPage.subtitle') }}
        </p>
      </div>
      <Button :label="$t('posPage.register')" icon="pi pi-plus" @click="openRegister" />
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div
        class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center"
      >
        <p
          class="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1"
        >
          {{ $t('posPage.total') }}
        </p>
        <p class="text-2xl font-bold text-[var(--text)]">{{ totalCount }}</p>
      </div>
      <div
        class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center"
      >
        <p class="text-xs text-green-600 uppercase tracking-wide mb-1">
          {{ $t('posPage.active') }}
        </p>
        <p class="text-2xl font-bold text-green-600">{{ activeCount }}</p>
      </div>
      <div
        class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center"
      >
        <p class="text-xs text-amber-600 uppercase tracking-wide mb-1">
          {{ $t('posPage.withIncident') }}
        </p>
        <p class="text-2xl font-bold text-amber-600">{{ incidentCount }}</p>
      </div>
      <div
        class="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center"
      >
        <p
          class="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1"
        >
          {{ $t('posPage.noData') }}
        </p>
        <p class="text-2xl font-bold text-[var(--text-muted)]">
          {{ noDataCount }}
        </p>
      </div>
    </div>

    <!-- Tabs -->
    <Tabs v-model:value="activeTab">
      <TabList>
        <Tab value="endpoints">{{ $t('posPage.myPos') }}</Tab>
        <Tab value="incidents">{{ $t('posPage.incidents') }}</Tab>
      </TabList>
      <TabPanels class="mt-3">
        <!-- ── Mis POS ──────────────────────────────────────────── -->
        <TabPanel value="endpoints">
          <DataTable :value="endpoints" :loading="loadingEndpoints" stripedRows>
            <template #empty>
              <div class="text-center py-10 text-[var(--text-muted)]">
                <i class="pi pi-shop text-3xl mb-2 block opacity-30" />
                <p class="text-sm">{{ $t('posPage.noEndpoints') }}</p>
                <Button
                  :label="$t('posPage.register')"
                  icon="pi pi-plus"
                  class="mt-3"
                  size="small"
                  @click="openRegister"
                />
              </div>
            </template>

            <Column :header="$t('posPage.posClient')" style="min-width: 200px">
              <template #body="{ data: ep }: { data: Integration }">
                <div class="font-medium text-sm text-[var(--text)]">
                  {{ ep.name ?? "—" }}
                </div>
                <div class="text-xs text-[var(--text-muted)]">
                  {{ ep.branchName ?? ep.clientBranchId }}
                </div>
              </template>
            </Column>

            <Column :header="$t('posPage.healthUrl')" style="min-width: 220px">
              <template #body="{ data: ep }: { data: Integration }">
                <div v-if="ep.pullUrl" class="flex items-center gap-1">
                  <span
                    class="text-xs font-mono text-[var(--text-muted)] truncate max-w-[170px]"
                    :title="ep.pullUrl"
                    >{{ ep.pullUrl }}</span
                  >
                  <button
                    class="p-0.5 rounded hover:bg-[var(--border)]"
                    @click="copy(ep.pullUrl!, 'url-' + ep.id)"
                  >
                    <i
                      :class="
                        copiedKey === 'url-' + ep.id
                          ? 'pi pi-check text-green-500'
                          : 'pi pi-copy text-[var(--text-muted)]'
                      "
                      class="text-xs"
                    />
                  </button>
                </div>
                <span v-else class="text-xs text-[var(--text-muted)] italic"
                  >{{ $t('posPage.noUrl') }}</span
                >
              </template>
            </Column>

            <Column :header="$t('posPage.status')" style="width: 120px">
              <template #body="{ data: ep }: { data: Integration }">
                <Tag :severity="statusSeverity(ep)" :value="statusLabel(ep)" />
              </template>
            </Column>

            <Column :header="$t('posPage.lastContact')" style="width: 140px">
              <template #body="{ data: ep }: { data: Integration }">
                <span class="text-xs text-[var(--text-muted)]">{{
                  lastContact(ep)
                }}</span>
              </template>
            </Column>

            <Column :header="$t('posPage.frequencyColumn')" style="width: 110px">
              <template #body="{ data: ep }: { data: Integration }">
                <span class="text-xs text-[var(--text-muted)]">{{
                  intervalLabel(ep.heartbeatIntervalSeconds)
                }}</span>
              </template>
            </Column>

            <Column :header="$t('posPage.actions')" style="width: 180px">
              <template #body="{ data: ep }: { data: Integration }">
                <div class="flex items-center gap-1">
                  <Button
                    icon="pi pi-refresh"
                    text
                    rounded
                    size="small"
                    severity="info"
                    :loading="checkingId === ep.id"
                    v-tooltip.top="$t('posPage.checkNow')"
                    @click="checkNow(ep)"
                  />
                  <Button
                    icon="pi pi-book"
                    text
                    rounded
                    size="small"
                    severity="secondary"
                    v-tooltip.top="$t('posPage.connectionGuide')"
                    @click="openSetupGuide(ep, false)"
                  />
                  <Button
                    icon="pi pi-pencil"
                    text
                    rounded
                    size="small"
                    severity="secondary"
                    v-tooltip.top="$t('posPage.edit')"
                    @click="openEdit(ep)"
                  />
                  <Button
                    :icon="ep.active ? 'pi pi-pause' : 'pi pi-play'"
                    text
                    rounded
                    size="small"
                    :severity="ep.active ? 'warn' : 'success'"
                    v-tooltip.top="ep.active ? $t('posPage.pause') : $t('posPage.reactivate')"
                    @click="confirmToggle(ep)"
                  />
                  <Button
                    icon="pi pi-trash"
                    text
                    rounded
                    size="small"
                    severity="danger"
                    v-tooltip.top="$t('posPage.delete')"
                    @click="confirmDelete(ep)"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </TabPanel>

        <!-- ── Incidentes ───────────────────────────────────────── -->
        <TabPanel value="incidents">
          <DataTable :value="incidents" :loading="loadingIncidents" stripedRows>
            <template #empty>
              <div class="text-center py-10 text-[var(--text-muted)] text-sm">
                {{ $t('posPage.noIncidents') }}
              </div>
            </template>
            <Column field="branchName" :header="$t('posPage.branch')" />
            <Column field="severity" :header="$t('posPage.severity')" style="width: 110px">
              <template #body="{ data: inc }: { data: HealthIncident }">
                <Tag
                  :severity="incidentSeverity(inc.severity)"
                  :value="inc.severity"
                />
              </template>
            </Column>
            <Column field="description" :header="$t('posPage.description')" />
            <Column :header="$t('posPage.started')" style="width: 150px">
              <template #body="{ data: inc }: { data: HealthIncident }">
                {{ formatDate(inc.openedAt) }}
              </template>
            </Column>
            <Column :header="$t('posPage.status')" style="width: 110px">
              <template #body="{ data: inc }: { data: HealthIncident }">
                <Tag
                  :severity="inc.open ? 'danger' : 'success'"
                  :value="inc.open ? $t('posPage.open') : $t('posPage.resolved')"
                />
              </template>
            </Column>
            <Column header="" style="width: 110px">
              <template #body="{ data: inc }: { data: HealthIncident }">
                <Button
                  v-if="inc.open && inc.id"
                  :label="$t('posPage.resolve')"
                  size="small"
                  severity="secondary"
                  outlined
                  :loading="resolvingId === inc.id"
                  @click="resolveIncident(inc)"
                />
              </template>
            </Column>
          </DataTable>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>

  <!-- ── Register Dialog ────────────────────────────────────────────── -->
  <Dialog
    v-model:visible="showRegister"
    :header="$t('posPage.registerDialogTitle')"
    modal
    :style="{ width: '480px' }"
  >
    <div class="flex flex-col gap-4 pt-2">
      <div
        class="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3 text-xs text-blue-700 dark:text-blue-300"
      >
        {{ $t('posPage.apiKeyAutoGenerate') }}
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--text)]"
          >{{ $t('posPage.clientRequired') }} <span class="text-red-500">*</span></label
        >
        <Select
          v-model="regClientId"
          :options="allClients"
          option-label="name"
          option-value="id"
          :placeholder="t('pos.selectClient')"
          class="w-full"
          filter
          show-clear
        />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--text)]"
          >{{ $t('posPage.branchRequired') }} <span class="text-red-500">*</span></label
        >
        <Select
          v-model="regBranchId"
          :options="regBranches"
          option-label="name"
          option-value="id"
          :placeholder="t('pos.selectBranch')"
          class="w-full"
          :disabled="!regClientId"
          show-clear
        />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--text)]"
          >{{ $t('posPage.posName') }}</label
        >
        <InputText
          v-model="regName"
          :placeholder="t('pos.posNamePlaceholder')"
          class="w-full"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--text)]"
          >{{ $t('posPage.urlRequired') }}
          <span class="text-red-500">*</span></label
        >
        <InputText
          v-model="regUrl"
          :placeholder="t('pos.posUrlPlaceholder')"
          class="w-full"
        />
        <p
          v-if="regUrlPreview && regUrlPreview !== regUrl.trim()"
          class="text-xs text-blue-600 dark:text-blue-400"
        >
          → {{ $t('posPage.urlPreviewPrefix') }} <code class="font-mono">{{ regUrlPreview }}</code>
        </p>
        <p class="text-xs text-[var(--text-muted)]">
          {{ $t('posPage.urlHint') }}
        </p>
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--text)]"
          >{{ $t('posPage.frequency') }}</label
        >
        <InputNumber
          v-model="regInterval"
          :min="30"
          :max="86400"
          class="w-full"
        />
        <p class="text-xs text-[var(--text-muted)]">
          {{ $t('posPage.frequencyHint') }}
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          :label="$t('posPage.cancel')"
          severity="secondary"
          outlined
          :disabled="regLoading"
          @click="showRegister = false"
        />
        <Button
          :label="$t('posPage.registerBtn')"
          icon="pi pi-check"
          :loading="regLoading"
          @click="submitRegister"
        />
      </div>
    </template>
  </Dialog>

  <!-- ── Setup Guide Dialog ─────────────────────────────────────────── -->
  <Dialog
    v-model:visible="showGuide"
    :header="guideDialogHeader"
    modal
    :style="{ width: '620px' }"
  >
    <div class="flex flex-col gap-5 pt-2">
      <!-- API Key (only on new registration) -->
      <div
        v-if="guideApiKey"
        class="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-2"
      >
        <p class="text-sm font-semibold text-amber-800 dark:text-amber-300">
          <i class="pi pi-exclamation-triangle mr-1" />
          {{ t("pos.apiKeyWarning") }}
        </p>
        <div
          class="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-[var(--border)] rounded px-3 py-2"
        >
          <code class="flex-1 text-xs font-mono break-all text-[var(--text)]">{{
            guideApiKey
          }}</code>
          <button
            class="shrink-0 p-1 rounded hover:bg-[var(--border)]"
            @click="copy(guideApiKey!, 'apikey')"
          >
            <i
              :class="
                copiedKey === 'apikey'
                  ? 'pi pi-check text-green-500'
                  : 'pi pi-copy text-[var(--text-muted)]'
              "
            />
          </button>
        </div>
      </div>
      <div
        v-else
        class="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--text-muted)]"
      >
        <i class="pi pi-info-circle mr-1" />
        {{ t("pos.apiKeyLost") }}
      </div>

      <!-- .env block -->
      <div class="space-y-1">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-[var(--text)]">
            {{ t("pos.envFile") }}
          </p>
          <button
            class="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
            @click="copy(guideDotEnv, 'dotenv')"
          >
            <i
              :class="
                copiedKey === 'dotenv'
                  ? 'pi pi-check text-green-500'
                  : 'pi pi-copy'
              "
              class="text-xs"
            />
            {{ copiedKey === "dotenv" ? t("pos.copied") : t("pos.copyEnv") }}
          </button>
        </div>
        <pre
          class="text-xs font-mono bg-zinc-900 text-green-300 rounded-lg p-4 overflow-x-auto whitespace-pre"
          >{{ guideDotEnv }}</pre
        >
      </div>

      <!-- Expected /health format -->
      <div class="space-y-1">
        <p class="text-sm font-semibold text-[var(--text)]">
          {{ t("pos.healthFormat") }}
        </p>
        <pre
          class="text-xs font-mono bg-zinc-900 text-blue-300 rounded-lg p-4 overflow-x-auto whitespace-pre"
          >{{ guideHealthFormat }}</pre
        >
        <p class="text-xs text-[var(--text-muted)]">
          {{ t("pos.healthStatusHint") }}
        </p>
      </div>

      <!-- URLs -->
      <div class="space-y-1">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-[var(--text)]">
            {{ t("pos.controlTowerUrls") }}
          </p>
          <button
            class="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
            @click="copy(guideUrls, 'urls')"
          >
            <i
              :class="
                copiedKey === 'urls'
                  ? 'pi pi-check text-green-500'
                  : 'pi pi-copy'
              "
              class="text-xs"
            />
            {{ copiedKey === "urls" ? t("pos.copied") : t("pos.copyUrls") }}
          </button>
        </div>
        <pre
          class="text-xs font-mono bg-zinc-900 text-yellow-300 rounded-lg p-4 overflow-x-auto whitespace-pre"
          >{{ guideUrls }}</pre
        >
      </div>
    </div>

    <template #footer>
      <Button
        :label="t('pos.understood')"
        icon="pi pi-check"
        @click="showGuide = false"
      />
    </template>
  </Dialog>

  <!-- ── Edit Dialog ────────────────────────────────────────────────── -->
  <Dialog
    v-model:visible="showEdit"
    :header="t('pos.editPos')"
    modal
    :style="{ width: '480px' }"
  >
    <div class="flex flex-col gap-4 pt-2">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--text)]">{{
          t("pos.posName")
        }}</label>
        <InputText
          v-model="editName"
          :placeholder="t('pos.posNamePlaceholder')"
          class="w-full"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--text)]">{{
          t("pos.posUrlRequired")
        }}</label>
        <InputText
          v-model="editUrl"
          :placeholder="t('pos.posUrlPlaceholder')"
          class="w-full"
        />
        <p
          v-if="editUrlPreview && editUrlPreview !== editUrl.trim()"
          class="text-xs text-blue-600 dark:text-blue-400"
        >
          → {{ t("pos.savedAs") }}
          <code class="font-mono">{{ editUrlPreview }}</code>
        </p>
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-[var(--text)]">{{
          t("pos.frequencySeconds")
        }}</label>
        <InputNumber
          v-model="editInterval"
          :min="30"
          :max="86400"
          class="w-full"
        />
      </div>

      <!-- Regenerar clave -->
      <div class="rounded-lg border border-[var(--border)] p-3 space-y-2">
        <p class="text-xs font-medium text-[var(--text-muted)]">
          {{ t("pos.regenerateKey") }}
        </p>
        <p class="text-xs text-[var(--text-muted)]">
          {{ t("pos.newApiKeyNote") }}
        </p>
        <Button
          :label="t('pos.generateNewKey')"
          icon="pi pi-refresh"
          severity="warn"
          outlined
          size="small"
          :loading="regenLoading"
          @click.prevent="regenerateKey"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          :label="t('common.cancel')"
          severity="secondary"
          outlined
          :disabled="editLoading"
          @click="showEdit = false"
        />
        <Button
          :label="t('common.save')"
          icon="pi pi-check"
          :loading="editLoading"
          @click="submitEdit"
        />
      </div>
    </template>
  </Dialog>
</template>
