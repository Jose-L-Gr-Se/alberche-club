import Link from 'next/link'

type NavItem = {
  href: string
  label: string
}

type Props = {
  title: string
  subtitle?: string
  items: NavItem[]
}

export function AppHeader({ title, subtitle, items }: Props) {
  return (
    <header className="mb-8 rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {item.label}
            </Link>
          ))}

          <form action="/logout" method="post">
            <button
              type="submit"
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
