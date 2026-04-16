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

type WeightContext = {
  peso_kg: number | null
  zonaId: string | null
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
    tipo_posicion: 'banco' | 'tambor' | 'timonel'
  }
  weight?: WeightContext
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
  const tipoPosicion = input.target.tipo_posicion

  // --- Lado: solo para banco ---
  if (tipoPosicion === 'banco') {
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
  }

  // --- prep_rec ---
  if (!prepRec) {
    warnings.push({
      code: 'missing_prep_rec',
      severity: 'warning',
      message: 'Falta indicar si la persona está en preparación o recuperación.',
    })
  } else if (!['prep', 'rec', 'indistinto'].includes(prepRec)) {
    warnings.push({
      code: 'unknown_prep_rec',
      severity: 'warning',
      message: `Valor prep/rec no reconocido: ${prepRec}.`,
    })
  }

  // --- tipo_hueco ---
  const knownSlotTypes = ['veterano', 'iniciacion', 'indistinto']
  const tipoHuecoRecognized = Boolean(tipoHueco && knownSlotTypes.includes(tipoHueco))

  if (!tipoHueco) {
    warnings.push({
      code: 'missing_slot_type',
      severity: 'warning',
      message: 'Falta indicar el tipo de hueco de esta inscripción.',
    })
  } else if (!tipoHuecoRecognized) {
    warnings.push({
      code: 'unknown_slot_type',
      severity: 'warning',
      message: `Tipo de hueco no reconocido: ${tipoHueco}.`,
    })
  }

  // --- tipo_entreno vs tipo_hueco ---
  if (tipoEntreno && tipoHuecoRecognized) {
    const esVeterano = tipoEntreno.includes('veteran')
    const esIniciacion =
      tipoEntreno.includes('iniciacion') || tipoEntreno.includes('iniciación')

    if (esVeterano && tipoHueco === 'iniciacion') {
      errors.push({
        code: 'training_slot_mismatch',
        severity: 'error',
        message: 'La sesión es de veteranos pero la plaza es de iniciación.',
      })
    } else if (esIniciacion && tipoHueco === 'veterano') {
      errors.push({
        code: 'training_slot_mismatch_iniciacion',
        severity: 'error',
        message: 'La sesión es de iniciación pero la plaza es de veteranos.',
      })
    } else if (!esVeterano && !esIniciacion && tipoHueco !== 'indistinto') {
      warnings.push({
        code: 'uninterpretable_training_type',
        severity: 'warning',
        message: `Tipo de entreno "${input.sesion.tipo_entreno}" no reconocido para validar con el tipo de hueco.`,
      })
    }
  }

  // --- Peso (banco solo) ---
  if (tipoPosicion === 'banco' && input.weight !== undefined) {
    const { peso_kg, zonaId } = input.weight
    if (zonaId === 'motor') {
      if (peso_kg === null) {
        warnings.push({
          code: 'no_weight_motor_zone',
          severity: 'warning',
          message: 'Sin peso registrado en zona motor. Anótalo para equilibrar el barco.',
        })
      } else if (peso_kg < 60) {
        warnings.push({
          code: 'light_person_motor_zone',
          severity: 'warning',
          message: `Persona ligera (${peso_kg} kg) en zona motor.`,
        })
      }
    }
    if (zonaId === 'marcas' && peso_kg !== null && peso_kg > 90) {
      warnings.push({
        code: 'heavy_person_marcas_zone',
        severity: 'warning',
        message: `Persona pesada (${peso_kg} kg) en zona de marcas.`,
      })
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  }
}
