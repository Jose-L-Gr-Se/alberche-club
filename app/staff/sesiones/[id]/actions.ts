'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

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
  }

  revalidatePath(`/staff/sesiones/${sesionId}`)
  revalidatePath(`/staff/sesiones/${sesionId}/barcos`)
  revalidatePath('/palista/sesiones')

  return { ok: true as const }
}
