import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Cjenik' }

// Privremeno. Uređivanje cjenika gradimo u koraku 1.11.
export default function StranicaCjenika() {
  return (
    <div className="flex flex-col gap-2">
      <h1>Cjenik</h1>
      <p className="text-muted-foreground">Uskoro.</p>
    </div>
  )
}
