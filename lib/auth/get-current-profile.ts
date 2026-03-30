import { createServerSupabaseClient } from '@/lib/supabase/server'

export type CurrentProfile = {
  userId: string
  profileId: string
  email: string | null
  rol: string | null
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
    .select('id, email, rol, nombre')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return null
  }

  return {
    userId: user.id,
    profileId: profile.id,
    email: profile.email ?? user.email ?? null,
    rol: profile.rol ?? null,
    nombre: profile.nombre ?? null,
  }
}
