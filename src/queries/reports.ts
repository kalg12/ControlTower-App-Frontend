import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { qk } from './keys'
import { reportsService } from '@/services/reports.service'

const STALE = 5 * 60 * 1000 // 5 min

function toKey(d?: Ref<string | undefined> | string): string {
  return (typeof d === 'object' && d ? d.value : d) ?? ''
}

export function useTicketsTrend(from?: Ref<string | undefined>, to?: Ref<string | undefined>) {
  return useQuery({
    queryKey: computed(() => qk.reports('tickets-trend', toKey(from), toKey(to))),
    queryFn: () => reportsService.getTicketsTrend({ from: toKey(from), to: toKey(to) }),
    staleTime: STALE
  })
}

export function useAgentPerformance(from?: Ref<string | undefined>, to?: Ref<string | undefined>) {
  return useQuery({
    queryKey: computed(() => qk.reports('agent-performance', toKey(from), toKey(to))),
    queryFn: () => reportsService.getAgentPerformance({ from: toKey(from), to: toKey(to) }),
    staleTime: STALE
  })
}

export function useTopClients(from?: Ref<string | undefined>, to?: Ref<string | undefined>, limit = 10) {
  return useQuery({
    queryKey: computed(() => qk.reports('top-clients', toKey(from), toKey(to))),
    queryFn: () => reportsService.getTopClients({ from: toKey(from), to: toKey(to), limit }),
    staleTime: STALE
  })
}

export function useSlaTrend(from?: Ref<string | undefined>, to?: Ref<string | undefined>) {
  return useQuery({
    queryKey: computed(() => qk.reports('sla-trend', toKey(from), toKey(to))),
    queryFn: () => reportsService.getSlaTrend({ from: toKey(from), to: toKey(to) }),
    staleTime: STALE
  })
}
