import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { crearBarcoDePrueba } from './actions'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function StaffSesionBarcosPage({ params }: PageProps) {
  const { id } = await params
  const supabase = createServerSupabaseClient()

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

  const inscritosElegibles = (inscripciones ?? []).map((inscripcion) => ({
    ...inscripcion,
    profile: profilesMap.get(inscripcion.profile_id) ?? null,
  }))

  const { data: barcos, error: barcosError } = await supabase
    .from('barcos')
    .select('id, nombre_visible, tipo_barco, turno, estado, orden_visual')
    .eq('sesion_id', id)
    .order('orden_visual', { ascending: true })

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
        </div>

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

          {inscripcionesError || profilesError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Error cargando inscritos:{' '}
              {inscripcionesError?.message || profilesError?.message}
            </div>
          ) : inscritosElegibles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-6 py-8 text-center text-sm text-gray-500">
              No hay inscritos confirmados para esta sesión.
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {inscritosElegibles.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.profile
                          ? `${item.profile.nombre} ${item.profile.apellidos}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.profile?.peso_kg ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.lado_solicitado ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.prep_rec ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.tipo_hueco ?? '—'}
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
              {barcos.map((barco) => (
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
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
