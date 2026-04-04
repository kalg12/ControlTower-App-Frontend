import type { CurrentUser } from '@/types/auth'

/** True if the user may access a route that requires `permission`. */
export function userHasPermission(user: CurrentUser | null, permission: string): boolean {
  if (!user) return false
  if (user.superAdmin) return true
  if (!user.permissions?.length) return true
  return user.permissions.includes(permission)
}
