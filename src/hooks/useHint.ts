import { useCallback, useEffect, useRef, useState } from 'react'
import { Chess, type Square } from 'chess.js'
import {
  fetchExplorerMoves,
  LichessUnauthorizedError,
  pickTopMove,
} from '../lib/lichess'
import { getEngine } from '../lib/engine'

export type HintState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | {
      kind: 'shown'
      from: Square
      to: Square
      san: string
      source: 'lichess' | 'engine'
    }
  | { kind: 'unavailable' }
  | { kind: 'error' }

type Options = {
  fen: string
  elo: number
  token: string
  enabled: boolean
  onUnauthorized?: () => void
}

function uciToSan(fen: string, uci: string): string {
  try {
    const chess = new Chess(fen)
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length === 5 ? (uci[4] as 'q' | 'r' | 'b' | 'n') : undefined,
    })
    return move.san
  } catch {
    return uci
  }
}

export function useHint({
  fen,
  elo,
  token,
  enabled,
  onUnauthorized,
}: Options): {
  hint: HintState
  request: () => void
  dismiss: () => void
} {
  const [hint, setHint] = useState<HintState>({ kind: 'idle' })
  const ctrlRef = useRef<AbortController | null>(null)

  // Auto-clear when the position changes (player moved or new game started).
  useEffect(() => {
    ctrlRef.current?.abort()
    setHint({ kind: 'idle' })
  }, [fen])

  const dismiss = useCallback(() => {
    ctrlRef.current?.abort()
    setHint({ kind: 'idle' })
  }, [])

  const request = useCallback(() => {
    if (!enabled) return
    ctrlRef.current?.abort()
    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    setHint({ kind: 'loading' })

    const fenAtRequest = fen

    ;(async () => {
      try {
        const data = await fetchExplorerMoves(
          fenAtRequest,
          elo,
          token,
          ctrl.signal
        )
        const top = pickTopMove(data.moves)
        if (top) {
          if (ctrl.signal.aborted) return
          setHint({
            kind: 'shown',
            from: top.uci.slice(0, 2) as Square,
            to: top.uci.slice(2, 4) as Square,
            san: top.san,
            source: 'lichess',
          })
          return
        }

        // Out of book — ask the engine.
        const engine = getEngine()
        await engine.setElo(elo)
        const uci = await engine.getBestMove(fenAtRequest, {
          depth: 14,
          signal: ctrl.signal,
        })
        if (ctrl.signal.aborted) return
        setHint({
          kind: 'shown',
          from: uci.slice(0, 2) as Square,
          to: uci.slice(2, 4) as Square,
          san: uciToSan(fenAtRequest, uci),
          source: 'engine',
        })
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return
        if (err instanceof LichessUnauthorizedError) {
          onUnauthorized?.()
          if (!ctrl.signal.aborted) setHint({ kind: 'idle' })
          return
        }
        console.error('[hint] error', err)
        if (!ctrl.signal.aborted) setHint({ kind: 'error' })
      }
    })()
  }, [fen, elo, token, enabled, onUnauthorized])

  return { hint, request, dismiss }
}
