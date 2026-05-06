import { useEffect } from 'react'
import { Crown, KeyRound, Target, Users, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
}

export function HowItWorks({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="howitworks-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 max-h-[calc(100dvh-3rem)] overflow-y-auto animate-rise"
      >
        <header className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--color-accent)]">
              <Crown className="w-5 h-5 text-white" strokeWidth={2.25} />
            </div>
            <div>
              <h2
                id="howitworks-title"
                className="text-lg font-semibold text-white leading-tight"
              >
                How it works
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Real human chess, picked by rating
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <ol className="px-6 pb-2 space-y-5">
          <Step
            n={1}
            icon={KeyRound}
            title="Sign in with Lichess"
          >
            Lichess's opening database now requires authentication. We
            request <strong className="text-zinc-300">no permissions</strong>
            {' '}— the token only lets us read public game stats and is
            stored locally in your browser.
          </Step>
          <Step n={2} icon={Target} title="Pick a rating">
            We pre-fill your rapid + blitz average from your Lichess
            profile, but you can play above or below your level. The
            slider's value sets the rating band we'll search.
          </Step>
          <Step n={3} icon={Users} title="Play the crowd">
            Every opponent move is one a{' '}
            <strong className="text-zinc-300">real player</strong> actually
            chose at your rating, drawn from millions of Lichess games and
            picked weighted by how often it was played. The result feels
            like facing a thoughtful human at exactly your level.
          </Step>
        </ol>

        <div className="mx-6 my-5 px-4 py-3 rounded-lg bg-zinc-900/60 border border-zinc-900 text-xs text-zinc-500 leading-relaxed">
          When a position has fewer than 5 games in the database (deep
          middlegames, novelties), the bot will say{' '}
          <span className="text-zinc-400">"Out of book"</span>. A built-in
          chess engine fallback is on the roadmap to take over from there.
        </div>

        <footer className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full bg-[var(--color-accent)] hover:brightness-110 text-white font-medium py-2.5 rounded-lg transition"
          >
            Got it
          </button>
        </footer>
      </div>
    </div>
  )
}

function Step({
  n,
  icon: Icon,
  title,
  children,
}: {
  n: number
  icon: LucideIcon
  title: string
  children: React.ReactNode
}) {
  return (
    <li className="flex gap-4">
      <div className="shrink-0 relative">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 flex items-center justify-center text-[var(--color-accent)]">
          <Icon className="w-4 h-4" strokeWidth={2.25} />
        </div>
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-semibold text-zinc-300 flex items-center justify-center tabular-nums">
          {n}
        </div>
      </div>
      <div className="min-w-0 pt-1">
        <div className="text-sm font-medium text-white">{title}</div>
        <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
          {children}
        </p>
      </div>
    </li>
  )
}
