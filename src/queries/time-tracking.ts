import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import type { Ref } from 'vue'
import { timeTrackingService } from '@/services/time-tracking.service'
import { qk } from '@/queries/keys'
import type { TimeEntityType, StartTimerRequest, LogTimeRequest, UpdateSlaConfigRequest } from '@/types/time-tracking'

// ── Queries ───────────────────────────────────────────────────────────

export function useTimeSummary(entityType: Ref<TimeEntityType>, entityId: Ref<string>) {
  const enabled = computed(() => !!entityId.value)
  return useQuery({
    queryKey: computed(() => qk.timeSummary(entityType.value, entityId.value)),
    queryFn: () => timeTrackingService.getSummary(entityType.value, entityId.value),
    enabled,
    staleTime: 30_000,
  })
}

export function useActiveTimer() {
  return useQuery({
    queryKey: qk.activeTimer(),
    queryFn: () => timeTrackingService.getActiveTimer(),
    refetchInterval: 30_000,
    staleTime: 0,
  })
}

export function useSlaConfig() {
  return useQuery({
    queryKey: qk.slaConfig(),
    queryFn: () => timeTrackingService.getSlaConfig(),
    staleTime: 5 * 60_000,
  })
}

export function useTimeAnalytics(from?: Ref<string | undefined>, to?: Ref<string | undefined>) {
  return useQuery({
    queryKey: computed(() => qk.timeAnalytics(from?.value, to?.value)),
    queryFn: () => timeTrackingService.getAnalytics(from?.value, to?.value),
    staleTime: 60_000,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────

export function useTimeTrackingMutations() {
  const queryClient = useQueryClient()

  const invalidateSummary = (entityType: TimeEntityType, entityId: string) => {
    queryClient.invalidateQueries({ queryKey: qk.timeSummary(entityType, entityId) })
    queryClient.invalidateQueries({ queryKey: qk.activeTimer() })
  }

  const startTimer = useMutation({
    mutationFn: (req: StartTimerRequest) => timeTrackingService.startTimer(req),
    onSuccess: (_, req) => invalidateSummary(req.entityType, req.entityId),
  })

  const stopTimer = useMutation({
    mutationFn: ({ id, entityType, entityId }: { id: string; entityType: TimeEntityType; entityId: string }) =>
      timeTrackingService.stopTimer(id),
    onSuccess: (_, vars) => invalidateSummary(vars.entityType, vars.entityId),
  })

  const logManual = useMutation({
    mutationFn: (req: LogTimeRequest) => timeTrackingService.logManual(req),
    onSuccess: (_, req) => invalidateSummary(req.entityType, req.entityId),
  })

  const deleteEntry = useMutation({
    mutationFn: ({ id, entityType, entityId }: { id: string; entityType: TimeEntityType; entityId: string }) =>
      timeTrackingService.deleteEntry(id),
    onSuccess: (_, vars) => invalidateSummary(vars.entityType, vars.entityId),
  })

  const updateSlaConfig = useMutation({
    mutationFn: (req: UpdateSlaConfigRequest) => timeTrackingService.updateSlaConfig(req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.slaConfig() }),
  })

  return { startTimer, stopTimer, logManual, deleteEntry, updateSlaConfig }
}
