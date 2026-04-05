export type CrewRuleIssue = {
  code: string
  message: string
  severity: 'error' | 'warning'
}

export type CrewRuleResult = {
  ok: boolean
  errors: CrewRuleIssue[]
  warnings: CrewRuleIssue[]
}

type AssignmentRulesInput = {
  sesion: {
    tipo_entreno: string | null
  }
  inscripcion: {
    lado_solicitado: string | null
    prep_rec: string | null
    tipo_hueco: string | null
  }
  target: {
    lado: 'izquierda' | 'derecha' | null
  }
}

function normalizeRequestedSide(
  value: string | null
): 'izquierda' | 'derecha' | 'ambos' | null {
  if (!value) return null

  const normalized = value.trim().toLowerCase()

  if (normalized === 'i' || normalized === 'izquierda') return 'izquierda'
  if (normalized === 'd' || normalized === 'derecha') return 'derecha'
  if (normalized === 'ambos') return 'ambos'

  return null
}

function normalizeText(value: string | null): string | null {
  if (!value) return null
  return value.trim().toLowerCase()
}

export function evaluateAssignmentRules(
  input: AssignmentRulesInput
): CrewRuleResult {
  const errors: CrewRuleIssue[] = []
  const warnings: CrewRuleIssue[] = []

  const ladoSolicitadoRaw = input.inscripcion.lado_solicitado
  const ladoSolicitado = normalizeRequestedSide(ladoSolicitadoRaw)
  const ladoAsignado = input.target.lado
  const prepRec = normalizeText(input.inscripcion.prep_rec)
  const tipoHueco = normalizeText(input.inscripcion.tipo_hueco)
  const tipoEntreno = normalizeText(input.sesion.tipo_entreno)

  if (ladoSolicitadoRaw && !ladoSolicitado) {
    warnings.push({
      code: 'unknown_side_preference',
      severity: 'warning',
      message: `Preferencia de lado no reconocida: ${ladoSolicitadoRaw}.`,
    })
  }

  if (
    ladoSolicitado &&
    ladoSolicitado !== 'ambos' &&
    ladoAsignado &&
    ladoSolicitado !== ladoAsignado
  ) {
    warnings.push({
      code: 'side_preference_mismatch',
      severity: 'warning',
      message: `La persona prefiere lado ${ladoSolicitado} y está asignada a ${ladoAsignado}.`,
    })
  }

  if (prepRec && !['prep', 'rec', 'indistinto'].includes(prepRec)) {
    warnings.push({
      code: 'unknown_prep_rec',
      severity: 'warning',
      message: `Valor prep/rec no reconocido: ${prepRec}.`,
    })
  }

  if (
    tipoHueco &&
    !['veterano', 'iniciacion', 'indistinto'].includes(tipoHueco)
  ) {
    warnings.push({
      code: 'unknown_slot_type',
      severity: 'warning',
      message: `Tipo de hueco no reconocido: ${tipoHueco}.`,
    })
  }

  if (
    tipoEntreno &&
    tipoEntreno.includes('veteran') &&
    tipoHueco === 'iniciacion'
  ) {
    warnings.push({
      code: 'training_slot_mismatch',
      severity: 'warning',
      message: 'La plaza no parece encajar del todo con el tipo de entreno.',
    })
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  }
}
