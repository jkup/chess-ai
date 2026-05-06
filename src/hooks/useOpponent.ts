import { useEffect, useState } from 'react'
import type { Square } from 'chess.js'
import {
  fetchExplorerMoves,
  LichessUnauthorizedError,
  pickWeightedMove,
  totalGames,
} from '../lib/lichess'
import { getEngine } from '../lib/engine'
import type { ChessGame, Color } from './useChessGame'

export type OpponentStatus =
  | 'idle'
  | 'thinking-lichess'
  | 'thinking-engine'
  | 'error'
  | 'unauthorized'

export type MoveSource = 'lichess' | 'engine'

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

type Result = {
  status: OpponentStatus
  lastMoveSource: MoveSource | null
}

function parseUci(uci: string): {
  from: Square
  to: Square
  promo?: 'q' | 'r' | 'b' | 'n'
} {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promo:
      uci.length === 5
        ? (uci[4] as 'q' | 'r' | 'b' | 'n')
        : undefined,
  }
}

export function useOpponent({
  game,
  color,
  elo,
  enabled,
  token,
  onUnauthorized,
}: Options): Result {
  const [status, setStatus] = useState<OpponentStatus>('idle')
  const [lastMoveSource, setLastMoveSource] = useState<MoveSource | null>(
    null
  )

  const myTurn =
    enabled && game.turn === color && game.status.kind === 'playing'

  useEffect(() => {
    if (!myTurn) {
      setStatus('idle')
      return
    }

    setStatus('thinking-lichess')
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
        const havePick = games >= MIN_GAMES && data.moves.length > 0
        const pick = havePick ? pickWeightedMove(data.moves) : null

        let uci: string
        let source: MoveSource

        if (pick) {
          uci = pick.uci
          source = 'lichess'
        } else {
          console.log('[opponent] explorer sparse, falling back to engine', {
            games,
            fen: fenAtStart,
            opening: data.opening?.name,
          })
          if (ctrl.signal.aborted) return
          setStatus('thinking-engine')
          const engine = getEngine()
          await engine.setElo(elo)
          uci = await engine.getBestMove(fenAtStart, {
            depth: 12,
            signal: ctrl.signal,
          })
          source = 'engine'
        }

        const elapsed = Date.now() - startedAt
        const remaining = thinkBudget - elapsed
        if (remaining > 0) {
          await new Promise((r) => setTimeout(r, remaining))
        }
        if (ctrl.signal.aborted) return

        const { from, to, promo } = parseUci(uci)
        const ok = game.makeMove(from, to, promo)
        if (ok) setLastMoveSource(source)
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

  return { status, lastMoveSource }
}
