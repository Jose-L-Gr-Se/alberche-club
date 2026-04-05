import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { AccessDenied } from '@/components/auth/AccessDenied'
import { getBoatLayoutConfig } from '@/lib/boats/layout'
import {
  asignarInscripcionABarco,
  crearBarcoDePrueba,
  desasignarInscripcionDeBarco,
  publicarPlanificacionSesion,
} from './actions'
import { PositionEditor } from '@/components/staff/PositionEditor'
import { evaluateAssignmentRules } from '@/lib/crew/assignment-rules'
import { formatSidePreference } from '@/lib/crew/formatters'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function StaffSesionBarcosPage({ params }: PageProps) {
  try {
    await requireRole(['staff'])
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      redirect('/login')
    }
    return (
      <AccessDenied
        title="Sin permisos"
        message="Tu cuenta no tiene permisos para acceder a la zona staff."
      />
    )
  }

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: sesion, error: sesionError } = await supabase
    .from('sesiones')
    .select('id, fecha, tipo_entreno, hora_inicio, sede, estado')
    .eq('id', id)
    .single()

  const { data: inscripciones, error: inscripcionesError } = await supabase
    .from('inscripciones')
    .select(`
      id,
      profile_id,
      estado,
      lado_solicitado,
      prep_rec,
      tipo_hueco
    `)
    .eq('sesion_id', id)
    .eq('estado', 'inscrito')
    .order('created_at', { ascending: true })

  const profileIds = (inscripciones ?? []).map((item) => item.profile_id)

  const { data: profiles, error: profilesError } = profileIds.length
    ? await supabase
        .from('profiles')
        .select('id, nombre, apellidos, peso_kg')
        .in('id', profileIds)
    : { data: [], error: null }

  const profilesMap = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile])
  )

  const inscritosElegibles = (inscripciones ?? []).map((inscripcion) => {
    const rules = evaluateAssignmentRules({
      sesion: {
        tipo_entreno: sesion?.tipo_entreno ?? null,
      },
      inscripcion: {
        lado_solicitado: inscripcion.lado_solicitado ?? null,
        prep_rec: inscripcion.prep_rec ?? null,
        tipo_hueco: inscripcion.tipo_hueco ?? null,
      },
      target: {
        lado: null,
      },
    })

    return {
      ...inscripcion,
      profile: profilesMap.get(inscripcion.profile_id) ?? null,
      rules,
    }
  })

  const { data: barcos, error: barcosError } = await supabase
    .from('barcos')
    .select('id, nombre_visible, tipo_barco, turno, estado, orden_visual')
    .eq('sesion_id', id)
    .order('orden_visual', { ascending: true })

  const barcoIds = (barcos ?? []).map((barco) => barco.id)
  const hayBarcos = !!barcos && barcos.length > 0
  const todosPublicados = hayBarcos && barcos.every((barco) => barco.estado === 'publicado')

  const { data: asignaciones, error: asignacionesError } = barcoIds.length
    ? await supabase
        .from('asignaciones_barco')
        .select('id, barco_id, inscripcion_id, banco, lado')
        .in('barco_id', barcoIds)
    : { data: [], error: null }

  const asignacionesList = asignaciones ?? []
  const asignacionesIncompletas = asignacionesList.filter(
    (item) => item.banco == null || item.lado == null
  )

  const asignacionPorInscripcion = new Map(
    asignacionesList.map((item) => [item.inscripcion_id, item])
  )

  const inscritosPendientes = inscritosElegibles.filter(
    (item: any) => !asignacionPorInscripcion.has(item.id)
  )
  const hayIncoherenciasPlanificacion =
    inscritosPendientes.length > 0 || asignacionesIncompletas.length > 0

  const inscritosMap = new Map(
    inscritosElegibles.map((item: any) => [item.id, item])
  )

  const asignadosPorBarco = new Map<string, any[]>()

  for (const asignacion of asignacionesList) {
    const inscripcion = inscritosMap.get(asignacion.inscripcion_id)
    if (!inscripcion) continue

    const actuales = asignadosPorBarco.get(asignacion.barco_id) ?? []
    actuales.push({
      ...inscripcion,
      asignacion,
    })
    asignadosPorBarco.set(asignacion.barco_id, actuales)
  }

  if (sesionError) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <h1 className="text-xl font-semibold text-gray-900">Planificación de barcos</h1>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error cargando la sesión: {sesionError.message}
        </div>
      </main>
    )
  }

  if (!sesion) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <h1 className="text-xl font-semibold text-gray-900">Planificación de barcos</h1>
        <p className="mt-4 text-sm text-gray-500">La sesión no existe.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/staff/sesiones/${id}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Volver al detalle de sesión
          </Link>

          <h1 className="mt-3 text-2xl font-bold text-gray-900">
            Planificación de barcos
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Base de preparación de barcos para esta sesión
          </p>

          <div className="mt-3">
            {todosPublicados ? (
              <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                Planificación publicada
              </span>
            ) : (
              <span className="rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
                Borrador interno
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-3">
          {!todosPublicados && hayIncoherenciasPlanificacion && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              {inscritosPendientes.length > 0 && (
                <div>Hay inscritos pendientes de asignar.</div>
              )}
              {asignacionesIncompletas.length > 0 && (
                <div>Hay personas asignadas sin banco o sin lado.</div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <form
              action={async () => {
                'use server'
                await crearBarcoDePrueba(id)
              }}
            >
              <button
                type="submit"
                className="rounded-lg bg-black px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
              >
                Crear barco de prueba
              </button>
            </form>

            <form
              action={async () => {
                'use server'
                await publicarPlanificacionSesion(id)
              }}
            >
              <button
                type="submit"
                disabled={
                  !hayBarcos ||
                  todosPublicados ||
                  inscritosPendientes.length > 0 ||
                  asignacionesIncompletas.length > 0
                }
                className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {todosPublicados ? 'Planificación publicada' : 'Cerrar y publicar planificación'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Estado</p>
            <p className="mt-1 text-sm text-gray-900">{sesion.estado}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.2fr_1fr]">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Inscritos elegibles</h2>
            <p className="text-sm text-gray-500">
              Personas con estado <span className="font-medium">inscrito</span> disponibles para planificar barcos
            </p>
          </div>

          {inscripcionesError || profilesError || asignacionesError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Error cargando inscritos:{' '}
              {inscripcionesError?.message || profilesError?.message || asignacionesError?.message}
            </div>
          ) : inscritosPendientes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-6 py-8 text-center text-sm text-gray-500">
              No hay inscritos pendientes de asignar.
            </div>
          ) : !barcos || barcos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-6 py-8 text-center text-sm text-gray-500">
              Crea al menos un barco para poder asignar personas.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Peso</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Lado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Prep/Rec</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Hueco</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inscritosPendientes.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div>
                          {item.profile
                            ? `${item.profile.nombre} ${item.profile.apellidos}`
                            : '—'}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.lado_solicitado && (
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
                              Lado: {formatSidePreference(item.lado_solicitado)}
                            </span>
                          )}
                          {item.prep_rec && (
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
                              Prep/Rec: {item.prep_rec}
                            </span>
                          )}
                          {item.tipo_hueco && (
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
                              Hueco: {item.tipo_hueco}
                            </span>
                          )}
                          {item.rules?.warnings?.length > 0 && (
                            <span className="rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-1 text-xs font-medium text-yellow-700">
                              {item.rules.warnings.length} aviso{item.rules.warnings.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {item.rules?.warnings?.length > 0 && (
                          <p className="mt-2 text-xs text-yellow-700">
                            {item.rules.warnings[0].message}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.profile?.peso_kg ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatSidePreference(item.lado_solicitado)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.prep_rec ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.tipo_hueco ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex flex-wrap gap-2">
                          {barcos.map((barco) => (
                            <form
                              key={barco.id}
                              action={async () => {
                                'use server'
                                await asignarInscripcionABarco(id, item.id, barco.id)
                              }}
                            >
                              <button
                                type="submit"
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                Asignar a {barco.nombre_visible ?? 'barco'}
                              </button>
                            </form>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Barcos creados</h2>
            <p className="text-sm text-gray-500">
              Estructura inicial de planificación para esta sesión
            </p>
          </div>

          {barcosError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Error cargando barcos: {barcosError.message}
            </div>
          ) : !barcos || barcos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-6 py-8 text-center text-sm text-gray-500">
              Todavía no hay barcos creados.
            </div>
          ) : (
            <div className="grid gap-3">
              {barcos.map((barco) => {
                const asignados = [...(asignadosPorBarco.get(barco.id) ?? [])].sort((a: any, b: any) => {
                  const bancoA = a.asignacion?.banco ?? Number.MAX_SAFE_INTEGER
                  const bancoB = b.asignacion?.banco ?? Number.MAX_SAFE_INTEGER

                  if (bancoA !== bancoB) return bancoA - bancoB

                  const ladoOrden = (lado?: string | null) => {
                    if (lado === 'izquierda') return 0
                    if (lado === 'derecha') return 1
                    return 2
                  }

                  const ladoA = ladoOrden(a.asignacion?.lado)
                  const ladoB = ladoOrden(b.asignacion?.lado)

                  if (ladoA !== ladoB) return ladoA - ladoB

                  const nombreA = a.profile
                    ? `${a.profile.nombre} ${a.profile.apellidos}`
                    : ''
                  const nombreB = b.profile
                    ? `${b.profile.nombre} ${b.profile.apellidos}`
                    : ''

                  return nombreA.localeCompare(nombreB)
                })

                const layout = getBoatLayoutConfig(barco.tipo_barco)

                const maxBancoAsignado =
                  asignados.length > 0
                    ? Math.max(
                        ...asignados.map((item: any) => item.asignacion?.banco ?? 0)
                      )
                    : 0

                const totalBancos = Math.max(layout.maxBancos, maxBancoAsignado)

                const filas = Array.from({ length: totalBancos }, (_, index) => {
                  const banco = index + 1

                  const izquierda =
                    asignados.find(
                      (item: any) =>
                        item.asignacion?.banco === banco &&
                        item.asignacion?.lado === 'izquierda'
                    ) ?? null

                  const derecha =
                    asignados.find(
                      (item: any) =>
                        item.asignacion?.banco === banco &&
                        item.asignacion?.lado === 'derecha'
                    ) ?? null

                  return {
                    banco,
                    izquierda,
                    derecha,
                  }
                })

                return (
                  <div
                    key={barco.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
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

                    <div className="mt-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Distribución del barco
                      </p>

                      <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
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
                                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
                                  <div className="font-medium">
                                    {fila.izquierda.profile
                                      ? `${fila.izquierda.profile.nombre} ${fila.izquierda.profile.apellidos}`
                                      : 'Palista'}
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
                                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
                                  <div className="font-medium">
                                    {fila.derecha.profile
                                      ? `${fila.derecha.profile.nombre} ${fila.derecha.profile.apellidos}`
                                      : 'Palista'}
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

                    <div className="mt-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Asignados
                      </p>

                      {asignados.length === 0 ? (
                        <p className="mt-2 text-sm text-gray-500">Todavía no hay personas asignadas.</p>
                      ) : (
                        <div className="mt-2 grid gap-2">
                          {asignados.map((item: any) => {
                            const assignmentRules = evaluateAssignmentRules({
                              sesion: {
                                tipo_entreno: sesion.tipo_entreno ?? null,
                              },
                              inscripcion: {
                                lado_solicitado: item.lado_solicitado ?? null,
                                prep_rec: item.prep_rec ?? null,
                                tipo_hueco: item.tipo_hueco ?? null,
                              },
                              target: {
                                lado: item.asignacion?.lado ?? null,
                              },
                            })

                            return (
                            <div
                              key={item.id}
                              className="rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700"
                            >
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {item.profile
                                      ? `${item.profile.nombre} ${item.profile.apellidos}`
                                      : 'Palista sin perfil'}
                                  </p>
                                  <p className="mt-1 text-sm text-gray-600">
                                    {item.profile?.peso_kg ?? '—'} kg · preferencia lado: {formatSidePreference(item.lado_solicitado)}
                                  </p>
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
                                      {item.asignacion?.banco ? `Banco ${item.asignacion.banco}` : 'Sin banco'}
                                    </span>
                                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
                                      {item.asignacion?.lado ?? 'Sin lado'}
                                    </span>
                                  </div>
                                  {assignmentRules.warnings.length > 0 && (
                                    <div className="mt-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
                                      {assignmentRules.warnings[0].message}
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-col gap-2">
                                  <PositionEditor
                                    sesionId={id}
                                    inscripcionId={item.id}
                                    defaultBanco={item.asignacion?.banco ?? null}
                                    defaultLado={item.asignacion?.lado ?? null}
                                  />

                                  <form
                                    action={async () => {
                                      'use server'
                                      await desasignarInscripcionDeBarco(id, item.id)
                                    }}
                                  >
                                    <button
                                      type="submit"
                                      className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                                    >
                                      Quitar
                                    </button>
                                  </form>
                                </div>
                              </div>
                            </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
