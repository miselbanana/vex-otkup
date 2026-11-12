import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Analitika' }

// Privremeno. Nadzornu ploču gradimo u koraku 2.2.
export default function StranicaAnalitike() {
  return (
    <div className="flex flex-col gap-2">
      <h1>Analitika</h1>
      <p className="text-muted-foreground">Uskoro.</p>
    </div>
  )
}
