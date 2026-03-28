import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="mt-6 flex flex-col gap-3">
        <Link
          href="/staff/sesiones"
          className="w-fit rounded bg-black px-4 py-2 text-white"
        >
          Ir a sesiones
        </Link>
      </div>
    </div>
  )
}