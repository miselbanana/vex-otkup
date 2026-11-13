import { Suspense } from 'react'
import type { Metadata } from 'next'
import { DijalogKlase } from '@/components/admin/dijalog-klase'
import { RedakKlase } from '@/components/admin/redak-klase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { dohvatiCjenikUredivanje } from '@/lib/admin/cjenik'
import { zahtijevajKorisnika } from '@/lib/supabase/provjera'

export const metadata: Metadata = { title: 'Cjenik' }

// Uređivanje cjenika (1.11): cijene, nazivi i opisi klasa, uključivanje i nove klase.
// Naslov je statičan, a cjenik se dočita svjež (prijava je podatak zahtjeva).
export default function StranicaCjenika() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h1>Cjenik</h1>
        <p className="text-muted-foreground">
          Promjena se odmah vidi na javnom cjeniku i u narudžbi. Stare narudžbe zadržavaju svoje
          cijene.
        </p>
      </div>
      <Suspense fallback={<KosturCjenika />}>
        <Cjenik />
      </Suspense>
    </div>
  )
}

async function Cjenik() {
  const { supabase } = await zahtijevajKorisnika()
  const materijali = await dohvatiCjenikUredivanje(supabase)

  return (
    <div className="flex flex-col gap-4">
      {materijali.map((m) => (
        <Card key={m.id}>
          <CardHeader>
            <CardTitle className="font-heading text-xl font-semibold">{m.naziv}</CardTitle>
            {!m.aktivan && (
              <p className="text-sm text-muted-foreground">
                Materijal je isključen, pa ga kupci ne vide ni s uključenim klasama.
              </p>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {m.klase.length > 0 ? (
              <ul className="flex flex-col">
                {m.klase.map((k) => (
                  <RedakKlase
                    // Novi podaci iz baze (npr. nakon spremanja) = redak kreće ispočetka.
                    key={`${k.id}-${k.cijena_po_kg}-${k.azurirano}-${k.aktivna}`}
                    klasa={k}
                    materijal={m.naziv}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Ovaj materijal još nema nijednu klasu.</p>
            )}
            <DijalogKlase nacin="dodaj" materijalId={m.id} materijal={m.naziv} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Privremeni prikaz dok se cjenik učitava.
function KosturCjenika() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="h-72 animate-pulse rounded-xl bg-muted" />
      <div className="h-56 animate-pulse rounded-xl bg-muted" />
      <div className="h-56 animate-pulse rounded-xl bg-muted" />
      <span className="sr-only">Učitavanje…</span>
    </div>
  )
}
