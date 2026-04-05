export function formatSidePreference(value: string | null | undefined) {
  if (!value) return '—'

  const normalized = value.trim().toLowerCase()

  if (normalized === 'i' || normalized === 'izquierda') return 'izquierda'
  if (normalized === 'd' || normalized === 'derecha') return 'derecha'
  if (normalized === 'ambos') return 'ambos'

  return value
}
