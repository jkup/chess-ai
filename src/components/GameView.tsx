import {
  ArrowLeft,
  Cpu,
  Lightbulb,
  LoaderCircle,
  LogOut,
  User,
  Users,
  X,
} from 'lucide-react'
import { useMemo } from 'react'
import { resolveSide, type GameSettings } from '../state/game'
import { useChessGame, type Color } from '../hooks/useChessGame'
import {
  useOpponent,
  type MoveSource,
  type OpponentStatus,
} from '../hooks/useOpponent'
import { useHint } from '../hooks/useHint'
import type { LichessProfile } from '../lib/lichess'
import { Board } from './Board'

type Props = {
  settings: GameSettings
  profile: LichessProfile
  token: string
  onExit: () => void
  onSignOut: () => void
  onAuthError: () => void
}

export function GameView({
  settings,
  profile,
  token,
  onExit,
  onSignOut,
  onAuthError,
}: Props) {
  const playerColor = useMemo(() => resolveSide(settings.side), [settings])
  const opponentColor: Color = playerColor === 'white' ? 'black' : 'white'

  const game = useChessGame()

  const playersTurn = game.turn === playerColor
  const movableColor =
    game.status.kind === 'playing' && playersTurn ? playerColor : undefined

  const opponent = useOpponent({
    game,
    color: opponentColor,
    elo: settings.elo,
    enabled: true,
    token,
    onUnauthorized: onAuthError,
  })

  const hintEnabled = playersTurn && game.status.kind === 'playing'
  const hint = useHint({
    fen: game.fen,
    elo: settings.elo,
    token,
    enabled: hintEnabled,
    onUnauthorized: onAuthError,
  })
  const hintArrow =
    hint.hint.kind === 'shown'
      ? { from: hint.hint.from, to: hint.hint.to }
      : undefined

  return (
    <div className="min-h-full flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-900">
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          New game
        </button>
        <StatusPill
          status={game.status}
          playersTurn={playersTurn}
          inCheck={game.inCheck}
          opponentStatus={opponent.status}
        />
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={() => hint.request()}
            disabled={!hintEnabled || hint.hint.kind === 'loading'}
            title={
              hintEnabled
                ? 'Suggest a move'
                : 'Hints available on your turn'
            }
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-amber-300 disabled:text-zinc-700 disabled:hover:text-zinc-700 transition"
          >
            {hint.hint.kind === 'loading' ? (
              <LoaderCircle className="w-4 h-4 animate-spin" />
            ) : (
              <Lightbulb className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Hint</span>
          </button>
          <button
            onClick={onSignOut}
            title="Sign out of Lichess"
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-6 items-stretch">
          <div className="flex-1 flex flex-col gap-3">
            <OpponentCard
              elo={settings.elo}
              color={opponentColor}
              source={opponent.lastMoveSource}
              active={!playersTurn && game.status.kind === 'playing'}
            />

            <BoardWrap>
              <Board
                fen={game.fen}
                orientation={playerColor}
                turnColor={game.turn}
                movableColor={movableColor}
                dests={game.dests}
                lastMove={game.lastMove}
                inCheck={game.inCheck}
                hintArrow={hintArrow}
                onMove={(from, to) => game.makeMove(from, to)}
              />
            </BoardWrap>

            {hint.hint.kind === 'shown' && (
              <HintBanner
                san={hint.hint.san}
                source={hint.hint.source}
                onDismiss={hint.dismiss}
              />
            )}
            {hint.hint.kind === 'error' && (
              <HintError onDismiss={hint.dismiss} />
            )}

            <PlayerCard
              name={profile.username}
              elo={profile.estimatedElo ?? settings.elo}
              color={playerColor}
              subtitle="You"
              active={playersTurn && game.status.kind === 'playing'}
            />
          </div>

          <aside className="lg:w-72 bg-zinc-900/40 border border-zinc-900 rounded-xl flex flex-col max-h-[60vh] lg:max-h-none">
            <div className="px-4 py-3 border-b border-zinc-900 text-xs uppercase tracking-widest text-zinc-500">
              Moves
            </div>
            <MoveList sans={game.history.map((m) => m.san)} />
          </aside>
        </div>
      </div>
    </div>
  )
}

function StatusPill({
  status,
  playersTurn,
  inCheck,
  opponentStatus,
}: {
  status: ReturnType<typeof useChessGame>['status']
  playersTurn: boolean
  inCheck: boolean
  opponentStatus: OpponentStatus
}) {
  let text: string
  let tone: 'neutral' | 'accent' | 'warn' = 'neutral'

  if (status.kind === 'checkmate') {
    text = `Checkmate · ${status.winner} wins`
    tone = 'warn'
  } else if (status.kind === 'draw') {
    text = `Draw · ${status.reason}`
  } else if (playersTurn) {
    text = inCheck ? 'Check · your move' : 'Your move'
    tone = inCheck ? 'warn' : 'accent'
  } else if (opponentStatus === 'unauthorized') {
    text = 'Lichess sign-in expired'
    tone = 'warn'
  } else if (opponentStatus === 'error') {
    text = "Couldn't reach Lichess"
    tone = 'warn'
  } else if (opponentStatus === 'thinking-engine') {
    text = inCheck ? 'Check' : 'Engine thinking…'
    tone = inCheck ? 'warn' : 'neutral'
  } else {
    text = inCheck ? 'Check' : 'Lichess thinking…'
    tone = inCheck ? 'warn' : 'neutral'
  }

  const toneClass =
    tone === 'accent'
      ? 'text-[var(--color-accent)]'
      : tone === 'warn'
      ? 'text-amber-400'
      : 'text-zinc-500'

  return (
    <div
      className={`text-xs uppercase tracking-widest ${toneClass} transition-colors`}
    >
      {text}
    </div>
  )
}

function HintBanner({
  san,
  source,
  onDismiss,
}: {
  san: string
  source: 'lichess' | 'engine'
  onDismiss: () => void
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-950/40 border border-amber-900/60 rounded-lg animate-fade-in">
      <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-amber-100">
          Try{' '}
          <span className="font-mono font-semibold text-amber-200">
            {san}
          </span>
        </div>
        <div className="text-[11px] text-amber-200/60">
          {source === 'lichess'
            ? 'Most common at your rating'
            : 'Engine suggestion (out of book)'}
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="text-xs text-amber-300 hover:text-amber-100 px-2.5 py-1 rounded-md hover:bg-amber-900/40 transition"
      >
        Got it
      </button>
    </div>
  )
}

function HintError({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg">
      <span className="flex-1 text-sm text-zinc-400">
        Couldn't fetch a hint right now.
      </span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-zinc-500 hover:text-zinc-200 transition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

function OpponentCard({
  elo,
  color,
  source,
  active,
}: {
  elo: number
  color: 'white' | 'black'
  source: MoveSource | null
  active: boolean
}) {
  const isEngine = source === 'engine'
  const name = isEngine ? 'Stockfish' : 'Lichess'
  const subtitle = isEngine
    ? 'Engine play (out of book)'
    : 'Crowd-sourced moves'
  const Icon = isEngine ? Cpu : Users

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 border rounded-lg transition ${
        active
          ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/40'
          : 'bg-zinc-900/40 border-zinc-900'
      }`}
    >
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center"
        style={{
          background: color === 'white' ? '#f0d9b5' : '#3a3a3a',
          color: color === 'white' ? '#222' : '#e8e8e8',
        }}
      >
        <Icon className="w-4 h-4" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">
          {name}{' '}
          <span className="text-zinc-500 font-normal">({elo})</span>
        </div>
        <div className="text-xs text-zinc-500 truncate">{subtitle}</div>
      </div>
    </div>
  )
}

function PlayerCard({
  name,
  elo,
  color,
  subtitle,
  active,
}: {
  name: string
  elo: number
  color: 'white' | 'black'
  subtitle: string
  active: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 border rounded-lg transition ${
        active
          ? 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/40'
          : 'bg-zinc-900/40 border-zinc-900'
      }`}
    >
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center"
        style={{
          background: color === 'white' ? '#f0d9b5' : '#3a3a3a',
          color: color === 'white' ? '#222' : '#e8e8e8',
        }}
      >
        <User className="w-4 h-4" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">
          {name}{' '}
          <span className="text-zinc-500 font-normal">({elo})</span>
        </div>
        <div className="text-xs text-zinc-500 truncate">{subtitle}</div>
      </div>
    </div>
  )
}

function BoardWrap({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="aspect-square mx-auto bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden"
      style={{
        width: 'min(100%, calc(100dvh - 14rem), 640px)',
      }}
    >
      {children}
    </div>
  )
}

function MoveList({ sans }: { sans: string[] }) {
  if (sans.length === 0) {
    return (
      <div className="flex-1 px-4 py-4 text-sm text-zinc-600 italic">
        No moves yet
      </div>
    )
  }

  const rows: Array<{ num: number; white: string; black?: string }> = []
  for (let i = 0; i < sans.length; i += 2) {
    rows.push({
      num: Math.floor(i / 2) + 1,
      white: sans[i],
      black: sans[i + 1],
    })
  }

  return (
    <ol className="flex-1 overflow-y-auto px-2 py-2 text-sm font-mono">
      {rows.map((r) => (
        <li
          key={r.num}
          className="grid grid-cols-[2rem_1fr_1fr] gap-1 px-2 py-1 rounded hover:bg-zinc-900/60"
        >
          <span className="text-zinc-600 tabular-nums">{r.num}.</span>
          <span className="text-zinc-200">{r.white}</span>
          <span className="text-zinc-200">{r.black ?? ''}</span>
        </li>
      ))}
    </ol>
  )
}
