<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import VueApexCharts from 'vue3-apexcharts'
import type { ApexOptions } from 'apexcharts'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Card from '@/components/ui/Card.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import { useTicketsTrend, useAgentPerformance, useTopClients, useSlaTrend } from '@/queries/reports'
import { formatMinutes } from '@/types/time-tracking'
import { BarChart3, TrendingUp, Users, ShieldCheck, RefreshCw } from 'lucide-vue-next'

const { t } = useI18n()

// ── Date range ──────────────────────────────────────────────────────────
type Range = '7d' | '30d' | '90d'
const selectedRange = ref<Range>('30d')

function rangeParams(range: Range): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  from.setDate(from.getDate() - days)
  return { from: from.toISOString(), to: to.toISOString() }
}

const fromRef = computed(() => rangeParams(selectedRange.value).from)
const toRef = computed(() => rangeParams(selectedRange.value).to)

// ── Queries ─────────────────────────────────────────────────────────────
const { data: trendData, isLoading: trendLoading, refetch: refetchTrend } = useTicketsTrend(fromRef, toRef)
const { data: agentData, isLoading: agentLoading, refetch: refetchAgent } = useAgentPerformance(fromRef, toRef)
const { data: clientData, isLoading: clientLoading, refetch: refetchClients } = useTopClients(fromRef, toRef, 10)
const { data: slaData, isLoading: slaLoading, refetch: refetchSla } = useSlaTrend(fromRef, toRef)

function refetchAll() {
  refetchTrend()
  refetchAgent()
  refetchClients()
  refetchSla()
}

const isAnyLoading = computed(() => trendLoading.value || agentLoading.value || clientLoading.value || slaLoading.value)

// ── Tickets trend chart (area) ───────────────────────────────────────────
const trendSeries = computed(() => [{
  name: t('reports.ticketsCreated'),
  data: (trendData.value ?? []).map(p => p.count)
}])

const trendOptions = computed<ApexOptions>(() => ({
  chart: { type: 'area', background: 'transparent', toolbar: { show: false }, sparkline: { enabled: false } },
  xaxis: {
    categories: (trendData.value ?? []).map(p => p.date),
    labels: { style: { fontFamily: 'inherit', fontSize: '11px' }, rotate: -30 },
    tickAmount: Math.min((trendData.value?.length ?? 1), 10)
  },
  yaxis: { labels: { style: { fontFamily: 'inherit' } }, min: 0 },
  colors: ['#6366f1'],
  fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
  stroke: { curve: 'smooth', width: 2 },
  dataLabels: { enabled: false },
  tooltip: { theme: 'dark', x: { show: true } },
  grid: { borderColor: 'var(--border, #e5e7eb)' },
  noData: { text: t('common.noData'), align: 'center', verticalAlign: 'middle', style: { fontSize: '13px' } }
}))

// ── SLA trend chart (stacked bar) ────────────────────────────────────────
const slaSeries = computed(() => [
  { name: t('reports.slaOk'), data: (slaData.value ?? []).map(p => p.ok) },
  { name: t('reports.slaBreached'), data: (slaData.value ?? []).map(p => p.breached) }
])

const slaOptions = computed<ApexOptions>(() => ({
  chart: { type: 'bar', stacked: true, background: 'transparent', toolbar: { show: false } },
  xaxis: {
    categories: (slaData.value ?? []).map(p => p.date),
    labels: { style: { fontFamily: 'inherit', fontSize: '11px' }, rotate: -30 },
    tickAmount: Math.min((slaData.value?.length ?? 1), 10)
  },
  yaxis: { labels: { style: { fontFamily: 'inherit' } }, min: 0 },
  colors: ['#22c55e', '#ef4444'],
  plotOptions: { bar: { borderRadius: 0, columnWidth: '60%' } },
  dataLabels: { enabled: false },
  legend: { position: 'top', fontSize: '12px', fontFamily: 'inherit' },
  tooltip: { theme: 'dark' },
  grid: { borderColor: 'var(--border, #e5e7eb)' },
  noData: { text: t('common.noData'), align: 'center', verticalAlign: 'middle', style: { fontSize: '13px' } }
}))

// ── Top clients chart (horizontal bar) ──────────────────────────────────
const clientsSeries = computed(() => [{
  name: t('reports.tickets'),
  data: (clientData.value ?? []).map(c => c.ticketCount)
}])

const clientsOptions = computed<ApexOptions>(() => ({
  chart: { type: 'bar', background: 'transparent', toolbar: { show: false } },
  plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%' } },
  xaxis: { labels: { style: { fontFamily: 'inherit' } } },
  yaxis: {
    categories: (clientData.value ?? []).map(c => c.clientName),
    labels: { style: { fontFamily: 'inherit', fontSize: '12px' } }
  },
  colors: ['#6366f1'],
  dataLabels: { enabled: true, style: { fontFamily: 'inherit', fontWeight: 600, fontSize: '11px' } },
  tooltip: { theme: 'dark' },
  grid: { borderColor: 'var(--border, #e5e7eb)' },
  noData: { text: t('common.noData'), align: 'center', verticalAlign: 'middle', style: { fontSize: '13px' } }
}))

