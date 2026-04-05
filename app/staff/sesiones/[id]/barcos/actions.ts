'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { getBoatLayoutConfig } from '@/lib/boats/layout'
import { evaluateAssignmentRules } from '@/lib/crew/assignment-rules'

async function validarSesionEnPlanificacion(sesionId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: sesion, error } = await supabase
    .from('sesiones')
    .select('id, estado')
    .eq('id', sesionId)
    .single()

  if (error) {
    throw new Error(`No se pudo cargar la sesión: ${error.message}`)
  }

  if (!sesion) {
    throw new Error('La sesión no existe')
  }

  if (sesion.estado !== 'en_planificacion') {
    return {
      ok: false as const,
      reason: 'invalid_session_state' as const,
      message: 'Solo se pueden gestionar barcos cuando la sesión está en planificación.',
    }
  }

  return { ok: true as const }
}

async function reordenarBarcosDeSesion(sesionId: string) {
  const supabase = await createServerSupabaseClient()

  const { data: barcos, error } = await supabase
    .from('barcos')
    .select('id')
    .eq('sesion_id', sesionId)
    .order('orden_visual', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`No se pudieron cargar los barcos para reordenar: ${error.message}`)
  }

  const updates = (barcos ?? []).map((barco, index) => ({
    id: barco.id,
    orden_visual: index + 1,
    nombre_visible: `Barco ${index + 1}`,
    updated_at: new Date().toISOString(),
  }))

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('barcos')
      .update({
        orden_visual: update.orden_visual,
        nombre_visible: update.nombre_visible,
        updated_at: update.updated_at,
      })
      .eq('id', update.id)

    if (updateError) {
      throw new Error(`No se pudo reordenar un barco: ${updateError.message}`)
    }
  }
}

