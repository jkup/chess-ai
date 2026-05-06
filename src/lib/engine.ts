// Stockfish 18 lite single-threaded WASM build.
// Source: node_modules/stockfish/bin/stockfish-18-lite-single.{js,wasm}
// Copied into public/stockfish/ by the copy:engine npm script so the
// worker and its WASM are served from our own origin.
const ENGINE_URL = '/stockfish/stockfish.js'

// UCI_Elo on Stockfish 17/18 lite ranges roughly 1320–3190.
// Below 1320, clamp; the engine still plays plenty weak.
const MIN_UCI_ELO = 1320
const MAX_UCI_ELO = 3190

type Listener = (line: string) => void

class StockfishEngine {
  private worker: Worker | null = null
  private listeners = new Set<Listener>()
  private ready: Promise<void> | null = null
  private currentElo = 0
  private rejectInFlight: ((err: Error) => void) | null = null

  private ensureWorker(): Worker {
    if (this.worker) return this.worker
    this.worker = new Worker(ENGINE_URL)
    this.worker.onmessage = (e: MessageEvent<string>) => {
      const line = typeof e.data === 'string' ? e.data : String(e.data)
      this.listeners.forEach((l) => l(line))
    }
    this.worker.onerror = (e) => {
      console.error('[engine] worker error', e)
      this.rejectInFlight?.(new Error('Engine worker error'))
    }
    return this.worker
  }

  private send(cmd: string): void {
    this.ensureWorker().postMessage(cmd)
  }

  private waitFor(predicate: (line: string) => boolean): Promise<string> {
    return new Promise((resolve) => {
      const off = (line: string) => {
        if (predicate(line)) {
          this.listeners.delete(off)
          resolve(line)
        }
      }
      this.listeners.add(off)
    })
  }

  private async ensureReady(): Promise<void> {
    if (this.ready) return this.ready
    this.ready = (async () => {
      this.send('uci')
      await this.waitFor((l) => l === 'uciok')
      this.send('isready')
      await this.waitFor((l) => l === 'readyok')
    })()
    return this.ready
  }

  async setElo(elo: number): Promise<void> {
    await this.ensureReady()
    const target = Math.max(
      MIN_UCI_ELO,
      Math.min(MAX_UCI_ELO, Math.round(elo))
    )
    if (target === this.currentElo) return
    this.send('setoption name UCI_LimitStrength value true')
    this.send(`setoption name UCI_Elo value ${target}`)
    this.send('isready')
    await this.waitFor((l) => l === 'readyok')
    this.currentElo = target
  }

  async getBestMove(
    fen: string,
    options: { depth?: number; signal?: AbortSignal } = {}
  ): Promise<string> {
    await this.ensureReady()
    const { depth = 12, signal } = options
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    return new Promise<string>((resolve, reject) => {
      const onAbort = () => {
        cleanup()
        this.send('stop')
        reject(new DOMException('Aborted', 'AbortError'))
      }
      const onLine: Listener = (line) => {
        if (!line.startsWith('bestmove')) return
        cleanup()
        const parts = line.split(/\s+/)
        const move = parts[1]
        if (!move || move === '(none)') {
          reject(new Error(`No best move from engine: ${line}`))
        } else {
          resolve(move)
        }
      }
      const cleanup = () => {
        this.listeners.delete(onLine)
        signal?.removeEventListener('abort', onAbort)
        this.rejectInFlight = null
      }

      this.listeners.add(onLine)
      this.rejectInFlight = reject
      signal?.addEventListener('abort', onAbort)

      this.send('ucinewgame')
      this.send(`position fen ${fen}`)
      this.send(`go depth ${depth}`)
    })
  }
}

let _engine: StockfishEngine | null = null

export function getEngine(): StockfishEngine {
  if (!_engine) _engine = new StockfishEngine()
  return _engine
}
