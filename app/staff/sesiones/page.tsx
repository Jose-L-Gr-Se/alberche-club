import { createServerSupabaseClient } from '@/lib/supabase/server'

type Sesion = {
  id: string
  fecha: string
  tipo_entreno: string
  hora_inicio: string
  sede: string | null
  estado: string
}

export default async function StaffSesionesPage() {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('sesiones')
    .select('id, fecha, tipo_entreno, hora_inicio, sede, estado')
    .order('fecha', { ascending: true })
    .order('hora_inicio', { ascending: true })

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Sesiones</h1>
        <p className="mt-4 text-red-600">
          Error cargando sesiones: {error.message}
        </p>
      </div>
    )
  }

  const sesiones = (data ?? []) as Sesion[]

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Sesiones</h1>
        <p className="text-sm text-gray-600">
          Vista inicial de sesiones de entrenamiento
        </p>
      </div>

      {sesiones.length === 0 ? (
        <div className="rounded border p-4">
          <p>No hay sesiones disponibles.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Entreno</th>
                <th className="px-4 py-3">Hora</th>
                <th className="px-4 py-3">Sede</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {sesiones.map((sesion) => (
                <tr key={sesion.id} className="border-t text-sm">
                  <td className="px-4 py-3">{sesion.fecha}</td>
                  <td className="px-4 py-3">{sesion.tipo_entreno}</td>
                  <td className="px-4 py-3">{sesion.hora_inicio}</td>
                  <td className="px-4 py-3">{sesion.sede ?? '-'}</td>
                  <td className="px-4 py-3">{sesion.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}