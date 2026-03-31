import { requireCurrentProfile } from '@/lib/auth/require-current-profile'
import type { CurrentProfile } from '@/lib/auth/get-current-profile'

type AllowedRole = 'palista' | 'staff'

export async function requireRole(allowedRoles: AllowedRole[]): Promise<CurrentProfile> {
  const profile = await requireCurrentProfile()

  if (!profile.role || !allowedRoles.includes(profile.role)) {
    throw new Error('FORBIDDEN')
  }

  return profile
}
