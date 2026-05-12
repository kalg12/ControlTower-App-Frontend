<script setup lang="ts">
import { ref, computed, unref } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
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
import AppDialog from "@/components/ui/AppDialog.vue";
import FormField from "@/components/ui/FormField.vue";
import SkeletonTable from "@/components/ui/SkeletonTable.vue";
import PageInfoButton from "@/components/ui/PageInfoButton.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import { AlertCircle, Building2, Search } from "lucide-vue-next";
import { clientsService } from "@/services/clients.service";
import { useToast } from "@/composables/useToast";
import dayjs from "dayjs";
import type { Client } from "@/types/client";

const router = useRouter();
const { t } = useI18n();
const queryClient = useQueryClient();
const toast = useToast();
const confirm = useConfirm();

function confirmDeleteClient(client: Client) {
  confirm.require({
    message: t("clientsPage.deleteConfirm", { name: client.name }),
    header: t("clientsPage.deleteHeader"),
    icon: "pi pi-exclamation-triangle",
    rejectProps: {
      label: t("common.cancel"),
      severity: "secondary",
      outlined: true,
    },
    acceptProps: { label: t("common.delete"), severity: "danger" },
    accept: async () => {
      try {
        await clientsService.delete(client.id);
        await queryClient.invalidateQueries({ queryKey: ["clients"] });
        toast.success(t("common.delete"));
      } catch {
        toast.error(t("errors.loadFailed"));
      }
    },
  });
}

const pageSize = 20;
const globalFilter = ref("");
const appliedFilter = ref("");

let searchTimeout: ReturnType<typeof setTimeout>;
function onSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    appliedFilter.value = globalFilter.value;
  }, 400);
}

/**
 * Same query as Tickets page dropdown: one fetch (page 0, size 200) so cache is shared
 * and the Clients view shows the same data you already see when picking a client elsewhere.
 */
const {
  data: result,
  isPending,
  isFetching,
  isError,
  error: queryError,
  refetch,
} = useQuery({
  queryKey: ["clients", "list"],
  queryFn: () => clientsService.list({ page: 0, size: 200 }),
  staleTime: 60000,
  placeholderData: undefined,
});

const allClients = computed(() => result.value?.content ?? []);

const filteredClients = computed(() => {
  const q = appliedFilter.value.trim().toLowerCase();
  if (!q) return allClients.value;
  return allClients.value.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      (c.legalName?.toLowerCase().includes(q) ?? false) ||
      (c.country?.toLowerCase().includes(q) ?? false) ||
      (c.taxId?.toLowerCase().includes(q) ?? false),
  );
});

const totalRecords = computed(() => filteredClients.value.length);

const queryErrorText = computed(() => {
  const e = unref(queryError);
  if (!e) return "";
  if (e instanceof Error) return e.message;
  return String(e);
});

function statusSeverity(
  status?: string,
): "success" | "warn" | "danger" | "secondary" {
  if (!status) return "secondary";
  if (status === "ACTIVE") return "success";
  if (status === "INACTIVE") return "secondary";
  if (status === "SUSPENDED") return "danger";
  return "secondary";
}

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return t("common.none");
  const d = dayjs(dateStr);
  return d.isValid() ? d.format("DD MMM YYYY") : t("common.none");
}

// --- Create Client Modal ---
const showCreateDialog = ref(false);
const isSubmitting = ref(false);

