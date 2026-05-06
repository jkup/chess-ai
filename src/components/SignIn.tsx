import { Crown, LogIn } from 'lucide-react'
import { useState } from 'react'
import { startSignIn } from '../lib/lichess-auth'

type Props = {
  errorMessage?: string
}

export function SignIn({ errorMessage }: Props) {
  const [signingIn, setSigningIn] = useState(false)

  const handleClick = async () => {
    setSigningIn(true)
    try {
      await startSignIn()
    } catch (err) {
      console.error(err)
      setSigningIn(false)
    }
  }

  return (
    <main className="min-h-full flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-accent)] mb-6">
          <Crown className="w-8 h-8 text-white" strokeWidth={2.25} />
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-white mb-3">
          Chess against the crowd
        </h1>
        <p className="text-zinc-400 leading-relaxed mb-8">
          Every move comes from games real players actually played at your
          rating. To access Lichess's database, sign in with your account.
        </p>

        {errorMessage && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-amber-950/40 border border-amber-900 text-amber-300 text-sm">
            {errorMessage}
          </div>
        )}

        <button
          onClick={handleClick}
          disabled={signingIn}
          className="w-full inline-flex items-center justify-center gap-2 bg-[var(--color-accent)] hover:brightness-110 disabled:opacity-60 disabled:cursor-wait text-white font-medium py-3 rounded-lg transition shadow-lg shadow-black/30"
        >
          <LogIn className="w-4 h-4" />
          {signingIn ? 'Redirecting…' : 'Sign in with Lichess'}
        </button>

        <p className="mt-5 text-xs text-zinc-600 leading-relaxed">
          We don't request any permissions. The token is used only to read
          opening-explorer data and is stored locally in your browser.
        </p>
      </div>
    </main>
  )
}
