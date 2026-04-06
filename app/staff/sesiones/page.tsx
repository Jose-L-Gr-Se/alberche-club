import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { AccessDenied } from '@/components/auth/AccessDenied'
import { AppHeader } from '@/components/navigation/AppHeader'

type Sesion = {
  id: string
  fecha: string
  tipo_entreno: string
  hora_inicio: string
  sede: string | null
  estado: string
}

type EstadoVisual = {
  label: string
  badgeClassName: string
  sortOrder: number
}

type SesionPrimaryAction = {
  href: string
  label: string
  className: string
}

const estadoVisualMap: Record<string, EstadoVisual> = {
  abierta_inscripcion: {
    label: 'Inscripción abierta',
    badgeClassName: 'bg-blue-50 text-blue-700 ring-blue-200',
    sortOrder: 0,
  },
  cerrada_inscripcion: {
    label: 'Inscripción cerrada',
    badgeClassName: 'bg-slate-100 text-slate-700 ring-slate-200',
    sortOrder: 1,
  },
  en_planificacion: {
    label: 'En planificación',
    badgeClassName: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
    sortOrder: 2,
  },
  publicada: {
    label: 'Publicada',
    badgeClassName: 'bg-green-50 text-green-700 ring-green-200',
    sortOrder: 3,
  },
  finalizada: {
    label: 'Finalizada',
    badgeClassName: 'bg-gray-100 text-gray-700 ring-gray-200',
    sortOrder: 4,
  },
  cancelada: {
    label: 'Cancelada',
    badgeClassName: 'bg-red-50 text-red-700 ring-red-200',
    sortOrder: 5,
  },
}

const defaultEstadoVisual: EstadoVisual = {
  label: 'Estado desconocido',
  badgeClassName: 'bg-gray-50 text-gray-600 ring-gray-200',
  sortOrder: 99,
}

function getEstadoVisual(estado: string): EstadoVisual {
  const meta = estadoVisualMap[estado]

  if (!meta) {
    return {
      ...defaultEstadoVisual,
      label: estado,
    }
  }

  return meta
}

function getSesionPrimaryAction(sesion: Sesion): SesionPrimaryAction | null {
  if (
    sesion.estado === 'abierta_inscripcion' ||
    sesion.estado === 'cerrada_inscripcion'
  ) {
    return {
      href: `/staff/sesiones/${sesion.id}`,
      label: 'Gestionar inscripciones',
      className:
        'inline-flex rounded-lg bg-black px-3 py-2 text-xs font-medium text-white hover:bg-gray-800',
    }
  }

  if (sesion.estado === 'en_planificacion') {
    return {
      href: `/staff/sesiones/${sesion.id}/barcos`,
      label: 'Ir a planificación',
      className:
        'inline-flex rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs font-medium text-yellow-700 hover:bg-yellow-100',
    }
  }

  if (sesion.estado === 'publicada') {
    return {
      href: `/staff/sesiones/${sesion.id}/barcos`,
      label: 'Ver planificación',
      className:
        'inline-flex rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-100',
    }
  }

  return null
}

export default async function StaffSesionesPage() {
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

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('sesiones')
    .select('id, fecha, tipo_entreno, hora_inicio, sede, estado')
    .order('fecha', { ascending: true })
    .order('hora_inicio', { ascending: true })

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <h1 className="text-xl font-semibold text-gray-900">Sesiones</h1>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error cargando sesiones: {error.message}
        </div>
      </main>
    )
  }

  const sesiones = (data ?? []) as Sesion[]
  const sesionesOrdenadas = [...sesiones].sort((a, b) => {
    const estadoA = getEstadoVisual(a.estado)
    const estadoB = getEstadoVisual(b.estado)

    if (estadoA.sortOrder !== estadoB.sortOrder) {
      return estadoA.sortOrder - estadoB.sortOrder
    }

    if (a.fecha !== b.fecha) {
      return a.fecha.localeCompare(b.fecha)
    }

    return a.hora_inicio.localeCompare(b.hora_inicio)
  })

  const sesionesConInscripciones = sesiones.filter(
    (sesion) =>
      sesion.estado === 'abierta_inscripcion' ||
      sesion.estado === 'cerrada_inscripcion'
  ).length
  const sesionesEnPlanificacion = sesiones.filter(
    (sesion) => sesion.estado === 'en_planificacion'
  ).length
  const sesionesPublicadas = sesiones.filter(
    (sesion) => sesion.estado === 'publicada'
  ).length

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <AppHeader
        title="Sesiones"
        subtitle="Panel operativo para inscripciones, planificación y publicación"
        items={[
          { href: '/staff/sesiones', label: 'Sesiones staff' },
          { href: '/palista/sesiones', label: 'Vista palista' },
          { href: '/palista/barcos', label: 'Barcos publicados' },
        ]}
      />

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
            Inscripciones
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {sesionesConInscripciones}
          </p>
          <p className="mt-1 text-sm text-blue-700">
            Abiertas o cerradas, aún sin pasar a planificación.
          </p>
        </div>

        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-yellow-700">
            En planificación
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {sesionesEnPlanificacion}
          </p>
          <p className="mt-1 text-sm text-yellow-700">
            Sesiones listas para cuadrar barcos y tripulaciones.
          </p>
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-green-700">
            Publicadas
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {sesionesPublicadas}
          </p>
          <p className="mt-1 text-sm text-green-700">
            Planificaciones ya visibles para palistas.
          </p>
        </div>
      </section>

      {sesiones.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
          <p className="text-sm text-gray-500">No hay sesiones disponibles.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Fecha
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Entreno
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Hora
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Sede
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Estado
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sesionesOrdenadas.map((sesion) => {
                const detalleHref = `/staff/sesiones/${sesion.id}`
                const estadoVisual = getEstadoVisual(sesion.estado)
                const primaryAction = getSesionPrimaryAction(sesion)

                return (
                  <tr key={sesion.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-900">
                      <Link href={detalleHref} className="block">
                        {sesion.fecha}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">
                      <Link href={detalleHref} className="block">
                        {sesion.tipo_entreno}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-sm tabular-nums text-gray-700">
                      <Link href={detalleHref} className="block">
                        {sesion.hora_inicio}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">
                      <Link href={detalleHref} className="block">
                        {sesion.sede ?? <span className="text-gray-300">-</span>}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={detalleHref} className="block">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${estadoVisual.badgeClassName}`}
                        >
                          {estadoVisual.label}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-2">
                        {primaryAction && (
                          <Link
                            href={primaryAction.href}
                            className={primaryAction.className}
                          >
                            {primaryAction.label}
                          </Link>
                        )}
                        <Link
                          href={detalleHref}
                          className="inline-flex rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Ver detalle
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
