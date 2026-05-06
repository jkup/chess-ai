export type Side = 'white' | 'black' | 'random'

export type GameSettings = {
  elo: number
  side: Side
}

export type AppScreen =
  | { kind: 'onboarding' }
  | { kind: 'playing'; settings: GameSettings }

export const ELO_MIN = 600
export const ELO_MAX = 2800
export const ELO_DEFAULT = 1200

export const ELO_BANDS = [
  { value: 1000, label: 'Beginner' },
  { value: 1400, label: 'Intermediate' },
  { value: 1800, label: 'Advanced' },
  { value: 2200, label: 'Expert' },
] as const

export function resolveSide(side: Side): 'white' | 'black' {
  if (side === 'random') return Math.random() < 0.5 ? 'white' : 'black'
  return side
}