// ── Agent table helpers ──────────────────────────────────────────────────
function slaRateSeverity(rate: number | null): 'success' | 'warning' | 'danger' | undefined {
  if (rate === null) return undefined
  if (rate >= 80) return 'success'
  if (rate >= 50) return 'warning'
  return 'danger'
}
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-2">
        <BarChart3 class="w-6 h-6 text-[var(--primary)]" />
        <h1 class="text-xl font-bold text-[var(--text)]">{{ t('reports.title') }}</h1>
      </div>

      <div class="flex items-center gap-2">
        <!-- Range selector -->
        <div class="flex rounded-[var(--radius)] border border-[var(--border)] overflow-hidden text-sm">
          <button
            v-for="r in (['7d', '30d', '90d'] as const)"
            :key="r"
            :class="[
              'px-3 py-1.5 font-medium transition-colors',
              selectedRange === r
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-raised)]'
            ]"
            @click="selectedRange = r"
          >
            {{ t(`reports.range.${r}`) }}
          </button>
        </div>

        <Button
          :icon="isAnyLoading ? 'pi pi-spin pi-spinner' : undefined"
          size="small"
          severity="secondary"
          :disabled="isAnyLoading"
          @click="refetchAll"
        >
          <template v-if="!isAnyLoading">
            <RefreshCw class="w-3.5 h-3.5 mr-1" />
          </template>
          {{ t('common.refresh') }}
        </Button>
      </div>
    </div>

    <!-- Row 1: Ticket trend + SLA trend -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <!-- Ticket trend -->
      <Card>
        <template #header>
          <div class="flex items-center gap-2">
            <TrendingUp class="w-4 h-4 text-[var(--primary)]" />
            <span class="font-semibold text-[var(--text)]">{{ t('reports.ticketsTrend') }}</span>
          </div>
        </template>
        <SkeletonCard v-if="trendLoading" />
        <VueApexCharts
          v-else
          type="area"
          height="260"
          :series="trendSeries"
          :options="trendOptions"
        />
      </Card>

      <!-- SLA trend -->
      <Card>
        <template #header>
          <div class="flex items-center gap-2">
            <ShieldCheck class="w-4 h-4 text-green-500" />
            <span class="font-semibold text-[var(--text)]">{{ t('reports.slaTrend') }}</span>
          </div>
        </template>
        <SkeletonCard v-if="slaLoading" />
        <VueApexCharts
          v-else
          type="bar"
          height="260"
          :series="slaSeries"
          :options="slaOptions"
        />
      </Card>
    </div>

    <!-- Row 2: Agent table + Top clients -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <!-- Agent performance table -->
      <Card>
        <template #header>
          <div class="flex items-center gap-2">
            <Users class="w-4 h-4 text-[var(--primary)]" />
            <span class="font-semibold text-[var(--text)]">{{ t('reports.agentPerformance') }}</span>
          </div>
        </template>
        <SkeletonCard v-if="agentLoading" />
        <DataTable
          v-else
          :value="agentData ?? []"
          size="small"
          :rows="10"
          striped-rows
          class="text-sm"
        >
          <Column field="agentName" :header="t('reports.agent')" />
          <Column field="assigned" :header="t('reports.assigned')" class="text-center" />
          <Column field="resolved" :header="t('reports.resolved')" class="text-center" />
          <Column :header="t('reports.avgTime')">
            <template #body="{ data }">
              <span v-if="data.avgMinutes !== null">{{ formatMinutes(data.avgMinutes) }}</span>
              <span v-else class="text-[var(--text-muted)]">—</span>
            </template>
          </Column>
          <Column :header="t('reports.slaRate')">
            <template #body="{ data }">
              <Tag
                v-if="data.slaRate !== null"
                :value="`${data.slaRate.toFixed(0)}%`"
                :severity="slaRateSeverity(data.slaRate)"
              />
              <span v-else class="text-[var(--text-muted)]">—</span>
            </template>
          </Column>
        </DataTable>
      </Card>

      <!-- Top clients chart -->
      <Card>
        <template #header>
          <div class="flex items-center gap-2">
            <BarChart3 class="w-4 h-4 text-[var(--primary)]" />
            <span class="font-semibold text-[var(--text)]">{{ t('reports.topClients') }}</span>
          </div>
        </template>
        <SkeletonCard v-if="clientLoading" />
        <VueApexCharts
          v-else
          type="bar"
          height="280"
          :series="clientsSeries"
          :options="clientsOptions"
        />
      </Card>
    </div>
  </div>
</template>
