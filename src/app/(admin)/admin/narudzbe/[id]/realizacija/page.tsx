import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { z } from 'zod'
import { FormaRealizacije, type PocetniRedak } from '@/components/admin/forma-realizacije'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { dohvatiCjenikAdmin } from '@/lib/admin/cjenik'
import { dohvatiNarudzbu } from '@/lib/admin/narudzbe'
import { NAZIVI_STATUSA, nazivStavke } from '@/lib/admin/oznake'
import { formatBrojUnos, formatCijenaUnos, formatEur } from '@/lib/format'
import { zahtijevajKorisnika } from '@/lib/supabase/provjera'

export const metadata: Metadata = { title: 'Realizacija' }

// Upis stvarnih vrijednosti nakon vaganja (1.10). Isti ekran služi i za ispravak.
// Okvir je statičan, a narudžba i cjenik se dočitaju (params i prijava su podaci zahtjeva).
export default function StranicaRealizacije({
  params,
}: PageProps<'/admin/narudzbe/[id]/realizacija'>) {
  return (
    <Suspense fallback={<KosturRealizacije />}>
      <Realizacija params={params} />
    </Suspense>
  )
}

async function Realizacija({
  params,
}: {
  params: PageProps<'/admin/narudzbe/[id]/realizacija'>['params']
}) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()

  const { supabase } = await zahtijevajKorisnika()
  const [n, materijali] = await Promise.all([
    dohvatiNarudzbu(supabase, id),
    dohvatiCjenikAdmin(supabase),
  ])
  if (!n) notFound()

  const natrag = (
    <Link
      href={`/admin/narudzbe/${n.id}`}
      className={buttonVariants({ variant: 'ghost', className: '-ml-3 self-start' })}
    >
      <ArrowLeft />
      Natrag
    </Link>
  )

  if (n.status !== 'potvrdjena' && n.status !== 'realizirana') {
    return (
      <div className="flex flex-col gap-4">
        {natrag}
        <Card>
          <CardContent className="flex flex-col gap-2">
            <p className="font-semibold">Narudžba #{n.broj} se ne može realizirati.</p>
            <p className="text-muted-foreground">
              Status je „{NAZIVI_STATUSA[n.status]}”. Realizirati se može samo potvrđena narudžba.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Današnje cijene iz cjenika (zadana cijena stavke koja još nema stvarnu).
  const cijene = new Map(materijali.flatMap((m) => m.klase.map((k) => [k.id, k.cijena_po_kg])))

  // Stavke unaprijed popunjene: stvarne vrijednosti ako postoje (ispravak),
  // inače prijavljena klasa i kg te današnja cijena te klase.
  const pocetni: PocetniRedak[] = n.stavke.map((s) => {
    const klasaId = s.klasa_stvarna_id ?? s.klasa_id
    const cijena = s.cijena_kg_stvarna ?? cijene.get(klasaId) ?? s.cijena_kg_prijavljena
    return {
      id: s.id,
      prijavljeno:
        s.kg_prijavljeno > 0
          ? `${nazivStavke(s.klasa.materijal.naziv, s.klasa.naziv)} · ${formatBrojUnos(s.kg_prijavljeno)} kg`
          : null,
      klasaId,
      kgTekst: formatBrojUnos(s.kg_stvarno ?? s.kg_prijavljeno),
      cijenaTekst: formatCijenaUnos(cijena),
    }
  })

  return (
    <div className="flex flex-col gap-3">
      {natrag}

      <div className="flex flex-col gap-0.5">
        <h1 className="font-heading text-2xl font-semibold">
          {n.status === 'realizirana' ? 'Uredi realizaciju' : 'Realizacija'}{' '}
          <span className="tabular-nums">#{n.broj}</span>
        </h1>
        <p className="text-muted-foreground">
          {n.ime_prezime} · {n.naselje.naziv}
        </p>
        <p className="text-sm text-muted-foreground tabular-nums">
          Procjena pri narudžbi: {formatEur(n.procjena_ukupno)}
        </p>
      </div>

      <FormaRealizacije
        // Promijenjeni podaci u bazi (npr. nakon spremanja) = forma kreće ispočetka.
        key={JSON.stringify(pocetni)}
        id={n.id}
        broj={n.broj}
        uredivanje={n.status === 'realizirana'}
        materijali={materijali}
        pocetni={pocetni}
      />
    </div>
  )
}

// Privremeni prikaz dok se narudžba učitava.
function KosturRealizacije() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <div className="h-12 w-28 animate-pulse rounded-lg bg-muted" />
      <div className="h-16 animate-pulse rounded-lg bg-muted" />
      <div className="h-56 animate-pulse rounded-xl bg-muted" />
      <div className="h-56 animate-pulse rounded-xl bg-muted" />
      <span className="sr-only">Učitavanje…</span>
    </div>
  )
}
