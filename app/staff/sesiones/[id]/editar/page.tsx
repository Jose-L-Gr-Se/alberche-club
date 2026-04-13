import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { AccessDenied } from '@/components/auth/AccessDenied'
import { actualizarSesion } from './actions'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{
    error?: string
  }>
}

const editableStates = [
  'abierta_inscripcion',
  'cerrada_inscripcion',
  'en_planificacion',
] as const

type Sesion = {
  id: string
  fecha: string
  hora_inicio: string
  sede: string | null
  tipo_entreno: string
  cierre_inscripcion_at: string | null
  notas_staff: string | null
  estado: string
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter
    .formatToParts(date)
    .filter((part) => part.type !== 'literal')
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value
      return acc
    }, {})

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export default async function StaffEditarSesionPage({
  params,
  searchParams,
}: PageProps) {
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
  const resolvedSearchParams = await searchParams
  const errorMessage = resolvedSearchParams?.error?.trim() ?? ''
  const supabase = await createServerSupabaseClient()

  const { data: sesion, error: sesionError } = await supabase
    .from('sesiones')
    .select(
      'id, fecha, hora_inicio, sede, tipo_entreno, cierre_inscripcion_at, notas_staff, estado'
    )
    .eq('id', id)
    .single<Sesion>()

  if (sesionError) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-xl font-semibold text-gray-900">Editar sesion</h1>
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Error cargando la sesion: {sesionError.message}
          </div>
        </div>
      </main>
    )
  }

  if (!sesion) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-xl font-semibold text-gray-900">Editar sesion</h1>
          <p className="mt-4 text-sm text-gray-500">La sesion no existe.</p>
        </div>
      </main>
    )
  }

  const puedeEditar = editableStates.includes(
    sesion.estado as (typeof editableStates)[number]
  )

  if (!puedeEditar) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <Link
            href={`/staff/sesiones/${sesion.id}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Volver al detalle
          </Link>

          <h1 className="mt-3 text-2xl font-bold text-gray-900">
            Editar sesion
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Esta sesion no se puede editar desde su estado actual.
          </p>

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              Solo se permiten cambios directos cuando la sesion esta en
              abierta_inscripcion, cerrada_inscripcion o en_planificacion.
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/staff/sesiones/${sesion.id}`}
                className="rounded-lg bg-black px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
              >
                Volver al detalle
              </Link>

              <Link
                href="/staff/sesiones"
                className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Ir a sesiones
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const actualizarSesionAction = actualizarSesion.bind(null, sesion.id)

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link
            href={`/staff/sesiones/${sesion.id}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Volver al detalle
          </Link>

          <h1 className="mt-3 text-2xl font-bold text-gray-900">
            Editar sesion
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Ajusta los datos operativos sin salir del panel staff.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            Estado actual: <strong>{sesion.estado}</strong>
          </div>

          <form action={actualizarSesionAction} className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">
                  Fecha
                </span>
                <input
                  type="date"
                  name="fecha"
                  required
                  defaultValue={sesion.fecha}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">
                  Hora de inicio
                </span>
                <input
                  type="time"
                  name="hora_inicio"
                  required
                  defaultValue={sesion.hora_inicio}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">
                  Sede
                </span>
                <input
                  type="text"
                  name="sede"
                  defaultValue={sesion.sede ?? ''}
                  placeholder="Opcional"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">
                  Tipo de entreno
                </span>
                <input
                  type="text"
                  name="tipo_entreno"
                  required
                  defaultValue={sesion.tipo_entreno}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-gray-700">
                  Cierre de inscripcion
                </span>
                <input
                  type="datetime-local"
                  name="cierre_inscripcion_at"
                  required
                  defaultValue={toDateTimeLocalValue(sesion.cierre_inscripcion_at)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-gray-700">
                  Notas staff
                </span>
                <textarea
                  name="notas_staff"
                  rows={5}
                  defaultValue={sesion.notas_staff ?? ''}
                  placeholder="Opcional"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-lg bg-black px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
              >
                Guardar cambios
              </button>

              <Link
                href={`/staff/sesiones/${sesion.id}`}
                className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}
