/** Read JWT `exp` claim (seconds since epoch) as milliseconds. No signature verification. */
export function getJwtExpMs(accessToken: string): number | null {
  try {
    const parts = accessToken.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    ) as { exp?: number }
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}
