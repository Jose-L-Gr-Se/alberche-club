import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  cambiarEstadoSesion,
  cancelarInscripcionDesdeStaff,
  marcarInscripcionComoInscrito,
  marcarInscripcionComoListaEspera,
} from './actions'
import { requireRole } from '@/lib/auth/require-role'
import { AccessDenied } from '@/components/auth/AccessDenied'
import { formatSidePreference } from '@/lib/crew/formatters'

type PageProps = {
  params: Promise<{ id: string }>
}

type CambioEstadoSesionOption = {
  label: string
  nextEstado:
    | 'abierta_inscripcion'
    | 'cerrada_inscripcion'
    | 'en_planificacion'
    | 'cancelada'
  tone?: 'default' | 'danger'
}

function getEstadoSesionVisual(estado: string) {
  if (estado === 'abierta_inscripcion') {
    return {
      label: 'Inscripción abierta',
      className:
        'rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700',
    }
  }

  if (estado === 'cerrada_inscripcion') {
    return {
      label: 'Inscripción cerrada',
      className:
        'rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700',
    }
  }

  if (estado === 'en_planificacion') {
    return {
      label: 'En planificación',
      className:
        'rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700',
    }
  }

  if (estado === 'publicada') {
    return {
      label: 'Publicada',
      className:
        'rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700',
    }
  }

  if (estado === 'cancelada') {
    return {
      label: 'Cancelada',
      className:
        'rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700',
    }
  }

  return {
    label: estado,
    className:
      'rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700',
  }
}

function getAccionesEstadoSesion(estado: string): CambioEstadoSesionOption[] {
  if (estado === 'abierta_inscripcion') {
    return [
      { label: 'Cerrar inscripción', nextEstado: 'cerrada_inscripcion' },
      { label: 'Cancelar sesión', nextEstado: 'cancelada', tone: 'danger' },
    ]
  }

  if (estado === 'cerrada_inscripcion') {
    return [
      { label: 'Reabrir inscripción', nextEstado: 'abierta_inscripcion' },
      { label: 'Pasar a planificación', nextEstado: 'en_planificacion' },
      { label: 'Cancelar sesión', nextEstado: 'cancelada', tone: 'danger' },
    ]
  }

  if (estado === 'en_planificacion') {
    return [
      {
        label: 'Volver a inscripción cerrada',
        nextEstado: 'cerrada_inscripcion',
      },
      { label: 'Cancelar sesión', nextEstado: 'cancelada', tone: 'danger' },
    ]
  }

  if (estado === 'publicada') {
    return [
      { label: 'Reabrir planificación', nextEstado: 'en_planificacion' },
      { label: 'Cancelar sesión', nextEstado: 'cancelada', tone: 'danger' },
    ]
  }

  if (estado === 'cancelada') {
    return [
      { label: 'Reabrir inscripción', nextEstado: 'abierta_inscripcion' },
      { label: 'Dejar cerrada', nextEstado: 'cerrada_inscripcion' },
    ]
  }

  return []
}

