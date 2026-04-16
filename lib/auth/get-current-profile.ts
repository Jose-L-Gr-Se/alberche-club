import { createServerSupabaseClient } from '@/lib/supabase/server'

export type CurrentProfile = {
  userId: string
  profileId: string
  email: string | null
  role: 'palista' | 'staff' | null
  nombre: string | null
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, role, nombre')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return null
  }

  return {
    userId: user.id,
    profileId: profile.id,
    email: profile.email ?? user.email ?? null,
    role: profile.role ?? null,
    nombre: profile.nombre ?? null,
  }
}
