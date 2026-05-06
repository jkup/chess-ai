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

export async function fetchExplorerMoves(
  fen: string,
  elo: number,
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

  const res = await fetch(url, { signal })
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

export function totalGames(res: ExplorerResponse): number {
  return res.white + res.draws + res.black
}
