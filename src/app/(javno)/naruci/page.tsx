import { Suspense } from 'react'
import type { Metadata } from 'next'
import { CjenikNedostupan } from '@/components/javno/cjenik-nedostupan'
import { Koraci } from '@/components/javno/narudzba/koraci'
import { Card, CardContent } from '@/components/ui/card'
import { dohvatiCjenik } from '@/lib/cjenik'
import { stavkeIzUrla } from '@/lib/izracun'

export const metadata: Metadata = {
  title: 'Naruči odvoz',
  description:
    'Naručite odvoz sekundarnih sirovina u četiri kratka koraka. Plaćamo gotovinom na licu mjesta.',
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

// Narudžba odvoza u četiri koraka. Naslov je statičan, a forma čeka parametre iz linka
// (stavke iz kalkulatora), pa je u <Suspense> (pravilo uz cacheComponents).
export default function NaruciStranica({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1>Naruči odvoz</h1>
        <p className="text-muted-foreground">
          Četiri kratka koraka. Nakon narudžbe nazvat ćemo vas i dogovoriti termin.
        </p>
      </div>

      <Suspense fallback={<KosturForme />}>
        <FormaNarudzbe searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function FormaNarudzbe({ searchParams }: { searchParams: SearchParams }) {
  const [{ s }, materijali] = await Promise.all([searchParams, dohvatiCjenik()])
  if (materijali.length === 0) return <CjenikNedostupan />

  // Stavke iz kalkulatora: /naruci?s=3:12.5,7:40
  const pocetneStavke = stavkeIzUrla(
    typeof s === 'string' ? s : '',
    materijali.flatMap((m) => m.klase),
  )

  return <Koraci materijali={materijali} pocetneStavke={pocetneStavke} />
}

// Privremeni prikaz dok se forma učitava.
function KosturForme() {
  return (
    <Card aria-busy="true">
      <CardContent className="flex flex-col gap-3">
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="h-12 animate-pulse rounded-lg bg-muted" />
        <div className="h-12 animate-pulse rounded-lg bg-muted" />
        <span className="sr-only">Učitavanje…</span>
      </CardContent>
    </Card>
  )
}
