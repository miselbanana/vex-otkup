import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Narudžbe' }

// Privremeno. Popis narudžbi gradimo u koraku 1.8.
export default function StranicaNarudzbi() {
  return (
    <div className="flex flex-col gap-2">
      <h1>Narudžbe</h1>
      <p className="text-muted-foreground">Uskoro.</p>
    </div>
  )
}
