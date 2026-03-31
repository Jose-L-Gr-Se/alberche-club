import { getCurrentProfile, type CurrentProfile } from '@/lib/auth/get-current-profile'

export async function requireCurrentProfile(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile()

  if (!profile) {
    throw new Error('UNAUTHENTICATED')
  }

  return profile
}
