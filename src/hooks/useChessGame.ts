import { Chess, type Move, type Square } from 'chess.js'
import { useCallback, useMemo, useRef, useState } from 'react'

export type Color = 'white' | 'black'

export type GameStatus =
  | { kind: 'playing' }
  | { kind: 'checkmate'; winner: Color }
  | { kind: 'draw'; reason: 'stalemate' | 'insufficient' | 'repetition' | '50-move' | 'other' }

export type ChessGame = {
  fen: string
  turn: Color
  dests: Map<Square, Square[]>
  history: Move[]
  status: GameStatus
  inCheck: boolean
  lastMove: [Square, Square] | undefined
  makeMove: (from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n') => boolean
  reset: () => void
}

const colorOf = (c: 'w' | 'b'): Color => (c === 'w' ? 'white' : 'black')

function computeStatus(game: Chess): GameStatus {
  if (game.isCheckmate()) {
    return { kind: 'checkmate', winner: game.turn() === 'w' ? 'black' : 'white' }
  }
  if (game.isStalemate()) return { kind: 'draw', reason: 'stalemate' }
  if (game.isInsufficientMaterial()) return { kind: 'draw', reason: 'insufficient' }
  if (game.isThreefoldRepetition()) return { kind: 'draw', reason: 'repetition' }
  if (game.isDrawByFiftyMoves()) return { kind: 'draw', reason: '50-move' }
  if (game.isDraw()) return { kind: 'draw', reason: 'other' }
  return { kind: 'playing' }
}

export function useChessGame(): ChessGame {
  const gameRef = useRef(new Chess())
  const [, bump] = useState(0)
  const rerender = useCallback(() => bump((n) => n + 1), [])

  const game = gameRef.current

  const dests = useMemo(() => {
    const map = new Map<Square, Square[]>()
    if (game.isGameOver()) return map
    for (const sq of game.moves({ verbose: true }) as Move[]) {
      const list = map.get(sq.from)
      if (list) list.push(sq.to)
      else map.set(sq.from, [sq.to])
    }
    return map
    // history.length keeps memo fresh after each move
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.history().length, game.fen()])

  const history = game.history({ verbose: true }) as Move[]
  const last = history[history.length - 1]
  const lastMove: [Square, Square] | undefined = last
    ? [last.from, last.to]
    : undefined

  const makeMove = useCallback(
    (from: Square, to: Square, promotion: 'q' | 'r' | 'b' | 'n' = 'q') => {
      try {
        game.move({ from, to, promotion })
        rerender()
        return true
      } catch {
        return false
      }
    },
    [game, rerender]
  )

  const reset = useCallback(() => {
    game.reset()
    rerender()
  }, [game, rerender])

  return {
    fen: game.fen(),
    turn: colorOf(game.turn()),
    dests,
    history,
    status: computeStatus(game),
    inCheck: game.isCheck(),
    lastMove,
    makeMove,
    reset,
  }
}