// Country options for searchable select - alphabetically sorted by Spanish name
const countryOptions = [
  { label: "Afganistán", value: "AF" },
  { label: "Albania", value: "AL" },
  { label: "Alemania", value: "DE" },
  { label: "Andorra", value: "AD" },
  { label: "Angola", value: "AO" },
  { label: "Antigua y Barbuda", value: "AG" },
  { label: "Arabia Saudita", value: "SA" },
  { label: "Argelia", value: "DZ" },
  { label: "Argentina", value: "AR" },
  { label: "Armenia", value: "AM" },
  { label: "Australia", value: "AU" },
  { label: "Austria", value: "AT" },
  { label: "Azerbaiyán", value: "AZ" },
  { label: "Bahamas", value: "BS" },
  { label: "Bangladés", value: "BD" },
  { label: "Barbados", value: "BB" },
  { label: "Baréin", value: "BH" },
  { label: "Bélgica", value: "BE" },
  { label: "Belice", value: "BZ" },
  { label: "Benín", value: "BJ" },
  { label: "Bielorrusia", value: "BY" },
  { label: "Bolivia", value: "BO" },
  { label: "Bosnia y Herzegovina", value: "BA" },
  { label: "Botsuana", value: "BW" },
  { label: "Brasil", value: "BR" },
  { label: "Brunéi", value: "BN" },
  { label: "Bulgaria", value: "BG" },
  { label: "Burkina Faso", value: "BF" },
  { label: "Burundi", value: "BI" },
  { label: "Cabo Verde", value: "CV" },
  { label: "Camboya", value: "KH" },
  { label: "Camerún", value: "CM" },
  { label: "Canadá", value: "CA" },
  { label: "Catar", value: "QA" },
  { label: "Chad", value: "TD" },
  { label: "Chile", value: "CL" },
  { label: "China", value: "CN" },
  { label: "Chipre", value: "CY" },
  { label: "Colombia", value: "CO" },
  { label: "Comoras", value: "KM" },
  { label: "Corea del Norte", value: "KP" },
  { label: "Corea del Sur", value: "KR" },
  { label: "Costa Rica", value: "CR" },
  { label: "Croacia", value: "HR" },
  { label: "Cuba", value: "CU" },
  { label: "Curazao", value: "CW" },
  { label: "Dinamarca", value: "DK" },
  { label: "Dominica", value: "DM" },
  { label: "Ecuador", value: "EC" },
  { label: "Egipto", value: "EG" },
  { label: "El Salvador", value: "SV" },
  { label: "Emiratos Árabes Unidos", value: "AE" },
  { label: "Eritrea", value: "ER" },
  { label: "Eslovaquia", value: "SK" },
  { label: "Eslovenia", value: "SI" },
  { label: "España", value: "ES" },
  { label: "Estados Unidos", value: "US" },
  { label: "Estonia", value: "EE" },
  { label: "Etiopía", value: "ET" },
  { label: "Fiyi", value: "FJ" },
  { label: "Filipinas", value: "PH" },
  { label: "Finlandia", value: "FI" },
  { label: "Francia", value: "FR" },
  { label: "Gabón", value: "GA" },
  { label: "Gambia", value: "GM" },
  { label: "Georgia", value: "GE" },
  { label: "Ghana", value: "GH" },
  { label: "Granada", value: "GD" },
  { label: "Grecia", value: "GR" },
  { label: "Guatemala", value: "GT" },
  { label: "Guinea", value: "GN" },
  { label: "Guinea-Bisáu", value: "GW" },
  { label: "Guinea Ecuatorial", value: "GQ" },
  { label: "Guyana", value: "GY" },
  { label: "Haití", value: "HT" },
  { label: "Honduras", value: "HN" },
  { label: "Hungría", value: "HU" },
  { label: "India", value: "IN" },
  { label: "Indonesia", value: "ID" },
  { label: "Irak", value: "IQ" },
  { label: "Irán", value: "IR" },
  { label: "Irlanda", value: "IE" },
  { label: "Islandia", value: "IS" },
  { label: "Islas Cook", value: "CK" },
  { label: "Islas Fiyi", value: "FJ" },
  { label: "Islas Marshall", value: "MH" },
  { label: "Islas Salomón", value: "SB" },
  { label: "Islas Samoa", value: "WS" },
  { label: "Israel", value: "IL" },
  { label: "Italia", value: "IT" },
  { label: "Jamaica", value: "JM" },
  { label: "Japón", value: "JP" },
  { label: "Jordania", value: "JO" },
  { label: "Kazajistán", value: "KZ" },
  { label: "Kenia", value: "KE" },
  { label: "Kirguistán", value: "KG" },
  { label: "Kiribati", value: "KI" },
  { label: "Kuwait", value: "KW" },
  { label: "Laos", value: "LA" },
  { label: "Lesoto", value: "LS" },
  { label: "Letonia", value: "LV" },
  { label: "Líbano", value: "LB" },
  { label: "Liberia", value: "LR" },
  { label: "Libia", value: "LY" },
  { label: "Liechtenstein", value: "LI" },
  { label: "Lituania", value: "LT" },
  { label: "Luxemburgo", value: "LU" },
  { label: "Macedonia del Norte", value: "MK" },
  { label: "Madagascar", value: "MG" },
  { label: "Malasia", value: "MY" },
  { label: "Malaui", value: "MW" },
  { label: "Maldivas", value: "MV" },
  { label: "Malí", value: "ML" },
  { label: "Malta", value: "MT" },
  { label: "Marruecos", value: "MA" },
  { label: "Mauricio", value: "MU" },
  { label: "Mauritania", value: "MR" },
  { label: "México", value: "MX" },
  { label: "Micronesia", value: "FM" },
  { label: "Moldavia", value: "MD" },
  { label: "Mónaco", value: "MC" },
  { label: "Mongolia", value: "MN" },
  { label: "Montenegro", value: "ME" },
  { label: "Mozambique", value: "MZ" },
  { label: "Myanmar", value: "MM" },
  { label: "Namibia", value: "NA" },
  { label: "Nauru", value: "NR" },
  { label: "Nepal", value: "NP" },
  { label: "Nicaragua", value: "NI" },
  { label: "Níger", value: "NE" },
  { label: "Nigeria", value: "NG" },
  { label: "Noruega", value: "NO" },
  { label: "Nueva Caledonia", value: "NC" },
  { label: "Nueva Zelanda", value: "NZ" },
  { label: "Omán", value: "OM" },
  { label: "Países Bajos", value: "NL" },
  { label: "Pakistán", value: "PK" },
  { label: "Palaos", value: "PW" },
  { label: "Panamá", value: "PA" },
  { label: "Papúa Nueva Guinea", value: "PG" },
  { label: "Paraguay", value: "PY" },
  { label: "Perú", value: "PE" },
  { label: "Polinesia Francesa", value: "PF" },
  { label: "Polonia", value: "PL" },
  { label: "Portugal", value: "PT" },
  { label: "Puerto Rico", value: "PR" },
  { label: "Reino Unido", value: "GB" },
  { label: "República Centroafricana", value: "CF" },
  { label: "República Checa", value: "CZ" },
  { label: "República del Congo", value: "CG" },
  { label: "República Democrática del Congo", value: "CD" },
  { label: "República Dominicana", value: "DO" },
  { label: "Rumania", value: "RO" },
  { label: "Rusia", value: "RU" },
  { label: "Ruanda", value: "RW" },
  { label: "Samoa", value: "WS" },
  { label: "San Cristóbal y Nieves", value: "KN" },
  { label: "San Marino", value: "SM" },
  { label: "San Vicente y las Granadinas", value: "VC" },
  { label: "Santa Lucía", value: "LC" },
  { label: "Santo Tomé y Príncipe", value: "ST" },
  { label: "Senegal", value: "SN" },
  { label: "Serbia", value: "RS" },
  { label: "Seychelles", value: "SC" },
  { label: "Sierra Leona", value: "SL" },
  { label: "Singapur", value: "SG" },
  { label: "Siria", value: "SY" },
  { label: "Somalia", value: "SO" },
  { label: "Sri Lanka", value: "LK" },
  { label: "Suazilandia", value: "SZ" },
  { label: "Sudáfrica", value: "ZA" },
  { label: "Sudán", value: "SD" },
  { label: "Sudán del Sur", value: "SS" },
  { label: "Suecia", value: "SE" },
  { label: "Suiza", value: "CH" },
  { label: "Surinam", value: "SR" },
  { label: "Tailandia", value: "TH" },
  { label: "Taiwán", value: "TW" },
  { label: "Tanzania", value: "TZ" },
  { label: "Tayikistán", value: "TJ" },
  { label: "Timor Oriental", value: "TL" },
  { label: "Togo", value: "TG" },
  { label: "Tonga", value: "TO" },
  { label: "Trinidad y Tobago", value: "TT" },
  { label: "Túnez", value: "TN" },
  { label: "Turkmenistán", value: "TM" },
  { label: "Turquía", value: "TR" },
  { label: "Tuvalu", value: "TV" },
  { label: "Uganda", value: "UG" },
  { label: "Uruguay", value: "UY" },
  { label: "Uzbekistán", value: "UZ" },
  { label: "Vanuatu", value: "VU" },
  { label: "Vaticano", value: "VA" },
  { label: "Venezuela", value: "VE" },
  { label: "Vietnam", value: "VN" },
  { label: "Yemen", value: "YE" },
  { label: "Yibuti", value: "DJ" },
  { label: "Zambia", value: "ZM" },
  { label: "Zimbabue", value: "ZW" },
];

