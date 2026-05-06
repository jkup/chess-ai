export type ExplorerMove = {
  uci: string
  san: string
  averageRating: number
  white: number
  draws: number
  black: number
}

export type ExplorerResponse = {
  white: number
  draws: number
  black: number
  moves: ExplorerMove[]
  opening: { eco: string; name: string } | null
}

const RATING_BANDS = [
  0, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500,
] as const

export function nearestRatingBands(elo: number, count = 2): number[] {
  const sorted = [...RATING_BANDS].sort(
    (a, b) => Math.abs(elo - a) - Math.abs(elo - b)
  )
  return sorted.slice(0, count).sort((a, b) => a - b)
}

export class LichessUnauthorizedError extends Error {
  constructor() {
    super('Lichess token rejected')
    this.name = 'LichessUnauthorizedError'
  }
}

export type LichessProfile = {
  username: string
  estimatedElo: number | null
}

type AccountPerf = { rating: number; games: number }
type AccountResponse = {
  username: string
  perfs?: Partial<Record<'blitz' | 'rapid' | 'classical', AccountPerf>>
}

function estimateElo(perfs: AccountResponse['perfs']): number | null {
  const candidates = [perfs?.rapid, perfs?.blitz].filter(
    (p): p is AccountPerf => !!p && p.games > 0
  )
  if (candidates.length === 0) return null
  const sum = candidates.reduce((acc, p) => acc + p.rating, 0)
  return Math.round(sum / candidates.length)
}

export async function fetchAccount(
  token: string,
  signal?: AbortSignal
): Promise<LichessProfile> {
  const res = await fetch('https://lichess.org/api/account', {
    signal,
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) throw new LichessUnauthorizedError()
  if (!res.ok) throw new Error(`Lichess account ${res.status}`)
  const data = (await res.json()) as AccountResponse
  return {
    username: data.username,
    estimatedElo: estimateElo(data.perfs),
  }
}

export async function fetchExplorerMoves(
  fen: string,
  elo: number,
  token: string,
  signal?: AbortSignal
): Promise<ExplorerResponse> {
  const ratings = nearestRatingBands(elo).join(',')
  const url = new URL('https://explorer.lichess.ovh/lichess')
  url.searchParams.set('variant', 'standard')
  url.searchParams.set('fen', fen)
  url.searchParams.set('speeds', 'blitz,rapid')
  url.searchParams.set('ratings', ratings)
  url.searchParams.set('moves', '8')
  url.searchParams.set('topGames', '0')
  url.searchParams.set('recentGames', '0')

  const res = await fetch(url, {
    signal,
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) throw new LichessUnauthorizedError()
  if (!res.ok) throw new Error(`Lichess explorer ${res.status}`)
  return (await res.json()) as ExplorerResponse
}

export function pickWeightedMove(
  moves: ExplorerMove[]
): ExplorerMove | null {
  const weights = moves.map((m) => m.white + m.draws + m.black)
  const total = weights.reduce((a, b) => a + b, 0)
  if (total === 0) return null
  let r = Math.random() * total
  for (let i = 0; i < moves.length; i++) {
    r -= weights[i]
    if (r <= 0) return moves[i]
  }
  return moves[moves.length - 1]
}

export function pickTopMove(moves: ExplorerMove[]): ExplorerMove | null {
  if (moves.length === 0) return null
  return moves.reduce((best, m) => {
    const c = m.white + m.draws + m.black
    const bc = best.white + best.draws + best.black
    return c > bc ? m : best
  })
}

export function totalGames(res: ExplorerResponse): number {
  return res.white + res.draws + res.black
}
