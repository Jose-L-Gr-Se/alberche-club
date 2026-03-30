'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function crearBarcoDePrueba(sesionId: string) {
  const supabase = createServerSupabaseClient()

  const { data: existentes, error: existentesError } = await supabase
    .from('barcos')
    .select('id', { count: 'exact' })
    .eq('sesion_id', sesionId)

  if (existentesError) {
    throw new Error(`No se pudo consultar los barcos existentes: ${existentesError.message}`)
  }

  const orden = (existentes?.length ?? 0) + 1

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
