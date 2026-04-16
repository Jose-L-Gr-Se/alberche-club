export type BalanceIssue = {
  code: string
  message: string
  severity: 'warning'
}

type BankEntry = {
  banco: number
  izquierda: { peso_kg: number | null } | null
  derecha: { peso_kg: number | null } | null
}

/** Minimum kg difference between left/right on the same bank that triggers a warning. */
const BANK_IMBALANCE_THRESHOLD_KG = 20

/**
 * Evaluates left/right weight balance within each occupied bank.
 * Returns one warning per bank that exceeds the imbalance threshold.
 * Only fires when both sides are occupied and both weights are known.
 */
export function evaluateBalanceWarnings(filas: BankEntry[]): BalanceIssue[] {
  const warnings: BalanceIssue[] = []

  for (const fila of filas) {
    const pesoIzq = fila.izquierda?.peso_kg ?? null
    const pesoDer = fila.derecha?.peso_kg ?? null

    if (fila.izquierda && fila.derecha && pesoIzq !== null && pesoDer !== null) {
      const diff = Math.abs(pesoIzq - pesoDer)
      if (diff >= BANK_IMBALANCE_THRESHOLD_KG) {
        warnings.push({
          code: 'bank_weight_imbalance',
          severity: 'warning',
          message: `Banco ${fila.banco}: diferencia de ${diff} kg entre lados (Izq ${pesoIzq} kg · Der ${pesoDer} kg).`,
        })
      }
    }
  }

  return warnings
}
