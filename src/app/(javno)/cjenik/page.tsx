import type { Metadata } from 'next'
import { Phone } from 'lucide-react'
import { Kalkulator } from '@/components/javno/kalkulator'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { dohvatiCjenik } from '@/lib/cjenik'
import { formatEur } from '@/lib/format'
import { TELEFON_LINK, TELEFON_PRIKAZ } from '@/lib/kontakt'

export const metadata: Metadata = {
  title: 'Cjenik',
  description:
    'Otkupne cijene bakra, mesinga, aluminija, kabela, inoxa, olova, željeza i drugih sirovina po kilogramu.',
}

// Javni cjenik: kartica po materijalu, u njoj klase s opisom i cijenom po kg, a ispod kalkulator.
export default async function CjenikStranica() {
  const materijali = await dohvatiCjenik()

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1>Cjenik</h1>
        <p className="text-muted-foreground">
          Cijene su po kilogramu. Klasu prepoznajete po opisu ispod naziva.
        </p>
      </div>

      {materijali.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <p>Cjenik trenutno nije dostupan. Nazovite nas i rado ćemo vam reći cijene.</p>
            <a href={TELEFON_LINK} className={buttonVariants()}>
              <Phone />
              <span className="tabular-nums">{TELEFON_PRIKAZ}</span>
            </a>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {materijali.map((m) => (
              <Card key={m.id}>
                <CardHeader>
                  <h2>{m.naziv}</h2>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-col divide-y">
                    {m.klase.map((k) => (
                      <li key={k.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                        <div className="flex flex-col gap-0.5">
                          <h3 className="font-sans text-base font-semibold">{k.naziv}</h3>
                          {k.opis && <p className="text-sm text-muted-foreground">{k.opis}</p>}
                        </div>
                        <p className="shrink-0 text-right font-semibold whitespace-nowrap tabular-nums">
                          {formatEur(k.cijena_po_kg)}
                          <span className="font-normal text-muted-foreground">/kg</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <Kalkulator materijali={materijali} />
        </>
      )}
    </div>
  )
}
