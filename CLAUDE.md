# Chess AI

A web chess app where the "computer" plays moves drawn from real human games at the user's ELO, via the Lichess Opening Explorer API. When the position leaves book / runs out of human games, fall back to a local Stockfish engine. Goal: make it feel as polished as chess.com or lichess.

## Tech stack

- **Vite + React 19 + TypeScript** — dev/build tooling
- **Tailwind CSS v4** — styling, via `@tailwindcss/vite` plugin (no `tailwind.config.js`, theme lives in `src/index.css` under `@theme`)
- **chessground** — Lichess's actual board renderer (vanilla JS, we wrap it in a React component when we add the board)
- **chess.js** — move validation, FEN/PGN, legal moves
- **lucide-react** — UI icons (not chess pieces)
- **Lichess Opening Explorer API** — `https://explorer.lichess.ovh/lichess?fen=...&speeds=...&ratings=...` returns moves real players made at this position, filterable by rating band. **Requires authentication as of early 2026** — every request must carry `Authorization: Bearer <token>`.
- **Lichess OAuth 2.0 (PKCE)** — used to obtain the explorer token. SPA flow, no app registration, no scopes requested.
- **Stockfish.wasm** (planned) — fallback engine when the explorer returns too few games

### Notes on dependencies

- `chessground` is marked deprecated on npm but is still the library Lichess itself uses (source: github.com/lichess-org/chessground). Version `9.2.1` works; we'll revisit if it ever breaks.
- Piece sprites come embedded as base64 data URLs inside `chessground/assets/chessground.cburnett.css`, so no vendoring required. To swap piece set, replace that one CSS import in `Board.tsx`.

## Project structure

```
src/
  App.tsx                       — auth state machine (booting/signed-out/signed-in) + screen routing
  main.tsx                      — React entry
  index.css                     — Tailwind import + @theme tokens + base styles
  components/
    SignIn.tsx                  — landing screen with "Sign in with Lichess" button
    Onboarding.tsx              — ELO slider (pre-filled from Lichess rating) + side picker
    GameView.tsx                — header (with sign-out), player cards, board, move list
    Board.tsx                   — chessground React wrapper
  hooks/
    useChessGame.ts             — chess.js wrapper: fen, turn, dests, history, status, makeMove
    useOpponent.ts              — auto-plays opponent moves from Lichess explorer; exposes idle/thinking/stuck/error/unauthorized
  lib/
    lichess.ts                  — Opening Explorer fetch (Bearer auth) + ELO band mapping + weighted-random move picker; fetchAccount → LichessProfile; exports LichessUnauthorizedError
    lichess-auth.ts             — OAuth 2.0 PKCE: startSignIn, handleAuthCallback, token storage in localStorage
  state/
    game.ts                     — shared types (GameSettings = { elo, side }, Side, AppScreen)
public/
  favicon.svg
index.html
vite.config.ts                  — registers @vitejs/plugin-react and @tailwindcss/vite
```

Planned but not yet created:

```
src/
  lib/
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
2. **Starter site** ✅ — onboarding (ELO + side; ELO pre-filled from the user's Lichess rapid/blitz rating), game-view layout (header, player cards, board placeholder, move list), state machine in `App.tsx`
3. **Board** ✅ — chessground wired to chess.js: drag-to-move, legal-move dots, last-move highlight, check halo, status pill ("Your move" / "Lichess thinking…" / "Checkmate"), populated SAN move list, active-player highlight
4. **Lichess hookup** ✅ — OAuth PKCE sign-in (no scopes, no app registration), token stored in `localStorage`. After auth, the app fetches the user's `/api/account` profile so onboarding can show their username and pre-fill the rating slider with the average of their rapid + blitz ratings. On opponent's turn, query explorer with current FEN + two nearest ELO bands at blitz+rapid, pick a weighted-random response by play frequency, wait a 600–1400 ms "thinking" budget, then animate. Below 5 total games at the position the opponent surfaces "Out of book" (logged to console). Token rejection (401) on either the account or explorer fetch bounces the user back to the sign-in screen.
5. **Engine fallback** — when explorer returns < 5 games, switch to Stockfish at matching skill level (currently surfaces "Out of book" instead)
6. **Game polish** — captured pieces, clock (optional), result modal, promotion picker (currently auto-queens)
7. **PWA** — `vite-plugin-pwa`, installable, offline shell

## Design intent

- Dark theme by default, board uses classic light/dark squares (`--color-board-light` / `--color-board-dark` in `index.css`)
- Animations should feel weighty — pieces glide, don't snap. Defer to chessground's built-in animation timings before adding Framer Motion.
- The "computer" should feel human: include the explorer's small per-move delay, occasional "thinking" pauses, no instant responses.

## Open questions / decisions to revisit

- Rating bands the explorer supports: `0, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500`. We snap to the two nearest and pool them for a richer sample.
- Picking strategy: pure weighted-random by play frequency (decided). Could revisit biasing by win-rate later if the opponent feels too random.
- Threshold for stuck/engine-fallback: 5 total games (decided). Tune once Stockfish fallback lands.
- Speeds queried: `blitz,rapid` (decided). Bullet adds noise, classical is sparse at lower ratings.

## OAuth notes

- Lichess locked the opening explorer behind authentication in early 2026 to defend against DDoS. There is no public/anonymous mode.
- Our `client_id` is the GitHub repo URL (`https://github.com/jkup/chess-ai`). PKCE means no app registration is required; any string works, but a URL pointing to the project's homepage is the convention so the consent screen tells the user who's asking.
- `redirect_uri` is computed from `window.location.origin + '/'` at runtime, so it works on whatever port Vite happens to serve. Caveat: if the dev server restarts mid-flow and picks a different port, the callback can't reach the app — re-open the new port and start over.
- PKCE verifier + state are in `sessionStorage` (single-tab), access token in `localStorage` (persistent). Sign-out clears the token.
- We don't request any scopes — the explorer just needs the request to be authenticated.
