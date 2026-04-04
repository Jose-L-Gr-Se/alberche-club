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

export function evaluateAssignmentRules(
  input: AssignmentRulesInput
): CrewRuleResult {
  const errors: CrewRuleIssue[] = []
  const warnings: CrewRuleIssue[] = []

  const ladoSolicitado = input.inscripcion.lado_solicitado
  const ladoAsignado = input.target.lado
  const prepRec = input.inscripcion.prep_rec
  const tipoHueco = input.inscripcion.tipo_hueco
  const tipoEntreno = input.sesion.tipo_entreno

  if (
    ladoSolicitado &&
    ladoAsignado &&
    ['izquierda', 'derecha'].includes(ladoSolicitado) &&
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

  if (tipoEntreno === 'veterano' && tipoHueco === 'iniciacion') {
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
