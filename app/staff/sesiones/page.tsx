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

  const estadoBadge: Record<string, string> = {
    programada: 'bg-blue-50 text-blue-700 ring-blue-200',
    completada: 'bg-green-50 text-green-700 ring-green-200',
    cancelada: 'bg-red-50 text-red-600 ring-red-200',
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <AppHeader
        title="Sesiones"
        subtitle="Sesiones de entrenamiento programadas"
        items={[
          { href: '/staff/sesiones', label: 'Sesiones staff' },
          { href: '/palista/sesiones', label: 'Vista palista' },
          { href: '/palista/barcos', label: 'Barcos publicados' },
        ]}
      />

      {sesiones.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-10 text-center">
          <p className="text-sm text-gray-500">No hay sesiones disponibles.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Fecha</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Entreno</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Hora</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Sede</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sesiones.map((sesion) => (
                <tr key={sesion.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-5 py-3.5 text-sm font-medium text-gray-900">
                    <Link href={`/staff/sesiones/${sesion.id}`} className="block">
                      {sesion.fecha}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-700">
                    <Link href={`/staff/sesiones/${sesion.id}`} className="block">
                      {sesion.tipo_entreno}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm tabular-nums text-gray-700">
                    <Link href={`/staff/sesiones/${sesion.id}`} className="block">
                      {sesion.hora_inicio}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">
                    <Link href={`/staff/sesiones/${sesion.id}`} className="block">
                      {sesion.sede ?? <span className="text-gray-300">—</span>}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <Link href={`/staff/sesiones/${sesion.id}`} className="block">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${estadoBadge[sesion.estado] ?? 'bg-gray-50 text-gray-600 ring-gray-200'}`}>
                        {sesion.estado}
                      </span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}