import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'

export default async function HomePage() {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/login')
  }

  if (profile.role === 'staff') {
    redirect('/staff/sesiones')
  }

  redirect('/palista/sesiones')
}