export async function crearBarco(sesionId: string) {
  await requireRole(['staff'])
  const stateCheck = await validarSesionEnPlanificacion(sesionId)
  if (!stateCheck.ok) return stateCheck

  const supabase = await createServerSupabaseClient()

  const { data: barcosExistentes, error: existentesError } = await supabase
    .from('barcos')
    .select('orden_visual')
    .eq('sesion_id', sesionId)
    .order('orden_visual', { ascending: false })
    .limit(1)

  if (existentesError) {
    throw new Error(`No se pudo consultar los barcos existentes: ${existentesError.message}`)
  }

  const orden = (barcosExistentes?.[0]?.orden_visual ?? 0) + 1

  const { error } = await supabase.from('barcos').insert({
    sesion_id: sesionId,
    nombre_visible: `Barco ${orden}`,
    tipo_barco: 'BD12',
    turno: 1,
    estado: 'borrador',
    orden_visual: orden,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/staff/sesiones/${sesionId}/barcos`)
}

export async function eliminarBarco(sesionId: string, barcoId: string) {
  await requireRole(['staff'])
  const stateCheck = await validarSesionEnPlanificacion(sesionId)
  if (!stateCheck.ok) return stateCheck

  const supabase = await createServerSupabaseClient()

  const { data: barco, error: barcoError } = await supabase
    .from('barcos')
    .select('id, sesion_id, estado')
    .eq('id', barcoId)
    .single()

  if (barcoError) {
    throw new Error(`No se pudo cargar el barco: ${barcoError.message}`)
  }

  if (!barco || barco.sesion_id !== sesionId) {
    throw new Error('El barco no pertenece a esta sesión')
  }

  const { data: asignaciones, error: asignacionesError } = await supabase
    .from('asignaciones_barco')
    .select('id')
    .eq('barco_id', barcoId)
    .limit(1)

  if (asignacionesError) {
    throw new Error(`No se pudieron comprobar las asignaciones del barco: ${asignacionesError.message}`)
  }

  if ((asignaciones ?? []).length > 0) {
    return {
      ok: false as const,
      reason: 'boat_has_assignments' as const,
      message: 'No puedes borrar un barco que tiene personas asignadas.',
    }
  }

  const { error: deleteError } = await supabase
    .from('barcos')
    .delete()
    .eq('id', barcoId)

  if (deleteError) {
    throw new Error(`No se pudo borrar el barco: ${deleteError.message}`)
  }

  await reordenarBarcosDeSesion(sesionId)

  revalidatePath(`/staff/sesiones/${sesionId}/barcos`)
  revalidatePath(`/staff/sesiones/${sesionId}`)

  return { ok: true as const }
}

export async function asignarInscripcionABarco(
  sesionId: string,
  inscripcionId: string,
  barcoId: string
) {
  await requireRole(['staff'])
  const stateCheck = await validarSesionEnPlanificacion(sesionId)
  if (!stateCheck.ok) return stateCheck

  const supabase = await createServerSupabaseClient()

  const { data: inscripcion, error: inscripcionError } = await supabase
    .from('inscripciones')
    .select('id, sesion_id, estado')
    .eq('id', inscripcionId)
    .single()

  if (inscripcionError) {
    throw new Error(`No se pudo cargar la inscripción: ${inscripcionError.message}`)
  }

  if (!inscripcion || inscripcion.sesion_id !== sesionId) {
    throw new Error('La inscripción no pertenece a esta sesión')
  }

  if (inscripcion.estado !== 'inscrito') {
    throw new Error('Solo se pueden asignar inscripciones confirmadas')
  }

  const { data: barco, error: barcoError } = await supabase
    .from('barcos')
    .select('id, sesion_id')
    .eq('id', barcoId)
    .single()

  if (barcoError) {
    throw new Error(`No se pudo cargar el barco: ${barcoError.message}`)
  }

  if (!barco || barco.sesion_id !== sesionId) {
    throw new Error('El barco no pertenece a esta sesión')
  }

  const { error } = await supabase
    .from('asignaciones_barco')
    .upsert(
      {
        inscripcion_id: inscripcionId,
        barco_id: barcoId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'inscripcion_id',
      }
    )

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/staff/sesiones/${sesionId}/barcos`)
}

export async function desasignarInscripcionDeBarco(
  sesionId: string,
  inscripcionId: string
) {
  await requireRole(['staff'])
  const stateCheck = await validarSesionEnPlanificacion(sesionId)
  if (!stateCheck.ok) return stateCheck

  const supabase = await createServerSupabaseClient()

  const { data: inscripcion, error: inscripcionError } = await supabase
    .from('inscripciones')
    .select('id, sesion_id, estado')
    .eq('id', inscripcionId)
    .single()

  if (inscripcionError) {
    throw new Error(`No se pudo cargar la inscripción: ${inscripcionError.message}`)
  }

  if (!inscripcion || inscripcion.sesion_id !== sesionId) {
    throw new Error('La inscripción no pertenece a esta sesión')
  }

  const { error } = await supabase
    .from('asignaciones_barco')
    .delete()
    .eq('inscripcion_id', inscripcionId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/staff/sesiones/${sesionId}/barcos`)
}

export async function actualizarPosicionAsignacion(
  sesionId: string,
  inscripcionId: string,
  banco: number | null,
  lado: 'izquierda' | 'derecha' | null
) {
  await requireRole(['staff'])
  const stateCheck = await validarSesionEnPlanificacion(sesionId)
  if (!stateCheck.ok) return stateCheck

  const supabase = await createServerSupabaseClient()

  if (banco !== null && (!Number.isInteger(banco) || banco < 1)) {
    return { ok: false as const, reason: 'invalid_bank' as const }
  }

  if (lado !== null && lado !== 'izquierda' && lado !== 'derecha') {
    return { ok: false as const, reason: 'invalid_side' as const }
  }

  const { data: inscripcion, error: inscripcionError } = await supabase
    .from('inscripciones')
    .select('id, sesion_id, lado_solicitado, prep_rec, tipo_hueco')
    .eq('id', inscripcionId)
    .single()

  if (inscripcionError) {
    return {
      ok: false as const,
      reason: 'unknown' as const,
      message: `No se pudo cargar la inscripción: ${inscripcionError.message}`,
    }
  }

  if (!inscripcion || inscripcion.sesion_id !== sesionId) {
    return { ok: false as const, reason: 'invalid_session' as const }
  }

  const { data: sesion, error: sesionError } = await supabase
    .from('sesiones')
    .select('id, tipo_entreno')
    .eq('id', sesionId)
    .single()

  if (sesionError || !sesion) {
    return {
      ok: false as const,
      reason: 'unknown' as const,
      message: `No se pudo cargar la sesión: ${sesionError?.message ?? 'sin datos'}`,
    }
  }

  let rules: ReturnType<typeof evaluateAssignmentRules> | undefined

  if (banco !== null && lado !== null) {
    const { data: asignacionActual, error: asignacionActualError } = await supabase
      .from('asignaciones_barco')
      .select('id, barco_id')
      .eq('inscripcion_id', inscripcionId)
      .single()

    if (asignacionActualError) {
      return {
        ok: false as const,
        reason: 'unknown' as const,
        message: `No se pudo cargar la asignación actual: ${asignacionActualError.message}`,
      }
    }

    const { data: barcoActual, error: barcoActualError } = await supabase
      .from('barcos')
      .select('id, tipo_barco')
      .eq('id', asignacionActual.barco_id)
      .single()

    if (barcoActualError || !barcoActual) {
      return {
        ok: false as const,
        reason: 'unknown' as const,
        message: `No se pudo cargar el barco actual: ${barcoActualError?.message ?? 'sin datos'}`,
      }
    }

    const layout = getBoatLayoutConfig(barcoActual.tipo_barco)

    if (banco !== null && banco > layout.maxBancos) {
      return {
        ok: false as const,
        reason: 'invalid_bank' as const,
        message: `El banco máximo permitido para ${barcoActual.tipo_barco} es ${layout.maxBancos}`,
      }
    }

    const { data: colision, error: colisionError } = await supabase
      .from('asignaciones_barco')
      .select('id')
      .eq('barco_id', asignacionActual.barco_id)
      .eq('banco', banco)
      .eq('lado', lado)
      .neq('inscripcion_id', inscripcionId)
      .maybeSingle()

    if (colisionError) {
      return {
        ok: false as const,
        reason: 'unknown' as const,
        message: `No se pudo comprobar la ocupación del asiento: ${colisionError.message}`,
      }
    }

    if (colision) {
      return { ok: false as const, reason: 'seat_taken' as const }
    }

    rules = evaluateAssignmentRules({
      sesion: {
        tipo_entreno: sesion.tipo_entreno ?? null,
      },
      inscripcion: {
        lado_solicitado: inscripcion.lado_solicitado ?? null,
        prep_rec: inscripcion.prep_rec ?? null,
        tipo_hueco: inscripcion.tipo_hueco ?? null,
      },
      target: {
        lado,
      },
    })

    if (!rules.ok) {
      return {
        ok: false as const,
        reason: 'rule_violation' as const,
        message: rules.errors.map((item) => item.message).join(' '),
        issues: rules,
      }
    }
  }

  const { error } = await supabase
    .from('asignaciones_barco')
    .update({
      banco,
      lado,
      updated_at: new Date().toISOString(),
    })
    .eq('inscripcion_id', inscripcionId)

  if (error) {
    return {
      ok: false as const,
      reason: 'unknown' as const,
      message: error.message,
    }
  }

  revalidatePath(`/staff/sesiones/${sesionId}/barcos`)
  return {
    ok: true as const,
    issues: rules,
  }
}

export async function pasarSesionAPlanificacion(sesionId: string) {
  await requireRole(['staff'])

  const supabase = await createServerSupabaseClient()

  const { data: sesion, error: sesionError } = await supabase
    .from('sesiones')
    .select('id, estado')
    .eq('id', sesionId)
    .single()

  if (sesionError) {
    throw new Error(`No se pudo cargar la sesión: ${sesionError.message}`)
  }

  if (!sesion) {
    throw new Error('La sesión no existe.')
  }

  if (
    sesion.estado !== 'abierta_inscripcion' &&
    sesion.estado !== 'cerrada_inscripcion'
  ) {
    return {
      ok: false as const,
      reason: 'invalid_session_state' as const,
      message: 'La sesión debe estar en inscripción abierta o cerrada para pasar a planificación.',
    }
  }

  const ahora = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('sesiones')
    .update({
      estado: 'en_planificacion',
      updated_at: ahora,
    })
    .eq('id', sesionId)

  if (updateError) {
    throw new Error(`No se pudo actualizar la sesión: ${updateError.message}`)
  }

  revalidatePath('/staff/sesiones')
  revalidatePath(`/staff/sesiones/${sesionId}`)
  revalidatePath(`/staff/sesiones/${sesionId}/barcos`)

  return { ok: true as const }
}

export async function publicarPlanificacionSesion(sesionId: string) {
  await requireRole(['staff'])

  const supabase = await createServerSupabaseClient()

  const { data: sesion, error: sesionLoadError } = await supabase
    .from('sesiones')
    .select('id, estado')
    .eq('id', sesionId)
    .single()

  if (sesionLoadError) {
    throw new Error(`No se pudo cargar la sesión: ${sesionLoadError.message}`)
  }

  if (!sesion || sesion.estado !== 'en_planificacion') {
    return {
      ok: false as const,
      reason: 'invalid_session_state' as const,
      message: 'La sesión debe estar en planificación antes de publicarse.',
    }
  }

  const { data: barcos, error: barcosError } = await supabase
    .from('barcos')
    .select('id')
    .eq('sesion_id', sesionId)

  if (barcosError) {
    throw new Error(`No se pudieron cargar los barcos: ${barcosError.message}`)
  }

  if (!barcos || barcos.length === 0) {
    return { ok: false as const, reason: 'no_boats' as const }
  }

  const barcoIds = barcos.map((barco) => barco.id)

  const { data: asignaciones, error: asignacionesError } = await supabase
    .from('asignaciones_barco')
    .select('id, inscripcion_id, barco_id, banco, lado')
    .in('barco_id', barcoIds)

  if (asignacionesError) {
    throw new Error(`No se pudieron cargar las asignaciones: ${asignacionesError.message}`)
  }

  const { data: inscritos, error: inscritosError } = await supabase
    .from('inscripciones')
    .select('id')
    .eq('sesion_id', sesionId)
    .eq('estado', 'inscrito')

  if (inscritosError) {
    throw new Error(`No se pudieron cargar las inscripciones: ${inscritosError.message}`)
  }

  const inscritosIds = new Set((inscritos ?? []).map((item) => item.id))
  const asignadosIds = new Set((asignaciones ?? []).map((item) => item.inscripcion_id))

  const inscritosSinAsignar = [...inscritosIds].filter((id) => !asignadosIds.has(id))

  if (inscritosSinAsignar.length > 0) {
    return {
      ok: false as const,
      reason: 'unassigned_inscripciones' as const,
      message: 'Hay personas inscritas sin asignar a ningún barco.',
    }
  }

  const asignacionesIncompletas = (asignaciones ?? []).filter(
    (item) => item.banco === null || item.lado === null
  )

  if (asignacionesIncompletas.length > 0) {
    return {
      ok: false as const,
      reason: 'incomplete_assignments' as const,
      message: 'Hay asignaciones sin banco o sin lado.',
    }
  }

  const ahora = new Date().toISOString()

  const { error: publishError } = await supabase
    .from('barcos')
    .update({
      estado: 'publicado',
      updated_at: ahora,
    })
    .eq('sesion_id', sesionId)

  if (publishError) {
    throw new Error(`No se pudo publicar la planificación: ${publishError.message}`)
  }

  const { error: sesionError } = await supabase
    .from('sesiones')
    .update({
      estado: 'publicada',
      publicada_at: ahora,
      updated_at: ahora,
    })
    .eq('id', sesionId)

  if (sesionError) {
    throw new Error(`No se pudo actualizar la sesión: ${sesionError.message}`)
  }

  revalidatePath(`/staff/sesiones/${sesionId}/barcos`)
  revalidatePath('/palista/barcos')
  revalidatePath('/palista/sesiones')

  return { ok: true as const }
}
