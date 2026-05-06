import { Crown } from 'lucide-react'

function App() {
  return (
    <main className="min-h-full flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-accent)] mb-6">
          <Crown className="w-8 h-8 text-white" strokeWidth={2.25} />
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-white mb-3">
          Chess against the crowd
        </h1>
        <p className="text-zinc-400 leading-relaxed">
          A computer that plays like a real human at your rating. Tell us your
          ELO, and every move comes from games people actually played.
        </p>
        <div className="mt-8 text-xs uppercase tracking-widest text-zinc-600">
          Coming soon
        </div>
      </div>
    </main>
  )
}

export default App
