import { useEffect, useState } from 'react'
import { Onboarding } from './components/Onboarding'
import { GameView } from './components/GameView'
import { SignIn } from './components/SignIn'
import type { AppScreen } from './state/game'
import {
  clearStoredToken,
  getStoredToken,
  handleAuthCallback,
  isAuthCallback,
} from './lib/lichess-auth'
import {
  fetchAccount,
  LichessUnauthorizedError,
  type LichessProfile,
} from './lib/lichess'

type AuthState =
  | { kind: 'booting' }
  | { kind: 'signed-out'; error?: string }
  | { kind: 'signed-in'; token: string; profile: LichessProfile }

const FALLBACK_PROFILE: LichessProfile = {
  username: 'Player',
  estimatedElo: null,
}

async function loadProfile(token: string): Promise<LichessProfile> {
  try {
    return await fetchAccount(token)
  } catch (err) {
    if (err instanceof LichessUnauthorizedError) throw err
    console.error('[auth] account fetch failed, using fallback', err)
    return FALLBACK_PROFILE
  }
}

function App() {
  const [auth, setAuth] = useState<AuthState>({ kind: 'booting' })
  const [screen, setScreen] = useState<AppScreen>({ kind: 'onboarding' })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        let token: string | null = null
        if (isAuthCallback()) {
          token = await handleAuthCallback()
        } else {
          token = getStoredToken()
        }
        if (!token) {
          if (!cancelled) setAuth({ kind: 'signed-out' })
          return
        }
        const profile = await loadProfile(token)
        if (!cancelled) setAuth({ kind: 'signed-in', token, profile })
      } catch (err) {
        if (err instanceof LichessUnauthorizedError) {
          clearStoredToken()
          if (!cancelled)
            setAuth({ kind: 'signed-out', error: 'Sign-in expired' })
          return
        }
        const message = err instanceof Error ? err.message : 'Sign-in failed'
        if (!cancelled) setAuth({ kind: 'signed-out', error: message })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const signOut = () => {
    clearStoredToken()
    setScreen({ kind: 'onboarding' })
    setAuth({ kind: 'signed-out' })
  }

  if (auth.kind === 'booting') {
    return <BootSplash />
  }

  if (auth.kind === 'signed-out') {
    return <SignIn errorMessage={auth.error} />
  }

  if (screen.kind === 'onboarding') {
    return (
      <Onboarding
        profile={auth.profile}
        onStart={(settings) => setScreen({ kind: 'playing', settings })}
      />
    )
  }

  return (
    <GameView
      settings={screen.settings}
      profile={auth.profile}
      token={auth.token}
      onExit={() => setScreen({ kind: 'onboarding' })}
      onSignOut={signOut}
      onAuthError={signOut}
    />
  )
}

function BootSplash() {
  return (
    <main className="min-h-full flex items-center justify-center">
      <div className="text-zinc-600 text-sm">Loading…</div>
    </main>
  )
}

export default App
