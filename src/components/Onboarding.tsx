import { useState } from 'react'
import { Crown, Shuffle } from 'lucide-react'
import {
  ELO_DEFAULT,
  ELO_MAX,
  ELO_MIN,
  type GameSettings,
  type Side,
} from '../state/game'
import type { LichessProfile } from '../lib/lichess'

type Props = {
  profile: LichessProfile
  onStart: (settings: GameSettings) => void
}

function clampElo(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return ELO_DEFAULT
  return Math.min(ELO_MAX, Math.max(ELO_MIN, value))
}

export function Onboarding({ profile, onStart }: Props) {
  const [elo, setElo] = useState(() => clampElo(profile.estimatedElo))
  const [side, setSide] = useState<Side>('white')

  const valid = elo >= ELO_MIN && elo <= ELO_MAX

  const submit = () => {
    if (!valid) return
    onStart({ elo, side })
  }

  return (
    <main className="min-h-full flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--color-accent)]">
            <Crown className="w-5 h-5 text-white" strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white leading-none">
              Chess AI
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Signed in as{' '}
              <span className="text-zinc-300">{profile.username}</span>
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="space-y-6"
        >
          <Field
            label="Opponent rating"
            hint={
              profile.estimatedElo
                ? `your average · ${profile.estimatedElo}`
                : `${ELO_MIN}–${ELO_MAX}`
            }
            value={String(elo)}
          >
            <input
              type="range"
              min={ELO_MIN}
              max={ELO_MAX}
              step={50}
              value={elo}
              onChange={(e) => setElo(Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
            <div className="flex justify-between text-[11px] text-zinc-600 mt-1">
              <span>Beginner</span>
              <span>Intermediate</span>
              <span>Advanced</span>
              <span>Expert</span>
            </div>
          </Field>

          <Field label="Play as">
            <div className="grid grid-cols-3 gap-2">
              <SideButton
                active={side === 'white'}
                onClick={() => setSide('white')}
              >
                <PieceDot color="#f5f5f5" />
                White
              </SideButton>
              <SideButton
                active={side === 'random'}
                onClick={() => setSide('random')}
              >
                <Shuffle className="w-3.5 h-3.5" />
                Random
              </SideButton>
              <SideButton
                active={side === 'black'}
                onClick={() => setSide('black')}
              >
                <PieceDot color="#222" ring />
                Black
              </SideButton>
            </div>
          </Field>

          <button
            type="submit"
            disabled={!valid}
            className="w-full bg-[var(--color-accent)] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition shadow-lg shadow-black/30"
          >
            Start game
          </button>
        </form>
      </div>
    </main>
  )
}

function Field({
  label,
  hint,
  value,
  children,
}: {
  label: string
  hint?: string
  value?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm text-zinc-400">{label}</span>
        {value && (
          <span className="text-sm font-medium text-white tabular-nums">
            {value}
          </span>
        )}
        {!value && hint && (
          <span className="text-xs text-zinc-600">{hint}</span>
        )}
      </div>
      {value && hint && (
        <div className="text-[11px] text-zinc-600 mb-2 -mt-1">{hint}</div>
      )}
      {children}
    </label>
  )
}

function SideButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition border ${
        active
          ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
      }`}
    >
      {children}
    </button>
  )
}

function PieceDot({ color, ring = false }: { color: string; ring?: boolean }) {
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full ${
        ring ? 'ring-1 ring-zinc-500' : ''
      }`}
      style={{ background: color }}
    />
  )
}