// Do not use Zod .default() with toTypedSchema — Zod 4 breaks @vee-validate/zod; use initialValues.
const segmentOptions = computed(() => [
  { label: t("clientsPage.segmentNone"), value: "" },
  { label: t("clientsPage.segmentSmb"), value: "SMB" },
  { label: t("clientsPage.segmentMidMarket"), value: "MID_MARKET" },
  { label: t("clientsPage.segmentEnterprise"), value: "ENTERPRISE" },
]);

const leadSourceOptions = computed(() => [
  { label: t("common.none"), value: "" },
  { label: t("clientsPage.leadSourceReferral"), value: "REFERRAL" },
  { label: t("clientsPage.leadSourceInbound"), value: "INBOUND" },
  { label: t("clientsPage.leadSourceOutbound"), value: "OUTBOUND" },
  { label: t("clientsPage.leadSourceWebsite"), value: "WEBSITE" },
  { label: t("clientsPage.leadSourceSocialMedia"), value: "SOCIAL_MEDIA" },
  { label: t("clientsPage.leadSourceEvent"), value: "EVENT" },
  {
    label: t("clientsPage.leadSourceSupportEscalation"),
    value: "SUPPORT_ESCALATION",
  },
  { label: t("clientsPage.leadSourceOther"), value: "OTHER" },
]);

