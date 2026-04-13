'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

const editableStates = [
  'abierta_inscripcion',
  'cerrada_inscripcion',
  'en_planificacion',
] as const

function getTextValue(formData: FormData, field: string) {
  const value = formData.get(field)

  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

function getNullableTextValue(formData: FormData, field: string) {
  const value = getTextValue(formData, field)
  return value === '' ? null : value
}

function normalizeDateTimeValue(value: string) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString()
}

function redirectWithError(sesionId: string, message: string): never {
  redirect(
    `/staff/sesiones/${sesionId}/editar?error=${encodeURIComponent(message)}`
  )
}

export async function actualizarSesion(sesionId: string, formData: FormData) {
  await requireRole(['staff'])

  const supabase = await createServerSupabaseClient()

  const { data: sesion, error: sesionError } = await supabase
    .from('sesiones')
    .select('id, estado')
    .eq('id', sesionId)
    .single()

  if (sesionError) {
    throw new Error(`No se pudo cargar la sesion: ${sesionError.message}`)
  }

  if (!sesion) {
    throw new Error('La sesion no existe')
  }

  if (!editableStates.includes(sesion.estado as (typeof editableStates)[number])) {
    redirect(`/staff/sesiones/${sesionId}`)
  }

  const fecha = getTextValue(formData, 'fecha')
  const horaInicio = getTextValue(formData, 'hora_inicio')
  const tipoEntreno = getTextValue(formData, 'tipo_entreno')
  const cierreInscripcionRaw = getTextValue(formData, 'cierre_inscripcion_at')
  const sede = getNullableTextValue(formData, 'sede')
  const notasStaff = getNullableTextValue(formData, 'notas_staff')

  if (!fecha) {
    redirectWithError(sesionId, 'La fecha es obligatoria.')
  }

  if (!horaInicio) {
    redirectWithError(sesionId, 'La hora de inicio es obligatoria.')
  }

  if (!tipoEntreno) {
    redirectWithError(sesionId, 'El tipo de entreno es obligatorio.')
  }

  if (!cierreInscripcionRaw) {
    redirectWithError(sesionId, 'El cierre de inscripcion es obligatorio.')
  }

  const cierreInscripcionAt = normalizeDateTimeValue(cierreInscripcionRaw)

  if (!cierreInscripcionAt) {
    redirectWithError(
      sesionId,
      'El cierre de inscripcion no tiene un formato valido.'
    )
  }

  const { error: updateError } = await supabase
    .from('sesiones')
    .update({
      fecha,
      hora_inicio: horaInicio,
      sede,
      tipo_entreno: tipoEntreno,
      cierre_inscripcion_at: cierreInscripcionAt,
      notas_staff: notasStaff,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sesionId)

  if (updateError) {
    throw new Error(`No se pudo actualizar la sesion: ${updateError.message}`)
  }

  revalidatePath('/staff/sesiones')
  revalidatePath(`/staff/sesiones/${sesionId}`)
  revalidatePath(`/staff/sesiones/${sesionId}/editar`)
  revalidatePath(`/staff/sesiones/${sesionId}/barcos`)
  revalidatePath('/palista/sesiones')
  redirect(`/staff/sesiones/${sesionId}`)
}
