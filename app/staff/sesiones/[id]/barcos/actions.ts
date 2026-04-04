'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { getBoatLayoutConfig } from '@/lib/boats/layout'
import { evaluateAssignmentRules } from '@/lib/crew/assignment-rules'

export async function crearBarcoDePrueba(sesionId: string) {
  await requireRole(['staff'])

  const supabase = await createServerSupabaseClient()

  const { count, error: existentesError } = await supabase
    .from('barcos')
    .select('*', { count: 'exact', head: true })
    .eq('sesion_id', sesionId)

  if (existentesError) {
    throw new Error(`No se pudo consultar los barcos existentes: ${existentesError.message}`)
  }

  const orden = (count ?? 0) + 1

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

export async function asignarInscripcionABarco(
  sesionId: string,
  inscripcionId: string,
  barcoId: string
) {
  await requireRole(['staff'])

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

export async function publicarPlanificacionSesion(sesionId: string) {
  await requireRole(['staff'])

  const supabase = await createServerSupabaseClient()

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
