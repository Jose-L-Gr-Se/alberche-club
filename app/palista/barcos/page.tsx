import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'

type Sesion = {
  id: string
  fecha: string
  tipo_entreno: string
  hora_inicio: string
  sede: string | null
}

export default async function PalistaBarcosPage() {
  const currentProfile = await getCurrentProfile()

  if (!currentProfile) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Mis barcos</h1>
        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Debes iniciar sesión para ver tus barcos.
        </div>
      </main>
    )
  }

  const profileId = currentProfile.profileId
  const supabase = await createServerSupabaseClient()

  // 1. Mis inscripciones confirmadas
  const { data: misInscripciones, error: misInscripcionesError } = await supabase
    .from('inscripciones')
    .select('id, sesion_id')
    .eq('profile_id', profileId)
    .eq('estado', 'inscrito')

  if (misInscripcionesError) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Mis barcos</h1>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error cargando tus inscripciones: {misInscripcionesError.message}
        </div>
      </main>
    )
  }

  const misInscripcionIds = (misInscripciones ?? []).map((item) => item.id)

  if (misInscripcionIds.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Mis barcos</h1>
        <p className="mt-2 text-sm text-gray-600">
          Aquí verás los barcos publicados de las sesiones en las que estés asignado.
        </p>
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-500">
          Todavía no tienes inscripciones confirmadas.
        </div>
      </main>
    )
  }

  // 2. Mis asignaciones a barcos
  const { data: misAsignaciones, error: misAsignacionesError } = await supabase
    .from('asignaciones_barco')
    .select('id, barco_id, inscripcion_id')
    .in('inscripcion_id', misInscripcionIds)

  if (misAsignacionesError) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Mis barcos</h1>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error cargando tus asignaciones: {misAsignacionesError.message}
        </div>
      </main>
    )
  }

  const misBarcoIds = [...new Set((misAsignaciones ?? []).map((item) => item.barco_id))]

  if (misBarcoIds.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Mis barcos</h1>
        <p className="mt-2 text-sm text-gray-600">
          Aquí verás los barcos publicados de las sesiones en las que estés asignado.
        </p>
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-500">
          Aún no estás asignado a ningún barco.
        </div>
      </main>
    )
  }

  // 3. Mis barcos publicados para obtener sus sesiones
  const { data: misBarcosPublicados, error: misBarcosPublicadosError } = await supabase
    .from('barcos')
    .select('id, sesion_id')
    .in('id', misBarcoIds)
    .eq('estado', 'publicado')

  if (misBarcosPublicadosError) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Mis barcos</h1>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error cargando barcos publicados: {misBarcosPublicadosError.message}
        </div>
      </main>
    )
  }

  const sesionIds = [...new Set((misBarcosPublicados ?? []).map((item) => item.sesion_id))]

  if (sesionIds.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Mis barcos</h1>
        <p className="mt-2 text-sm text-gray-600">
          Aquí verás los barcos publicados de las sesiones en las que estés asignado.
        </p>
        <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-500">
          Aún no hay barcos publicados para ti.
        </div>
      </main>
    )
  }

  // 4. Sesiones publicadas donde aparezco
  const { data: sesiones, error: sesionesError } = await supabase
    .from('sesiones')
    .select('id, fecha, tipo_entreno, hora_inicio, sede')
    .in('id', sesionIds)
    .order('fecha', { ascending: true })

  // 5. Todos los barcos publicados de esas sesiones
  const { data: barcos, error: barcosError } = await supabase
    .from('barcos')
    .select('id, sesion_id, nombre_visible, tipo_barco, turno, estado, orden_visual')
    .in('sesion_id', sesionIds)
    .eq('estado', 'publicado')
    .order('orden_visual', { ascending: true })

  if (sesionesError || barcosError) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Mis barcos</h1>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error cargando la planificación publicada:{' '}
          {sesionesError?.message || barcosError?.message}
        </div>
      </main>
    )
  }

  const barcoIds = (barcos ?? []).map((barco) => barco.id)

  // 6. Asignaciones de esos barcos
  const { data: asignaciones, error: asignacionesError } = await supabase
    .from('asignaciones_barco')
    .select('id, barco_id, inscripcion_id, banco, lado')
    .in('barco_id', barcoIds)

  if (asignacionesError) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Mis barcos</h1>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error cargando asignaciones: {asignacionesError.message}
        </div>
      </main>
    )
  }

  const inscripcionIds = [...new Set((asignaciones ?? []).map((item) => item.inscripcion_id))]

  // 7. Inscripciones de esas asignaciones
  const { data: inscripciones, error: inscripcionesError } = await supabase
    .from('inscripciones')
    .select('id, profile_id')
    .in('id', inscripcionIds)

  if (inscripcionesError) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Mis barcos</h1>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error cargando inscripciones del barco: {inscripcionesError.message}
        </div>
      </main>
    )
  }

  const profileIds = [...new Set((inscripciones ?? []).map((item) => item.profile_id))]

  // 8. Profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, nombre, apellidos, peso_kg')
    .in('id', profileIds)

  if (profilesError) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Mis barcos</h1>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error cargando perfiles del barco: {profilesError.message}
        </div>
      </main>
    )
  }

  const inscripcionesMap = new Map((inscripciones ?? []).map((item) => [item.id, item]))
  const profilesMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

  const asignacionesConPerfil = (asignaciones ?? []).map((asignacion) => {
    const inscripcion = inscripcionesMap.get(asignacion.inscripcion_id)
    const profile = inscripcion ? profilesMap.get(inscripcion.profile_id) : null

    return {
      ...asignacion,
      inscripcion,
      profile,
      esYo: inscripcion?.profile_id === profileId,
    }
  })

  const asignadosPorBarco = new Map<string, any[]>()

  for (const asignacion of asignacionesConPerfil) {
    const actuales = asignadosPorBarco.get(asignacion.barco_id) ?? []
    actuales.push(asignacion)
    asignadosPorBarco.set(asignacion.barco_id, actuales)
  }

  const barcosPorSesion = new Map<string, any[]>()

  for (const barco of barcos ?? []) {
    const actuales = barcosPorSesion.get(barco.sesion_id) ?? []
    actuales.push(barco)
    barcosPorSesion.set(barco.sesion_id, actuales)
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mis barcos</h1>
        <p className="mt-2 text-sm text-gray-600">
          Aquí puedes ver la planificación publicada de las sesiones en las que apareces.
        </p>
      </div>

      <div className="grid gap-8">
        {(sesiones ?? []).map((sesion: Sesion) => {
          const barcosSesion = barcosPorSesion.get(sesion.id) ?? []

          return (
            <section
              key={sesion.id}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Fecha</p>
                  <p className="mt-1 text-sm text-gray-900">{sesion.fecha}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Entreno</p>
                  <p className="mt-1 text-sm text-gray-900">{sesion.tipo_entreno}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Hora</p>
                  <p className="mt-1 text-sm text-gray-900">{sesion.hora_inicio}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Sede</p>
                  <p className="mt-1 text-sm text-gray-900">{sesion.sede ?? '—'}</p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {barcosSesion.map((barco: any) => {
                  const asignados = [...(asignadosPorBarco.get(barco.id) ?? [])].sort((a: any, b: any) => {
                    const bancoA = a.banco ?? Number.MAX_SAFE_INTEGER
                    const bancoB = b.banco ?? Number.MAX_SAFE_INTEGER

                    if (bancoA !== bancoB) return bancoA - bancoB

                    const ladoOrden = (lado?: string | null) => {
                      if (lado === 'izquierda') return 0
                      if (lado === 'derecha') return 1
                      return 2
                    }

                    const ladoA = ladoOrden(a.lado)
                    const ladoB = ladoOrden(b.lado)

                    if (ladoA !== ladoB) return ladoA - ladoB

                    const nombreA = a.profile
                      ? `${a.profile.nombre} ${a.profile.apellidos}`
                      : ''
                    const nombreB = b.profile
                      ? `${b.profile.nombre} ${b.profile.apellidos}`
                      : ''

                    return nombreA.localeCompare(nombreB)
                  })

                  const maxBancoAsignado =
                    asignados.length > 0
                      ? Math.max(...asignados.map((item: any) => item.banco ?? 0))
                      : 0

                  const totalBancos = Math.max(5, maxBancoAsignado)

                  const filas = Array.from({ length: totalBancos }, (_, index) => {
                    const banco = index + 1

                    const izquierda =
                      asignados.find(
                        (item: any) => item.banco === banco && item.lado === 'izquierda'
                      ) ?? null

                    const derecha =
                      asignados.find(
                        (item: any) => item.banco === banco && item.lado === 'derecha'
                      ) ?? null

                    return { banco, izquierda, derecha }
                  })

                  return (
                    <div
                      key={barco.id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {barco.nombre_visible ?? 'Barco sin nombre'}
                          </p>
                          <p className="mt-1 text-sm text-gray-600">
                            {barco.tipo_barco} · Turno {barco.turno ?? '—'}
                          </p>
                        </div>

                        <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600">
                          {barco.estado}
                        </span>
                      </div>

                      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <div className="grid grid-cols-[80px_1fr_1fr] border-b border-gray-200 bg-gray-50">
                          <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                            Banco
                          </div>
                          <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                            Izquierda
                          </div>
                          <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                            Derecha
                          </div>
                        </div>

                        {filas.map((fila) => (
                          <div
                            key={fila.banco}
                            className="grid grid-cols-[80px_1fr_1fr] border-b border-gray-100 last:border-b-0"
                          >
                            <div className="px-3 py-3 text-sm font-medium text-gray-700">
                              {fila.banco}
                            </div>

                            <div className="border-l border-gray-100 px-3 py-3">
                              {fila.izquierda ? (
                                <div
                                  className={`rounded-md border px-3 py-2 text-sm ${
                                    fila.izquierda.esYo
                                      ? 'border-green-300 bg-green-50 text-green-900'
                                      : 'border-gray-200 bg-gray-50 text-gray-800'
                                  }`}
                                >
                                  <div className="font-medium">
                                    {fila.izquierda.profile
                                      ? `${fila.izquierda.profile.nombre} ${fila.izquierda.profile.apellidos}`
                                      : 'Palista'}
                                    {fila.izquierda.esYo ? ' · Tú' : ''}
                                  </div>
                                  <div className="mt-1 text-xs text-gray-500">
                                    {fila.izquierda.profile?.peso_kg ?? '—'} kg
                                  </div>
                                </div>
                              ) : (
                                <div className="rounded-md border border-dashed border-gray-200 px-3 py-2 text-sm text-gray-400">
                                  Vacío
                                </div>
                              )}
                            </div>

                            <div className="border-l border-gray-100 px-3 py-3">
                              {fila.derecha ? (
                                <div
                                  className={`rounded-md border px-3 py-2 text-sm ${
                                    fila.derecha.esYo
                                      ? 'border-green-300 bg-green-50 text-green-900'
                                      : 'border-gray-200 bg-gray-50 text-gray-800'
                                  }`}
                                >
                                  <div className="font-medium">
                                    {fila.derecha.profile
                                      ? `${fila.derecha.profile.nombre} ${fila.derecha.profile.apellidos}`
                                      : 'Palista'}
                                    {fila.derecha.esYo ? ' · Tú' : ''}
                                  </div>
                                  <div className="mt-1 text-xs text-gray-500">
                                    {fila.derecha.profile?.peso_kg ?? '—'} kg
                                  </div>
                                </div>
                              ) : (
                                <div className="rounded-md border border-dashed border-gray-200 px-3 py-2 text-sm text-gray-400">
                                  Vacío
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