const schema = computed(() =>
  z.object({
    name: z.string().min(2, t("clientsPage.nameMin")),
    legalName: z.string().optional(),
    taxId: z.string().optional(),
    country: z.string().min(2, t("clientsPage.countryMin")),
    website: z
      .string()
      .url(t("clientsPage.websiteInvalid"))
      .optional()
      .or(z.literal("")),
    industry: z.string().optional(),
    segment: z.string().optional(),
    notes: z.string().optional(),
    leadSource: z.string().optional(),
    phone: z.string().optional(),
  }),
);

const createForm = useForm({
  validationSchema: computed(() => toTypedSchema(schema.value)),
  initialValues: {
    name: "",
    legalName: "",
    taxId: "",
    country: "MX",
    website: "",
    industry: "",
    segment: "",
    notes: "",
    leadSource: "",
    phone: "",
  },
});

const [nameValue, nameAttrs] = createForm.defineField("name");
const [legalNameValue, legalNameAttrs] = createForm.defineField("legalName");
const [taxIdValue, taxIdAttrs] = createForm.defineField("taxId");
const [countryValue, countryAttrs] = createForm.defineField("country");
const [websiteValue, websiteAttrs] = createForm.defineField("website");
const [industryValue, industryAttrs] = createForm.defineField("industry");
const [segmentValue] = createForm.defineField("segment");
const [notesValue, notesAttrs] = createForm.defineField("notes");
const [leadSourceValue] = createForm.defineField("leadSource");
const [phoneValue, phoneAttrs] = createForm.defineField("phone");

function openCreateDialog() {
  createForm.resetForm();
  showCreateDialog.value = true;
}

const onSubmit = createForm.handleSubmit(async (values) => {
  isSubmitting.value = true;
  try {
    await clientsService.create({
      name: values.name,
      legalName: values.legalName || undefined,
      taxId: values.taxId || undefined,
      country: values.country,
      website: values.website || undefined,
      industry: values.industry || undefined,
      segment: values.segment || undefined,
      notes: values.notes || undefined,
      leadSource: values.leadSource || undefined,
      phone: values.phone || undefined,
    });
    await queryClient.invalidateQueries({ queryKey: ["clients"] });
    showCreateDialog.value = false;
    toast.success(t("common.create"));
  } catch {
    toast.error(t("errors.loadFailed"));
  } finally {
    isSubmitting.value = false;
  }
});

// --- Edit Client Modal ---
const showEditDialog = ref(false);
const editingClient = ref<Client | null>(null);
const isEditSubmitting = ref(false);

const editForm = useForm({
  validationSchema: computed(() => toTypedSchema(schema.value)),
  initialValues: {
    name: "",
    legalName: "",
    taxId: "",
    country: "MX",
    website: "",
    industry: "",
    segment: "",
    notes: "",
    leadSource: "",
    phone: "",
  },
});

