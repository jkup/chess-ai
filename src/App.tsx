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

type AuthState =
  | { kind: 'booting' }
  | { kind: 'signed-out'; error?: string }
  | { kind: 'signed-in'; token: string }

function App() {
  const [auth, setAuth] = useState<AuthState>({ kind: 'booting' })
  const [screen, setScreen] = useState<AppScreen>({ kind: 'onboarding' })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (isAuthCallback()) {
          const token = await handleAuthCallback()
          if (!cancelled) setAuth({ kind: 'signed-in', token })
          return
        }
        const stored = getStoredToken()
        if (!cancelled) {
          setAuth(
            stored
              ? { kind: 'signed-in', token: stored }
              : { kind: 'signed-out' }
          )
        }
      } catch (err) {
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
        onStart={(settings) => setScreen({ kind: 'playing', settings })}
      />
    )
  }

  return (
    <GameView
      settings={screen.settings}
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
