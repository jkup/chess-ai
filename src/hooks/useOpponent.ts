import { useEffect, useState } from 'react'
import type { Square } from 'chess.js'
import {
  fetchExplorerMoves,
  LichessUnauthorizedError,
  pickWeightedMove,
  totalGames,
} from '../lib/lichess'
import type { ChessGame, Color } from './useChessGame'

export type OpponentStatus =
  | 'idle'
  | 'thinking'
  | 'stuck'
  | 'error'
  | 'unauthorized'

const MIN_GAMES = 5
const THINK_MS_MIN = 600
const THINK_MS_MAX = 1400

type Options = {
  game: ChessGame
  color: Color
  elo: number
  enabled: boolean
  token: string
  onUnauthorized?: () => void
}

export function useOpponent({
  game,
  color,
  elo,
  enabled,
  token,
  onUnauthorized,
}: Options): { status: OpponentStatus } {
  const [status, setStatus] = useState<OpponentStatus>('idle')

  const myTurn =
    enabled && game.turn === color && game.status.kind === 'playing'

  useEffect(() => {
    if (!myTurn) {
      setStatus('idle')
      return
    }

    setStatus('thinking')
    const ctrl = new AbortController()
    const startedAt = Date.now()
    const thinkBudget =
      THINK_MS_MIN + Math.random() * (THINK_MS_MAX - THINK_MS_MIN)

    const fenAtStart = game.fen
    ;(async () => {
      try {
        const data = await fetchExplorerMoves(
          fenAtStart,
          elo,
          token,
          ctrl.signal
        )
        const games = totalGames(data)

        if (games < MIN_GAMES || data.moves.length === 0) {
          console.log('[opponent] explorer too sparse, stuck', {
            games,
            fen: fenAtStart,
            opening: data.opening?.name,
          })
          if (!ctrl.signal.aborted) setStatus('stuck')
          return
        }

        const pick = pickWeightedMove(data.moves)
        if (!pick) {
          if (!ctrl.signal.aborted) setStatus('stuck')
          return
        }

        const elapsed = Date.now() - startedAt
        const remaining = thinkBudget - elapsed
        if (remaining > 0) {
          await new Promise((r) => setTimeout(r, remaining))
        }
        if (ctrl.signal.aborted) return

        const from = pick.uci.slice(0, 2) as Square
        const to = pick.uci.slice(2, 4) as Square
        const promo =
          pick.uci.length === 5
            ? (pick.uci[4] as 'q' | 'r' | 'b' | 'n')
            : undefined

        game.makeMove(from, to, promo)
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return
        if (err instanceof LichessUnauthorizedError) {
          if (!ctrl.signal.aborted) setStatus('unauthorized')
          onUnauthorized?.()
          return
        }
        console.error('[opponent] error', err)
        if (!ctrl.signal.aborted) setStatus('error')
      }
    })()

    return () => {
      ctrl.abort()
    }
    // game.fen tracks position changes; makeMove ref is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTurn, game.fen, elo, token])

  return { status }
}
