'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'

function sesionPermiteCambios(sesion: { estado: string; cierre_inscripcion_at: string | null }) {
  if (sesion.estado !== 'abierta_inscripcion') return false
  if (!sesion.cierre_inscripcion_at) return false

  const ahora = new Date()
  const cierre = new Date(sesion.cierre_inscripcion_at)

  return ahora < cierre
}

export async function inscribirmeEnSesion(sesionId: string) {
  const currentProfile = await getCurrentProfile()

  if (!currentProfile) {
    throw new Error('No hay usuario autenticado')
  }

  const profileId = currentProfile.profileId
  const supabase = await createServerSupabaseClient()

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
    profile_id: profileId,
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
  const currentProfile = await getCurrentProfile()

  if (!currentProfile) {
    throw new Error('No hay usuario autenticado')
  }

  const profileId = currentProfile.profileId
  const supabase = await createServerSupabaseClient()

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

  const { data: miInscripcion, error: miInscripcionError } = await supabase
    .from('inscripciones')
    .select('id, estado')
    .eq('sesion_id', sesionId)
    .eq('profile_id', profileId)
    .in('estado', ['inscrito', 'lista_espera'])
    .maybeSingle()

  if (miInscripcionError) {
    throw new Error(`No se pudo cargar la inscripción actual: ${miInscripcionError.message}`)
  }

  if (!miInscripcion) {
    return { ok: false, reason: 'not_found' }
  }

  const estadoAnterior = miInscripcion.estado

  const { error: cancelError } = await supabase
    .from('inscripciones')
    .update({
      estado: 'cancelado',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', miInscripcion.id)

  if (cancelError) {
    throw new Error(cancelError.message)
  }

  // Solo promocionar si quien canceló estaba ocupando plaza real
  if (estadoAnterior === 'inscrito') {
    const { data: siguienteEnEspera, error: esperaError } = await supabase
      .from('inscripciones')
      .select('id')
      .eq('sesion_id', sesionId)
      .eq('estado', 'lista_espera')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (esperaError) {
      throw new Error(`No se pudo revisar la lista de espera: ${esperaError.message}`)
    }

    if (siguienteEnEspera) {
      const { error: promoteError } = await supabase
        .from('inscripciones')
        .update({
          estado: 'inscrito',
          updated_at: new Date().toISOString(),
        })
        .eq('id', siguienteEnEspera.id)

      if (promoteError) {
        throw new Error(`No se pudo promocionar desde lista de espera: ${promoteError.message}`)
      }
    }
  }

  revalidatePath('/palista/sesiones')
  return { ok: true }
}
