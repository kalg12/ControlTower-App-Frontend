import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, type MaybeRefOrGetter, toValue } from 'vue'
import { rolesService } from '@/services/users.service'
import { qk } from '@/queries/keys'

export function useRolesPage(page: MaybeRefOrGetter<number> = 0, size: MaybeRefOrGetter<number> = 50) {
  return useQuery({
    queryKey: computed(() => ['roles', toValue(page), toValue(size)] as const),
    queryFn: () => rolesService.listRoles(toValue(page), toValue(size)),
    staleTime: 60_000
  })
}

export function usePermissions() {
  return useQuery({
    queryKey: qk.permissions(),
    queryFn: () => rolesService.listPermissions(),
    staleTime: 120_000
  })
}

export function useRoleMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['roles'] })

  return {
    assignRole: useMutation({
      mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
        rolesService.assignRoleToUser(userId, roleId),
      onSuccess: invalidate
    }),
    removeRole: useMutation({
      mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
        rolesService.removeRoleFromUser(userId, roleId),
      onSuccess: invalidate
    })
  }
}
