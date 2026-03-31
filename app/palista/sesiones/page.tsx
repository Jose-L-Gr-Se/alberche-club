import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { AccessDenied } from '@/components/auth/AccessDenied'
import { AppHeader } from '@/components/navigation/AppHeader'
import {
  inscribirmeEnSesion,
  cancelarInscripcionEnSesion,
} from './actions'

type Sesion = {
  id: string
  fecha: string
  tipo_entreno: string
  hora_inicio: string
  sede: string | null
  estado: string
  cierre_inscripcion_at: string | null
  capacidad_total: number
}

function sesionPermiteCambios(sesion: {
  estado: string
  cierre_inscripcion_at: string | null
}) {
  if (sesion.estado !== 'abierta_inscripcion') return false
  if (!sesion.cierre_inscripcion_at) return false

  const ahora = new Date()
  const cierre = new Date(sesion.cierre_inscripcion_at)

  return ahora < cierre
}

type Inscripcion = {
  id: string
  sesion_id: string
  profile_id: string
  estado: string
}

export default async function PalistaSesionesPage() {
  let currentProfile: Awaited<ReturnType<typeof requireRole>>

  try {
    currentProfile = await requireRole(['palista', 'staff'])
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      redirect('/login')
    }
    return (
      <AccessDenied
        title="Sin permisos"
        message="Tu cuenta no tiene permisos para acceder a esta zona."
      />
    )
  }

  const profileId = currentProfile.profileId

  const navItems =
    currentProfile.role === 'staff'
      ? [
          { href: '/staff/sesiones', label: 'Sesiones staff' },
          { href: '/palista/sesiones', label: 'Vista palista' },
          { href: '/palista/barcos', label: 'Mis barcos' },
        ]
      : [
          { href: '/palista/sesiones', label: 'Mis sesiones' },
          { href: '/palista/barcos', label: 'Mis barcos' },
        ]

  const supabase = await createServerSupabaseClient()

  const { data: sesiones, error: sesionesError } = await supabase
    .from('sesiones')
    .select('id, fecha, tipo_entreno, hora_inicio, sede, estado, cierre_inscripcion_at, capacidad_total')
    .order('fecha', { ascending: true })
    .order('hora_inicio', { ascending: true })

  const { data: inscripciones, error: inscripcionesError } = await supabase
    .from('inscripciones')
    .select('id, sesion_id, profile_id, estado')
    .eq('profile_id', profileId)
    .in('estado', ['inscrito', 'lista_espera'])

  if (sesionesError) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Mis sesiones</h1>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error cargando sesiones: {sesionesError.message}
        </div>
      </main>
    )
  }

  if (inscripcionesError) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Mis sesiones</h1>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error cargando inscripciones: {inscripcionesError.message}
        </div>
      </main>
    )
  }

  const sesionesList = (sesiones ?? []) as Sesion[]
  const inscripcionesList = (inscripciones ?? []) as Inscripcion[]

  const inscripcionesMap = new Map(
    inscripcionesList.map((inscripcion) => [inscripcion.sesion_id, inscripcion])
  )

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <AppHeader
        title="Mis sesiones"
        subtitle="Vista inicial del palista para consultar e inscribirse a entrenamientos"
        items={navItems}
      />

      {sesionesList.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
          <p className="text-sm text-gray-500">No hay sesiones disponibles.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sesionesList.map((sesion) => {
            const miInscripcion = inscripcionesMap.get(sesion.id)
            const yaInscrito = !!miInscripcion
            const sesionAbierta = sesionPermiteCambios(sesion)

            return (
              <section
                key={sesion.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Fecha
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {sesion.fecha}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Entreno
                      </p>
                      <p className="mt-1 text-sm text-gray-900">
                        {sesion.tipo_entreno}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Hora
                      </p>
                      <p className="mt-1 text-sm text-gray-900">
                        {sesion.hora_inicio}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Sede
                      </p>
                      <p className="mt-1 text-sm text-gray-900">
                        {sesion.sede ?? '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Estado sesión
                      </p>
                      <p className="mt-1 text-sm text-gray-900">
                        {sesion.estado}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Cierre inscripción
                      </p>
                      <p className="mt-1 text-sm text-gray-900">
                        {sesion.cierre_inscripcion_at ?? '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Capacidad
                      </p>
                      <p className="mt-1 text-sm text-gray-900">
                        {sesion.capacidad_total}
                      </p>
                    </div>
                  </div>

                  <div className="md:min-w-[240px]">
                    {!sesionAbierta ? (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600">
                        Inscripción cerrada
                      </div>
                    ) : yaInscrito ? (
                      <div className="flex flex-col gap-2">
                        <div
                          className={`rounded-lg px-4 py-3 text-sm font-medium ${
                            miInscripcion?.estado === 'lista_espera'
                              ? 'border border-yellow-200 bg-yellow-50 text-yellow-700'
                              : 'border border-green-200 bg-green-50 text-green-700'
                          }`}
                        >
                          {miInscripcion?.estado === 'lista_espera'
                            ? 'Estás en lista de espera'
                            : 'Ya estás inscrito'}
                        </div>

                        <form
                          action={async () => {
                            'use server'
                            await cancelarInscripcionEnSesion(sesion.id)
                          }}
                        >
                          <button
                            type="submit"
                            className="w-full rounded-lg border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-50"
                          >
                            Cancelar inscripción
                          </button>
                        </form>
                      </div>
                    ) : (
                      <form
                        action={async () => {
                          'use server'
                          await inscribirmeEnSesion(sesion.id)
                        }}
                      >
                        <button
                          type="submit"
                          className="w-full rounded-lg bg-black px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
                        >
                          Inscribirme
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </main>
  )
}
