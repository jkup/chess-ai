import { useState } from 'react'
import { Onboarding } from './components/Onboarding'
import { GameView } from './components/GameView'
import type { AppScreen } from './state/game'

function App() {
  const [screen, setScreen] = useState<AppScreen>({ kind: 'onboarding' })

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
      onExit={() => setScreen({ kind: 'onboarding' })}
    />
  )
}

export default App
