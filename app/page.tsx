import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white p-8 text-black">
      <h1 className="text-3xl font-bold">Alberche Club</h1>
      <p className="mt-4">La aplicacion esta cargando correctamente.</p>
      <div className="mt-6 flex gap-4">
        <Link href="/login" className="rounded border px-4 py-2">
          Login
        </Link>
      </div>
    </main>
  )
}