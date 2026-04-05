'use client'

import { useState, useTransition } from 'react'
import { actualizarPosicionAsignacion } from '@/app/staff/sesiones/[id]/barcos/actions'

type Props = {
  sesionId: string
  inscripcionId: string
  defaultBanco: number | null
  defaultLado: 'izquierda' | 'derecha' | null
  disabled?: boolean
}

export function PositionEditor({
  sesionId,
  inscripcionId,
  defaultBanco,
  defaultLado,
  disabled = false,
}: Props) {
  const [banco, setBanco] = useState<string>(
    defaultBanco !== null ? String(defaultBanco) : ''
  )
  const [lado, setLado] = useState<string>(defaultLado ?? '')
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    if (disabled) return

    setMessage(null)

    const bancoParsed =
      banco.trim() === '' ? null : Number.parseInt(banco, 10)

    const ladoParsed =
      lado === 'izquierda' || lado === 'derecha' ? lado : null

    startTransition(async () => {
      const result = await actualizarPosicionAsignacion(
        sesionId,
        inscripcionId,
        bancoParsed,
        ladoParsed
      )

      if (!result.ok) {
        setMessage({
          type: 'error',
          text: result.message ?? 'No se pudo actualizar la posición.',
        })
        return
      }

      if (result.issues?.warnings?.length) {
        setMessage({
          type: 'warning',
          text: result.issues.warnings[0].message,
        })
        return
      }

      setMessage({
        type: 'success',
        text: 'Posición actualizada.',
      })
    })
  }

  return (
    <div className="flex flex-col gap-2 lg:min-w-[320px]">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Banco
          </label>
          <input
            type="number"
            min={1}
            value={banco}
            onChange={(e) => setBanco(e.target.value)}
            disabled={disabled}
            className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Lado
          </label>
          <select
            value={lado}
            onChange={(e) => setLado(e.target.value)}
            disabled={disabled}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500"
          >
            <option value="">Sin definir</option>
            <option value="izquierda">Izquierda</option>
            <option value="derecha">Derecha</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || isPending}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? 'Guardando...' : 'Guardar posición'}
        </button>
      </div>

      {message ? (
        <div
          className={
            message.type === 'error'
              ? 'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700'
              : message.type === 'warning'
                ? 'rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-700'
                : 'rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700'
          }
        >
          {message.text}
        </div>
      ) : null}
    </div>
  )
}
