'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

type NextEstadoSesion =
  | 'abierta_inscripcion'
  | 'cerrada_inscripcion'
  | 'en_planificacion'
  | 'cancelada'

const allowedTransitions: Record<string, string[]> = {
  abierta_inscripcion: ['cerrada_inscripcion', 'cancelada'],
  cerrada_inscripcion: ['abierta_inscripcion', 'en_planificacion', 'cancelada'],
  en_planificacion: ['cerrada_inscripcion', 'cancelada'],
  publicada: ['en_planificacion', 'cancelada'],
  cancelada: ['abierta_inscripcion', 'cerrada_inscripcion'],
}

async function cargarSesion(sesionId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('sesiones')
    .select('id, estado')
    .eq('id', sesionId)
    .single()

  if (error) {
    throw new Error(`No se pudo cargar la sesión: ${error.message}`)
  }

  if (!data) {
    throw new Error('La sesión no existe')
  }

  return { supabase, sesion: data }
}

export async function cambiarEstadoSesion(
  sesionId: string,
  nextEstado: NextEstadoSesion
) {
  await requireRole(['staff'])
  const { supabase, sesion } = await cargarSesion(sesionId)

  const transicionesPermitidas = allowedTransitions[sesion.estado] ?? []

  if (!transicionesPermitidas.includes(nextEstado)) {
    return {
      ok: false as const,
      reason: 'invalid_transition' as const,
      message: 'La transición de estado no está permitida.',
    }
  }

  const ahora = new Date().toISOString()

  const { error } = await supabase
    .from('sesiones')
    .update({
      estado: nextEstado,
      updated_at: ahora,
    })
    .eq('id', sesionId)

  if (error) {
    throw new Error(`No se pudo actualizar la sesión: ${error.message}`)
  }

  revalidatePath('/staff/sesiones')
  revalidatePath(`/staff/sesiones/${sesionId}`)
  revalidatePath(`/staff/sesiones/${sesionId}/barcos`)
  revalidatePath('/palista/sesiones')
  revalidatePath('/palista/barcos')

  return { ok: true as const }
}

async function cargarInscripcionDeSesion(sesionId: string, inscripcionId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('inscripciones')
    .select('id, sesion_id, estado')
    .eq('id', inscripcionId)
    .single()

  if (error) {
    throw new Error(`No se pudo cargar la inscripción: ${error.message}`)
  }

  if (!data || data.sesion_id !== sesionId) {
    throw new Error('La inscripción no pertenece a esta sesión')
  }

  return { supabase, inscripcion: data }
}

export async function marcarInscripcionComoInscrito(
  sesionId: string,
  inscripcionId: string
) {
  await requireRole(['staff'])
  const { sesion } = await cargarSesion(sesionId)

  if (!['abierta_inscripcion', 'cerrada_inscripcion'].includes(sesion.estado)) {
    return {
      ok: false as const,
      reason: 'invalid_session_state' as const,
      message: 'No se pueden modificar inscripciones en el estado actual de la sesión.',
    }
  }

  const { supabase, inscripcion } = await cargarInscripcionDeSesion(sesionId, inscripcionId)

  if (inscripcion.estado === 'inscrito') {
    return { ok: true as const }
  }

  const { error } = await supabase
    .from('inscripciones')
    .update({
      estado: 'inscrito',
      cancelled_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inscripcionId)

  if (error) {
    throw new Error(`No se pudo actualizar la inscripción: ${error.message}`)
  }

  revalidatePath(`/staff/sesiones/${sesionId}`)
  revalidatePath(`/staff/sesiones/${sesionId}/barcos`)
  revalidatePath('/palista/sesiones')

  return { ok: true as const }
}

export async function marcarInscripcionComoListaEspera(
  sesionId: string,
  inscripcionId: string
) {
  await requireRole(['staff'])
  const { sesion } = await cargarSesion(sesionId)

  if (!['abierta_inscripcion', 'cerrada_inscripcion'].includes(sesion.estado)) {
    return {
      ok: false as const,
      reason: 'invalid_session_state' as const,
      message: 'No se pueden modificar inscripciones en el estado actual de la sesión.',
    }
  }

  const { supabase, inscripcion } = await cargarInscripcionDeSesion(sesionId, inscripcionId)

  if (inscripcion.estado === 'lista_espera') {
    return { ok: true as const }
  }

  const { error } = await supabase
    .from('inscripciones')
    .update({
      estado: 'lista_espera',
      cancelled_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inscripcionId)

  if (error) {
    throw new Error(`No se pudo actualizar la inscripción: ${error.message}`)
  }

  revalidatePath(`/staff/sesiones/${sesionId}`)
  revalidatePath(`/staff/sesiones/${sesionId}/barcos`)
  revalidatePath('/palista/sesiones')

  return { ok: true as const }
}

export async function cancelarInscripcionDesdeStaff(
  sesionId: string,
  inscripcionId: string
) {
  await requireRole(['staff'])
  const { sesion } = await cargarSesion(sesionId)

  if (!['abierta_inscripcion', 'cerrada_inscripcion'].includes(sesion.estado)) {
    return {
      ok: false as const,
      reason: 'invalid_session_state' as const,
      message: 'No se pueden modificar inscripciones en el estado actual de la sesión.',
    }
  }

  const { supabase, inscripcion } = await cargarInscripcionDeSesion(sesionId, inscripcionId)

  const ahora = new Date().toISOString()

  const { error } = await supabase
    .from('inscripciones')
    .update({
      estado: 'cancelado',
      cancelled_at: ahora,
      updated_at: ahora,
    })
    .eq('id', inscripcionId)

  if (error) {
    throw new Error(`No se pudo cancelar la inscripción: ${error.message}`)
  }

  if (inscripcion.estado === 'inscrito') {
    await supabase
      .from('asignaciones_barco')
      .delete()
      .eq('inscripcion_id', inscripcionId)

    // Promocionar al siguiente en lista de espera
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

  revalidatePath(`/staff/sesiones/${sesionId}`)
  revalidatePath(`/staff/sesiones/${sesionId}/barcos`)
  revalidatePath('/palista/sesiones')

  return { ok: true as const }
}
