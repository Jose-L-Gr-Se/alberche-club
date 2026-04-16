export type BoatZone = {
  id: string
  label: string
  desde: number
  hasta: number
}

export type BoatLayoutConfig = {
  tipo: string
  displayName: string
  maxBancos: number
  palistas: number
  lados: Array<'izquierda' | 'derecha'>
  tieneTambor: boolean
  tieneTimonel: boolean
  zonas: BoatZone[]
}

const DEFAULT_LAYOUT: BoatLayoutConfig = {
  tipo: 'DEFAULT',
  displayName: 'Barco',
  maxBancos: 5,
  palistas: 10,
  lados: ['izquierda', 'derecha'],
  tieneTambor: true,
  tieneTimonel: true,
  zonas: [],
}

const BOAT_CATALOG: Record<string, BoatLayoutConfig> = {
  DB12: {
    tipo: 'DB12',
    displayName: 'DB12',
    maxBancos: 5,
    palistas: 10,
    lados: ['izquierda', 'derecha'],
    tieneTambor: true,
    tieneTimonel: true,
    zonas: [
      { id: 'marcas', label: 'Marcas', desde: 1, hasta: 1 },
      { id: 'motor', label: 'Motor', desde: 2, hasta: 3 },
      { id: 'rockets', label: 'Rockets', desde: 4, hasta: 5 },
    ],
  },
  DB22: {
    tipo: 'DB22',
    displayName: 'DB22',
    maxBancos: 10,
    palistas: 20,
    lados: ['izquierda', 'derecha'],
    tieneTambor: true,
    tieneTimonel: true,
    zonas: [
      { id: 'marcas', label: 'Marcas', desde: 1, hasta: 2 },
      { id: 'motor', label: 'Motor', desde: 4, hasta: 7 },
      { id: 'rockets', label: 'Rockets', desde: 8, hasta: 10 },
    ],
  },
}

// BD12 is the legacy alias for DB12 — kept for backward compatibility
BOAT_CATALOG.BD12 = { ...BOAT_CATALOG.DB12, tipo: 'BD12' }

export function getBoatLayoutConfig(tipoBarco: string | null | undefined): BoatLayoutConfig {
  if (!tipoBarco) return DEFAULT_LAYOUT
  return BOAT_CATALOG[tipoBarco] ?? DEFAULT_LAYOUT
}

/** Returns the canonical boat types available for new boats (excludes legacy aliases). */
export function getBoatCatalog(): BoatLayoutConfig[] {
  return [BOAT_CATALOG.DB12, BOAT_CATALOG.DB22]
}

export function isValidBoatType(tipoBarco: string): boolean {
  return tipoBarco in BOAT_CATALOG
}

/** Returns the zone a given bank number belongs to, or null if it falls outside any defined zone. */
export function getZoneForBank(layout: BoatLayoutConfig, banco: number): BoatZone | null {
  return layout.zonas.find((z) => banco >= z.desde && banco <= z.hasta) ?? null
}
