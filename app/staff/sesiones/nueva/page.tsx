import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/require-role'
import { AccessDenied } from '@/components/auth/AccessDenied'
import { crearSesion } from './actions'

type PageProps = {
  searchParams?: Promise<{
    error?: string
  }>
}

export default async function StaffNuevaSesionPage({
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

  const resolvedSearchParams = await searchParams
  const errorMessage = resolvedSearchParams?.error?.trim() ?? ''

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link
            href="/staff/sesiones"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Volver a sesiones
          </Link>

          <h1 className="mt-3 text-2xl font-bold text-gray-900">
            Nueva sesion
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Crea una sesion operativa para abrir inscripcion desde staff.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            La sesion se crea con estado inicial <strong>abierta_inscripcion</strong>.
          </div>

          <form action={crearSesion} className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">
                  Fecha
                </span>
                <input
                  type="date"
                  name="fecha"
                  required
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
                Crear sesion
              </button>

              <Link
                href="/staff/sesiones"
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
