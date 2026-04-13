'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

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

function redirectWithError(message: string): never {
  redirect(`/staff/sesiones/nueva?error=${encodeURIComponent(message)}`)
}

export async function crearSesion(formData: FormData) {
  await requireRole(['staff'])

  const fecha = getTextValue(formData, 'fecha')
  const horaInicio = getTextValue(formData, 'hora_inicio')
  const tipoEntreno = getTextValue(formData, 'tipo_entreno')
  const cierreInscripcionRaw = getTextValue(formData, 'cierre_inscripcion_at')
  const sede = getNullableTextValue(formData, 'sede')
  const notasStaff = getNullableTextValue(formData, 'notas_staff')

  if (!fecha) {
    redirectWithError('La fecha es obligatoria.')
  }

  if (!horaInicio) {
    redirectWithError('La hora de inicio es obligatoria.')
  }

  if (!tipoEntreno) {
    redirectWithError('El tipo de entreno es obligatorio.')
  }

  if (!cierreInscripcionRaw) {
    redirectWithError('El cierre de inscripcion es obligatorio.')
  }

  const cierreInscripcionAt = normalizeDateTimeValue(cierreInscripcionRaw)

  if (!cierreInscripcionAt) {
    redirectWithError('El cierre de inscripcion no tiene un formato valido.')
  }

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('sesiones')
    .insert({
      fecha,
      hora_inicio: horaInicio,
      sede,
      tipo_entreno: tipoEntreno,
      cierre_inscripcion_at: cierreInscripcionAt,
      notas_staff: notasStaff,
      estado: 'abierta_inscripcion',
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`No se pudo crear la sesion: ${error.message}`)
  }

  revalidatePath('/staff/sesiones')
  redirect(`/staff/sesiones/${data.id}`)
}