const [editName, editNameAttrs] = editForm.defineField("name");
const [editLegalName, editLegalNameAttrs] = editForm.defineField("legalName");
const [editTaxId, editTaxIdAttrs] = editForm.defineField("taxId");
const [editCountry, editCountryAttrs] = editForm.defineField("country");
const [editWebsite, editWebsiteAttrs] = editForm.defineField("website");
const [editIndustry, editIndustryAttrs] = editForm.defineField("industry");
const [editSegment] = editForm.defineField("segment");
const [editNotes, editNotesAttrs] = editForm.defineField("notes");
const [editLeadSource] = editForm.defineField("leadSource");
const [editPhone, editPhoneAttrs] = editForm.defineField("phone");

function openEditDialog(client: Client) {
  editingClient.value = client;
  editForm.setValues({
    name: client.name,
    legalName: client.legalName ?? "",
    taxId: client.taxId ?? "",
    country: client.country ?? "MX",
    website: client.website ?? "",
    industry: client.industry ?? "",
    segment: client.segment ?? "",
    notes: client.notes ?? "",
    leadSource: client.leadSource ?? "",
    phone: client.phone ?? "",
  });
  showEditDialog.value = true;
}

const onEditSubmit = editForm.handleSubmit(async (values) => {
  if (!editingClient.value) return;
  isEditSubmitting.value = true;
  try {
    await clientsService.update(editingClient.value.id, {
      name: values.name,
      legalName: values.legalName || undefined,
      taxId: values.taxId || undefined,
      country: values.country,
      website: values.website || undefined,
      industry: values.industry || undefined,
      segment: values.segment || undefined,
      notes: values.notes || undefined,
      leadSource: values.leadSource || undefined,
      phone: values.phone || undefined,
    });
    await queryClient.invalidateQueries({ queryKey: ["clients"] });
    showEditDialog.value = false;
    toast.success(t("common.save"));
  } catch {
    toast.error(t("errors.loadFailed"));
  } finally {
    isEditSubmitting.value = false;
  }
});
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <div>
          <h1 class="text-xl font-bold text-[var(--text)]">{{ t("clientsPage.title") }}</h1>
          <p class="text-sm text-[var(--text-muted)]">{{ t("clientsPage.totalCount", { count: totalRecords }) }}</p>
        </div>
        <PageInfoButton :title="t('clientsPage.title')" :description="t('pageInfo.clients')" />
      </div>
      <div class="flex gap-2">
        <Button
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          @click="refetch()"
        />
        <Button
          :label="t('clientsPage.newClient')"
          icon="pi pi-plus"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <!-- Search -->
    <div class="relative max-w-md">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
      <InputText
        v-model="globalFilter"
        :placeholder="t('clientsPage.searchPlaceholder')"
        class="w-full pl-10"
        @input="onSearch"
      />
    </div>

    <!-- Error state -->
    <div
      v-if="isError"
      class="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex flex-col gap-2"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <AlertCircle class="w-4 h-4" />
          <span>{{ t("clientsPage.loadError") }}</span>
        </div>
        <Button
          :label="t('common.retry')"
          size="small"
          severity="danger"
          text
          @click="refetch()"
        />
      </div>
      <p v-if="queryErrorText" class="text-xs font-mono opacity-70 break-all">
        {{ queryErrorText }}
      </p>
    </div>

    <SkeletonTable v-if="isPending" :rows="5" :cols="6" />

    <DataTable
      v-else
      :key="appliedFilter"
      :value="filteredClients"
      :loading="isFetching"
      :rows="pageSize"
      paginator
      removable-sort
      striped-rows
      class="rounded-[var(--radius-lg)] overflow-hidden"
    >
      <Column
        field="name"
        :header="t('clientsPage.name')"
        sortable
        style="min-width: 180px"
      >
        <template #body="{ data: row }: { data: Client }">
          <button
            class="font-medium text-[var(--text)] hover:text-[var(--primary)] hover:underline cursor-pointer text-left transition-colors"
            @click="router.push('/clients/' + row.id)"
          >
            {{ row.name }}
          </button>
        </template>
      </Column>

      <Column
        field="legalName"
        :header="t('clientsPage.legalName')"
        style="min-width: 160px"
      >
        <template #body="{ data: row }: { data: Client }">
          <span class="text-[var(--text-muted)] text-sm">{{ row.legalName ?? "—" }}</span>
        </template>
      </Column>

      <Column
        field="country"
        :header="t('clientsPage.country')"
        style="width: 110px"
      >
        <template #body="{ data: row }: { data: Client }">
          <span class="text-[var(--text-muted)] text-sm">{{ row.country ?? "—" }}</span>
        </template>
      </Column>

      <Column
        field="status"
        :header="t('clientsPage.status')"
        style="width: 110px"
      >
        <template #body="{ data: row }: { data: Client }">
          <Tag
            :severity="statusSeverity(row.status)"
            :value="row.status ?? 'N/A'"
          />
        </template>
      </Column>

      <Column
        field="taxId"
        :header="t('clientsPage.taxId')"
        style="width: 130px"
      >
        <template #body="{ data: row }: { data: Client }">
          <span class="text-[var(--text-muted)] text-sm font-mono">{{ row.taxId ?? "—" }}</span>
        </template>
      </Column>

      <Column
        field="createdAt"
        :header="t('clientsPage.created')"
        sortable
        style="width: 120px"
      >
        <template #body="{ data: row }: { data: Client }">
          <span class="text-[var(--text-muted)] text-sm whitespace-nowrap">{{ formatDate(row.createdAt) }}</span>
        </template>
      </Column>

      <Column :header="t('common.actions')" style="width: 130px">
        <template #body="{ data: row }: { data: Client }">
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
              v-tooltip.top="t('nav.clientDetail')"
              @click="router.push('/clients/' + row.id)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              v-tooltip.top="t('common.delete')"
              @click="confirmDeleteClient(row)"
            />
          </div>
        </template>
      </Column>

      <template #empty>
        <EmptyState
          :title="t('clientsPage.noRows')"
          description="No se encontraron clientes con los filtros actuales"
        >
          <template #icon>
            <Building2 class="w-6 h-6 text-[var(--text-muted)]" />
          </template>
        </EmptyState>
      </template>
    </DataTable>
  </div>

  <!-- Create Client Dialog -->
  <AppDialog
    v-model:visible="showCreateDialog"
    :title="t('clientsPage.newClient')"
    subtitle=""
    :loading="isSubmitting"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
      <FormField
        :label="t('clientsPage.name')"
        name="name"
        :error="createForm.errors.value.name"
        required
      >
        <InputText
          id="name"
          v-model="nameValue"
          v-bind="nameAttrs"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField
        :label="t('clientsPage.legalName')"
        name="legalName"
        :error="createForm.errors.value.legalName"
      >
        <InputText
          id="legalName"
          v-model="legalNameValue"
          v-bind="legalNameAttrs"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField
        :label="t('clientsPage.taxId')"
        name="taxId"
        :error="createForm.errors.value.taxId"
      >
        <InputText
          id="taxId"
          v-model="taxIdValue"
          v-bind="taxIdAttrs"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>

      <FormField
        :label="t('clientsPage.country')"
        name="country"
        :error="createForm.errors.value.country"
        required
      >
        <Select
          id="country"
          v-model="countryValue"
          v-bind="countryAttrs"
          :options="countryOptions"
          option-label="label"
          option-value="value"
          :placeholder="t('clientsPage.selectCountry')"
          filter
          show-clear
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>
      <FormField
        :label="t('clientsPage.website')"
        name="website"
        :error="createForm.errors.value.website"
      >
        <InputText
          id="website"
          v-model="websiteValue"
          v-bind="websiteAttrs"
          placeholder="https://example.com"
          class="w-full"
          :disabled="isSubmitting"
        />
      </FormField>
      <div class="grid grid-cols-2 gap-3">
        <FormField :label="t('clientsPage.industry')" name="industry">
          <InputText
            id="industry"
            v-model="industryValue"
            v-bind="industryAttrs"
            placeholder="e.g. Restaurant"
            class="w-full"
            :disabled="isSubmitting"
          />
        </FormField>
        <FormField :label="t('clientsPage.segment')" name="segment">
          <Select
            v-model="segmentValue"
            :options="segmentOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :disabled="isSubmitting"
          />
        </FormField>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <FormField :label="t('clientsPage.leadSource')" name="leadSource">
          <Select
            v-model="leadSourceValue"
            :options="leadSourceOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :disabled="isSubmitting"
          />
        </FormField>
        <FormField :label="t('clientsPage.phone')" name="phone">
          <InputText
            id="phone"
            v-model="phoneValue"
            v-bind="phoneAttrs"
            placeholder="+52 (55) 1234-5678"
            class="w-full"
            :disabled="isSubmitting"
          />
        </FormField>
      </div>
      <FormField :label="t('clientsPage.notes')" name="notes">
        <Textarea
          v-model="notesValue"
          v-bind="notesAttrs"
          placeholder="Internal notes..."
          :rows="2"
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
          :label="t('common.create')"
          :loading="isSubmitting"
          @click="onSubmit"
        />
      </div>
    </template>
  </AppDialog>

  <!-- Edit Client Dialog -->
  <AppDialog
    v-model:visible="showEditDialog"
    :title="t('common.edit')"
    subtitle=""
    :loading="isEditSubmitting"
  >
    <form class="flex flex-col gap-4" @submit.prevent="onEditSubmit">
      <FormField
        :label="t('clientsPage.name')"
        name="edit-name"
        :error="editForm.errors.value.name"
        required
      >
        <InputText
          id="edit-name"
          v-model="editName"
          v-bind="editNameAttrs"
          class="w-full"
          :disabled="isEditSubmitting"
        />
      </FormField>

      <FormField
        :label="t('clientsPage.legalName')"
        name="edit-legalName"
        :error="editForm.errors.value.legalName"
      >
        <InputText
          id="edit-legalName"
          v-model="editLegalName"
          v-bind="editLegalNameAttrs"
          class="w-full"
          :disabled="isEditSubmitting"
        />
      </FormField>

      <FormField
        :label="t('clientsPage.taxId')"
        name="edit-taxId"
        :error="editForm.errors.value.taxId"
      >
        <InputText
          id="edit-taxId"
          v-model="editTaxId"
          v-bind="editTaxIdAttrs"
          class="w-full"
          :disabled="isEditSubmitting"
        />
      </FormField>

      <FormField
        :label="t('clientsPage.country')"
        name="edit-country"
        :error="editForm.errors.value.country"
        required
      >
        <Select
          id="edit-country"
          v-model="editCountry"
          v-bind="editCountryAttrs"
          :options="countryOptions"
          option-label="label"
          option-value="value"
          :placeholder="t('clientsPage.selectCountry')"
          filter
          show-clear
          class="w-full"
          :disabled="isEditSubmitting"
        />
      </FormField>
      <FormField
        :label="t('clientsPage.website')"
        name="edit-website"
        :error="editForm.errors.value.website"
      >
        <InputText
          id="edit-website"
          v-model="editWebsite"
          v-bind="editWebsiteAttrs"
          placeholder="https://example.com"
          class="w-full"
          :disabled="isEditSubmitting"
        />
      </FormField>
      <div class="grid grid-cols-2 gap-3">
        <FormField :label="t('clientsPage.industry')" name="edit-industry">
          <InputText
            id="edit-industry"
            v-model="editIndustry"
            v-bind="editIndustryAttrs"
            placeholder="e.g. Restaurant"
            class="w-full"
            :disabled="isEditSubmitting"
          />
        </FormField>
        <FormField :label="t('clientsPage.segment')" name="edit-segment">
          <Select
            v-model="editSegment"
            :options="segmentOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :disabled="isEditSubmitting"
          />
        </FormField>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <FormField :label="t('clientsPage.leadSource')" name="edit-leadSource">
          <Select
            v-model="editLeadSource"
            :options="leadSourceOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            :disabled="isEditSubmitting"
          />
        </FormField>
        <FormField :label="t('clientsPage.phone')" name="edit-phone">
          <InputText
            id="edit-phone"
            v-model="editPhone"
            v-bind="editPhoneAttrs"
            placeholder="+52 (55) 1234-5678"
            class="w-full"
            :disabled="isEditSubmitting"
          />
        </FormField>
      </div>
      <FormField :label="t('clientsPage.notes')" name="edit-notes">
        <Textarea
          v-model="editNotes"
          v-bind="editNotesAttrs"
          placeholder="Internal notes..."
          :rows="2"
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
          :label="t('common.save')"
          :loading="isEditSubmitting"
          @click="onEditSubmit"
        />
      </div>
    </template>
  </AppDialog>
</template>
