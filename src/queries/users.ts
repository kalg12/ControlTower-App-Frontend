import { useQuery } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/auth'
import { usersService } from '@/services/users.service'
import { qk } from '@/queries/keys'

/** List all users in the current tenant (for dropdowns / selectors). Cached 5 minutes. */
export function useUsers(size = 100) {
  const auth = useAuthStore()
  return useQuery({
    queryKey: ['users', auth.user?.tenantId ?? ''],
    queryFn: () => usersService.list({ tenantId: auth.user?.tenantId ?? '', page: 0, size }),
    staleTime: 5 * 60_000,
    enabled: !!auth.user?.tenantId,
  })
}

/** Workload: users with their current open-ticket count. Cached 60 seconds. */
export function useUsersWorkload() {
  return useQuery({
    queryKey: qk.usersWorkload(),
    queryFn: () => usersService.workload(),
    staleTime: 60_000,
  })
}
