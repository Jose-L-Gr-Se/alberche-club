type Props = {
  title?: string
  message: string
}

export function AccessDenied({
  title = 'Acceso restringido',
  message,
}: Props) {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-2xl rounded-xl border border-yellow-200 bg-yellow-50 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-yellow-900">{title}</h1>
        <p className="mt-2 text-sm text-yellow-800">{message}</p>
      </div>
    </main>
  )
}
