'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const TEST_PROFILE_ID = 'e1830ea3-0941-4dd1-be68-aeba91d3cfbf'

export async function createTestInscripcion(sesionId: string) {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('inscripciones').insert({
    sesion_id: sesionId,
    profile_id: TEST_PROFILE_ID,
    estado: 'inscrito',
    lado_solicitado: 'i',
    prep_rec: 'prep',
    tipo_hueco: 'veterano',
    observaciones: 'Inscripción creada desde la app',
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/staff/sesiones/${sesionId}`)
}
