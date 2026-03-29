'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const TEST_PROFILE_ID = 'ac6faf2a-1e6c-4ba7-8f38-f355ab750f98'

function sesionPermiteCambios(sesion: { estado: string; cierre_inscripcion_at: string | null }) {
  if (sesion.estado !== 'abierta_inscripcion') return false
  if (!sesion.cierre_inscripcion_at) return false

  const ahora = new Date()
  const cierre = new Date(sesion.cierre_inscripcion_at)

  return ahora < cierre
}

export async function inscribirmeEnSesion(sesionId: string) {
  const supabase = createServerSupabaseClient()

  const { data: sesion, error: sesionError } = await supabase
    .from('sesiones')
    .select('id, estado, cierre_inscripcion_at, capacidad_total')
    .eq('id', sesionId)
    .single()

  if (sesionError) {
    throw new Error(`No se pudo cargar la sesión: ${sesionError.message}`)
  }

  if (!sesion || !sesionPermiteCambios(sesion)) {
    return { ok: false, reason: 'closed' }
  }

  const { count, error: countError } = await supabase
    .from('inscripciones')
    .select('*', { count: 'exact', head: true })
    .eq('sesion_id', sesionId)
    .in('estado', ['inscrito'])

  if (countError) {
    throw new Error(`No se pudo calcular la capacidad: ${countError.message}`)
  }

  const capacidadTotal = sesion.capacidad_total ?? 0
  const plazasOcupadas = count ?? 0

  const nuevoEstado =
    plazasOcupadas >= capacidadTotal ? 'lista_espera' : 'inscrito'

  const { error } = await supabase.from('inscripciones').insert({
    sesion_id: sesionId,
    profile_id: TEST_PROFILE_ID,
    estado: nuevoEstado,
    lado_solicitado: 'i',
    prep_rec: 'prep',
    tipo_hueco: 'veterano',
    observaciones: 'Inscripción creada desde pantalla palista',
  })

  if (error) {
    if (error.message.includes('uq_inscripcion_activa_por_sesion')) {
      return { ok: false, reason: 'duplicate' }
    }

    throw new Error(error.message)
  }

  revalidatePath('/palista/sesiones')
  return { ok: true }
}

export async function cancelarInscripcionEnSesion(sesionId: string) {
  const supabase = createServerSupabaseClient()

  const { data: sesion, error: sesionError } = await supabase
    .from('sesiones')
    .select('id, estado, cierre_inscripcion_at')
    .eq('id', sesionId)
    .single()

  if (sesionError) {
    throw new Error(`No se pudo cargar la sesión: ${sesionError.message}`)
  }

  if (!sesion || !sesionPermiteCambios(sesion)) {
    return { ok: false, reason: 'closed' }
  }

  const { error } = await supabase
    .from('inscripciones')
    .update({
      estado: 'cancelado',
      cancelled_at: new Date().toISOString(),
    })
    .eq('sesion_id', sesionId)
    .eq('profile_id', TEST_PROFILE_ID)
    .in('estado', ['inscrito', 'lista_espera'])

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/palista/sesiones')
  return { ok: true }
}
