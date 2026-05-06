import { useEffect, useRef } from 'react'
import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'
import type { Color, Key } from 'chessground/types'
import type { Square } from 'chess.js'

import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'
import 'chessground/assets/chessground.cburnett.css'

type Props = {
  fen: string
  orientation: Color
  turnColor: Color
  movableColor: Color | undefined
  dests: Map<Square, Square[]>
  lastMove: [Square, Square] | undefined
  inCheck: boolean
  onMove: (from: Square, to: Square) => void
}

export function Board(props: Props) {
  const elRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<Api | null>(null)
  const onMoveRef = useRef(props.onMove)
  onMoveRef.current = props.onMove

  useEffect(() => {
    if (!elRef.current) return
    const api = Chessground(elRef.current, {
      fen: props.fen,
      orientation: props.orientation,
      turnColor: props.turnColor,
      lastMove: props.lastMove as Key[] | undefined,
      check: props.inCheck,
      animation: { enabled: true, duration: 200 },
      movable: {
        free: false,
        color: props.movableColor,
        dests: props.dests as unknown as Map<Key, Key[]>,
        showDests: true,
        events: {
          after: (orig, dest) => {
            onMoveRef.current(orig as Square, dest as Square)
          },
        },
      },
      drawable: { enabled: false },
      highlight: { lastMove: true, check: true },
    })
    apiRef.current = api
    return () => {
      api.destroy()
      apiRef.current = null
    }
    // mount once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    apiRef.current?.set({
      fen: props.fen,
      orientation: props.orientation,
      turnColor: props.turnColor,
      lastMove: props.lastMove as Key[] | undefined,
      check: props.inCheck,
      movable: {
        color: props.movableColor,
        dests: props.dests as unknown as Map<Key, Key[]>,
      },
    })
  }, [
    props.fen,
    props.orientation,
    props.turnColor,
    props.movableColor,
    props.dests,
    props.lastMove,
    props.inCheck,
  ])

  return <div ref={elRef} className="cg-wrap w-full h-full" />
}
