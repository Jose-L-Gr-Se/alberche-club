export type BoatLayoutConfig = {
  tipo: string
  maxBancos: number
  lados: Array<'izquierda' | 'derecha'>
}

const DEFAULT_LAYOUT: BoatLayoutConfig = {
  tipo: 'DEFAULT',
  maxBancos: 5,
  lados: ['izquierda', 'derecha'],
}

const BOAT_LAYOUTS: Record<string, BoatLayoutConfig> = {
  BD12: {
    tipo: 'BD12',
    maxBancos: 10,
    lados: ['izquierda', 'derecha'],
  },
}

export function getBoatLayoutConfig(tipoBarco: string | null | undefined): BoatLayoutConfig {
  if (!tipoBarco) return DEFAULT_LAYOUT
  return BOAT_LAYOUTS[tipoBarco] ?? DEFAULT_LAYOUT
}
