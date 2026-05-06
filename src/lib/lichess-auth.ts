const AUTHORIZE_URL = 'https://lichess.org/oauth'
const TOKEN_URL = 'https://lichess.org/api/token'

// Lichess OAuth client_id is just an identifier (PKCE means no registration).
// Convention is to use a URL pointing to the app or its repo.
const CLIENT_ID = 'https://github.com/jkup/chess-ai'

const TOKEN_KEY = 'chess-ai:lichess-token'
const VERIFIER_KEY = 'chess-ai:pkce-verifier'
const STATE_KEY = 'chess-ai:pkce-state'

function base64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function randomBytes(len: number): Uint8Array {
  const out = new Uint8Array(len)
  crypto.getRandomValues(out)
  return out
}

async function sha256(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return new Uint8Array(hash)
}

function redirectUri(): string {
  return window.location.origin + '/'
}

export async function startSignIn(): Promise<void> {
  const verifier = base64url(randomBytes(32))
  const challenge = base64url(await sha256(verifier))
  const state = base64url(randomBytes(16))

  sessionStorage.setItem(VERIFIER_KEY, verifier)
  sessionStorage.setItem(STATE_KEY, state)

  const url = new URL(AUTHORIZE_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', CLIENT_ID)
  url.searchParams.set('redirect_uri', redirectUri())
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('state', state)
  // No scope: explorer access requires only that the request is authenticated.

  window.location.href = url.toString()
}

export function isAuthCallback(): boolean {
  const params = new URLSearchParams(window.location.search)
  return params.has('code') || params.has('error')
}

export async function handleAuthCallback(): Promise<string> {
  const params = new URLSearchParams(window.location.search)
  const error = params.get('error')
  if (error) {
    cleanCallbackUrl()
    throw new Error(`Lichess OAuth: ${error}`)
  }

  const code = params.get('code')
  const returnedState = params.get('state')
  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  const expectedState = sessionStorage.getItem(STATE_KEY)

  if (!code) throw new Error('OAuth callback missing code')
  if (!verifier) throw new Error('OAuth verifier missing (session expired?)')
  if (returnedState !== expectedState) throw new Error('OAuth state mismatch')

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
    client_id: CLIENT_ID,
    code_verifier: verifier,
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Token exchange failed: ${res.status} ${text}`)
  }
  const json = (await res.json()) as { access_token?: string }
  if (!json.access_token) throw new Error('Token exchange returned no token')

  sessionStorage.removeItem(VERIFIER_KEY)
  sessionStorage.removeItem(STATE_KEY)
  cleanCallbackUrl()
  setStoredToken(json.access_token)
  return json.access_token
}

function cleanCallbackUrl(): void {
  window.history.replaceState({}, '', redirectUri())
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}
