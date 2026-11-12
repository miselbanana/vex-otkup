import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Postavke' }

// Privremeno. Push obavijesti dodajemo u koraku 2.5.
export default function StranicaPostavki() {
  return (
    <div className="flex flex-col gap-2">
      <h1>Postavke</h1>
      <p className="text-muted-foreground">Uskoro.</p>
    </div>
  )
}