export default async function StaffSesionDetallePage({ params }: PageProps) {
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
    .select('id, fecha, tipo_entreno, hora_inicio, sede, estado, notas_staff')
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
      tipo_hueco,
      observaciones
    `)
    .eq('sesion_id', id)
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

  const inscripcionesConPerfil = (inscripciones ?? []).map((inscripcion) => ({
    ...inscripcion,
    profile: profilesMap.get(inscripcion.profile_id) ?? null,
  }))
  const inscripcionesActivas = inscripcionesConPerfil.filter(
    (item) => item.estado === 'inscrito' || item.estado === 'lista_espera'
  )
  const inscripcionesCanceladas = inscripcionesConPerfil.filter(
    (item) => item.estado === 'cancelado'
  )

  if (sesionError) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <h1 className="text-xl font-semibold text-gray-900">Detalle de sesión</h1>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error cargando la sesión: {sesionError.message}
        </div>
      </main>
    )
  }

  if (!sesion) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <h1 className="text-xl font-semibold text-gray-900">Detalle de sesión</h1>
        <p className="mt-4 text-sm text-gray-500">La sesión no existe.</p>
      </main>
    )
  }

  const puedeGestionarInscripciones =
    sesion.estado === 'abierta_inscripcion' ||
    sesion.estado === 'cerrada_inscripcion'
  const estadoSesionVisual = getEstadoSesionVisual(sesion.estado)
  const accionesEstadoSesion = getAccionesEstadoSesion(sesion.estado)

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/staff/sesiones"
            className="text-gray-500 hover:text-gray-700"
          >
            ← Volver a sesiones
          </Link>

          <span className="text-gray-300">/</span>

          <Link
            href={`/staff/sesiones/${sesion.id}/barcos`}
            className="text-gray-500 hover:text-gray-700"
          >
            Ir a planificación de barcos
          </Link>
        </div>

        <h1 className="mt-3 text-2xl font-bold text-gray-900">
          Detalle de sesión
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Vista operativa de la sesión
        </p>
      </div>

      <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Notas</p>
            <p className="mt-1 text-sm text-gray-900">{sesion.notas_staff ?? '—'}</p>
          </div>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Estado de la sesión</h2>
            <p className="text-sm text-gray-500">
              Control manual del flujo operativo. La publicación se sigue
              gestionando desde planificación de barcos.
            </p>
          </div>

          <span className={estadoSesionVisual.className}>
            {estadoSesionVisual.label}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {accionesEstadoSesion.map((accion) => (
            <form
              key={accion.label}
              action={async () => {
                'use server'
                await cambiarEstadoSesion(sesion.id, accion.nextEstado)
              }}
            >
              <button
                type="submit"
                className={
                  accion.tone === 'danger'
                    ? 'rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50'
                    : 'rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
                }
              >
                {accion.label}
              </button>
            </form>
          ))}

          <Link
            href={`/staff/sesiones/${sesion.id}/barcos`}
            className="inline-flex rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Ir a planificación de barcos
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Inscripciones</h2>
            <p className="text-sm text-gray-500">Personas apuntadas a esta sesión</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
              Activas: {inscripcionesActivas.length}
            </span>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700">
              Canceladas: {inscripcionesCanceladas.length}
            </span>
          </div>
        </div>

        {!puedeGestionarInscripciones && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Las inscripciones no se pueden modificar en el estado actual de la sesión.
          </div>
        )}

        {inscripcionesError || profilesError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Error cargando inscripciones o perfiles:{' '}
            {inscripcionesError?.message || profilesError?.message}
          </div>
        ) : inscripcionesActivas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-6 py-8 text-center text-sm text-gray-500">
            No hay inscripciones activas en esta sesión.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Peso</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Lado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Prep/Rec</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Hueco</th>
                  {puedeGestionarInscripciones && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inscripcionesActivas.map((inscripcion) => (
                  <tr key={inscripcion.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {inscripcion.profile
                        ? `${inscripcion.profile.nombre} ${inscripcion.profile.apellidos}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {inscripcion.profile?.peso_kg ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {inscripcion.estado}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatSidePreference(inscripcion.lado_solicitado)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {inscripcion.prep_rec ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {inscripcion.tipo_hueco ?? '—'}
                    </td>
                    {puedeGestionarInscripciones && (
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex flex-wrap gap-2">
                          {inscripcion.estado !== 'inscrito' && (
                            <form
                              action={async () => {
                                'use server'
                                await marcarInscripcionComoInscrito(sesion.id, inscripcion.id)
                              }}
                            >
                              <button
                                type="submit"
                                className="rounded-lg border border-green-200 bg-white px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-50"
                              >
                                Pasar a inscrito
                              </button>
                            </form>
                          )}

                          {inscripcion.estado !== 'lista_espera' && (
                            <form
                              action={async () => {
                                'use server'
                                await marcarInscripcionComoListaEspera(sesion.id, inscripcion.id)
                              }}
                            >
                              <button
                                type="submit"
                                className="rounded-lg border border-yellow-200 bg-white px-3 py-2 text-xs font-medium text-yellow-700 hover:bg-yellow-50"
                              >
                                Pasar a espera
                              </button>
                            </form>
                          )}

                          {inscripcion.estado !== 'cancelado' && (
                            <form
                              action={async () => {
                                'use server'
                                await cancelarInscripcionDesdeStaff(sesion.id, inscripcion.id)
                              }}
                            >
                              <button
                                type="submit"
                                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                              >
                                Cancelar
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <section className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Histórico de canceladas</h3>
            <p className="text-sm text-gray-500">
              Inscripciones canceladas que ya no participan en la operativa actual.
            </p>
          </div>

          {inscripcionesCanceladas.length === 0 ? (
            <p className="text-sm text-gray-500">No hay inscripciones canceladas.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Nombre
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Peso
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Lado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Prep/Rec
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Hueco
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inscripcionesCanceladas.map((inscripcion) => (
                    <tr key={inscripcion.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {inscripcion.profile
                          ? `${inscripcion.profile.nombre} ${inscripcion.profile.apellidos}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {inscripcion.profile?.peso_kg ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {inscripcion.estado}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {formatSidePreference(inscripcion.lado_solicitado)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {inscripcion.prep_rec ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {inscripcion.tipo_hueco ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
