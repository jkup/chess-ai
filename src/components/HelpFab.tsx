import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { HowItWorks } from './HowItWorks'

export function HelpFab() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="How it works"
        className="fixed top-4 right-4 z-30 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition px-2.5 py-1.5 rounded-full border border-zinc-800 hover:border-zinc-700 bg-zinc-950/60 backdrop-blur-sm"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        How it works
      </button>
      <HowItWorks open={open} onClose={() => setOpen(false)} />
    </>
  )
}
