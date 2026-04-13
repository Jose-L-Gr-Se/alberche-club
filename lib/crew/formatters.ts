type NullableText = string | null | undefined

type ProfileLike = {
  nombre?: string | null
  apellidos?: string | null
  peso_kg?: number | null
} | null | undefined

function normalizeNullableText(value: NullableText) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function formatNullableText(
  value: NullableText,
  fallback = 'Sin dato'
) {
  return normalizeNullableText(value) ?? fallback
}

export function formatSidePreference(value: string | null | undefined) {
  const normalizedValue = normalizeNullableText(value)

  if (!normalizedValue) return 'Sin preferencia indicada'

  const normalized = normalizedValue.toLowerCase()

  if (normalized === 'i' || normalized === 'izquierda') return 'izquierda'
  if (normalized === 'd' || normalized === 'derecha') return 'derecha'
  if (normalized === 'ambos') return 'ambos'

  return normalizedValue
}

export function formatWeightDisplay(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Sin peso'
  }

  return `${value} kg`
}

export function formatProfileName(profile: ProfileLike) {
  if (!profile) {
    return 'Perfil no disponible'
  }

  const nombre = normalizeNullableText(profile.nombre)
  const apellidos = normalizeNullableText(profile.apellidos)
  const fullName = [nombre, apellidos].filter(Boolean).join(' ')

  if (fullName) {
    return fullName
  }

  return 'Nombre no disponible'
}

export function hasIncompleteProfileData(profile: ProfileLike) {
  if (!profile) {
    return true
  }

  const nombre = normalizeNullableText(profile.nombre)
  const apellidos = normalizeNullableText(profile.apellidos)
  const hasName = !!nombre || !!apellidos
  const hasWeight = typeof profile.peso_kg === 'number' && !Number.isNaN(profile.peso_kg)

  return !hasName || !hasWeight
}
