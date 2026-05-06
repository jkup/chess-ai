# Chess AI

A web chess app where the "computer" plays moves drawn from real human games at the user's ELO, via the Lichess Opening Explorer API. When the position leaves book / runs out of human games, fall back to a local Stockfish engine. Goal: make it feel as polished as chess.com or lichess.

## Tech stack

- **Vite + React 19 + TypeScript** — dev/build tooling
- **Tailwind CSS v4** — styling, via `@tailwindcss/vite` plugin (no `tailwind.config.js`, theme lives in `src/index.css` under `@theme`)
- **chessground** — Lichess's actual board renderer (vanilla JS, we wrap it in a React component when we add the board)
- **chess.js** — move validation, FEN/PGN, legal moves
- **lucide-react** — UI icons (not chess pieces)
- **Lichess Opening Explorer API** — `https://explorer.lichess.ovh/lichess?fen=...&speeds=...&ratings=...` returns moves real players made at this position, filterable by rating band. No auth required.
- **Stockfish.wasm** (planned) — fallback engine when the explorer returns too few games

### Notes on dependencies

- `chessground` is marked deprecated on npm but is still the library Lichess itself uses (source: github.com/lichess-org/chessground). Version `9.2.1` works; we'll revisit if it ever breaks.
- Piece sprites come embedded as base64 data URLs inside `chessground/assets/chessground.cburnett.css`, so no vendoring required. To swap piece set, replace that one CSS import in `Board.tsx`.

## Project structure

```
src/
  App.tsx                       — top-level state machine (onboarding ↔ playing)
  main.tsx                      — React entry
  index.css                     — Tailwind import + @theme tokens + base styles
  components/
    Onboarding.tsx              — name + ELO + side picker
    GameView.tsx                — header, player cards, board, move list
    Board.tsx                   — chessground React wrapper
  hooks/
    useChessGame.ts             — chess.js wrapper: fen, turn, dests, history, status, makeMove
  state/
    game.ts                     — shared types (GameSettings, Side, AppScreen)
public/
  favicon.svg
index.html
vite.config.ts                  — registers @vitejs/plugin-react and @tailwindcss/vite
```

Planned but not yet created:

```
src/
  lib/
    lichess.ts                  — Opening Explorer client
    engine.ts                   — Stockfish.wasm fallback
```

## Commands

- `npm run dev` — start Vite dev server (port 5173, falls through to next free port)
- `npm run build` — typecheck + production build
- `npm run typecheck` — `tsc --noEmit` only
- `npm run lint` — ESLint
- `npm run preview` — serve production build

## Roadmap

1. **Bootstrap** ✅ — Vite scaffold, Tailwind v4, deps installed, landing placeholder renders
2. **Starter site** ✅ — onboarding (name + ELO + side), game-view layout (header, player cards, board placeholder, move list), state machine in `App.tsx`
3. **Board** ✅ — chessground wired to chess.js: drag-to-move, legal-move dots, last-move highlight, check halo, status pill ("Your move" / "Lichess thinking…" / "Checkmate"), populated SAN move list, active-player highlight
4. **Lichess hookup** — on user move, query explorer with current FEN + ELO band, pick a weighted-random response, animate it
5. **Engine fallback** — when explorer returns < N games, switch to Stockfish at matching skill level
6. **Game polish** — captured pieces, clock (optional), result modal, promotion picker (currently auto-queens)
7. **PWA** — `vite-plugin-pwa`, installable, offline shell

## Design intent

- Dark theme by default, board uses classic light/dark squares (`--color-board-light` / `--color-board-dark` in `index.css`)
- Animations should feel weighty — pieces glide, don't snap. Defer to chessground's built-in animation timings before adding Framer Motion.
- The "computer" should feel human: include the explorer's small per-move delay, occasional "thinking" pauses, no instant responses.

## Open questions / decisions to revisit

- Which rating bands does the explorer support? (need to check API; likely 1000/1200/1400/1600/1800/2000/2200/2500)
- Weighted-random vs. mode-of-played-moves for picking the computer's reply — start with weighted-random by frequency.
- Threshold for switching to engine fallback — start with N=10 games, tune later.
