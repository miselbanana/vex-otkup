import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { KandidatZaDan } from '@/components/admin/dijalog-dodaj-u-dan'
import { KarticaNarudzbe } from '@/components/admin/kartica-narudzbe'
import { KarticeNarudzbi } from '@/components/admin/kartice-narudzbi'
import { PlanerRute, PrekidacPogleda } from '@/components/admin/planer-rute'
import { PopisUzivo } from '@/components/admin/popis-uzivo'
import { PretragaNarudzbi } from '@/components/admin/pretraga-narudzbi'
import { Raspored } from '@/components/admin/raspored'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  KARTICE,
  NARUDZBI_PO_STRANICI,
  brojNovih,
  dohvatiNarudzbe,
  linkoviFotografija,
  procitajBroj,
  zatvorenDan,
  zauzetostDana,
  type Kartica,
  type NarudzbaPopisa,
} from '@/lib/admin/narudzbe'
import { ukupnoKg } from '@/lib/admin/oznake'
import { grupirajPoDanu, poredajDan } from '@/lib/admin/raspored'
import { nazivBlagdana } from '@/lib/blagdani'
import { danUTjednu, danasUZagrebu, jeDatum } from '@/lib/datum'
import { zahtijevajKorisnika } from '@/lib/supabase/provjera'

export const metadata: Metadata = { title: 'Narudžbe' }

type SearchParams = PageProps<'/admin/narudzbe'>['searchParams']

// Vedranov glavni ekran: nove narudžbe, raspored odvoza, realizirane i otkazane.
// Naslov je statičan, a popis se uvijek slaže svjež na serveru (čita prijavu i link),
// pa ga Next.js nikad ne sprema kao statičnu stranicu.
export default function StranicaNarudzbi({ searchParams }: PageProps<'/admin/narudzbe'>) {
  return (
    <div className="flex flex-col gap-4">
      <h1>Narudžbe</h1>
      <Suspense fallback={<KosturPopisa />}>
        <Popis searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

function tekst(vrijednost: string | string[] | undefined): string {
  return typeof vrijednost === 'string' ? vrijednost : ''
}

async function Popis({ searchParams }: { searchParams: SearchParams }) {
  const parametri = await searchParams
  const { supabase } = await zahtijevajKorisnika()

  const trazenaKartica = tekst(parametri.kartica)
  const kartica: Kartica = (KARTICE as readonly string[]).includes(trazenaKartica)
    ? (trazenaKartica as Kartica)
    : 'nove'
  const upit = tekst(parametri.q).trim().slice(0, 100)
  const broj = procitajBroj(tekst(parametri.broj))

  const [{ narudzbe, imaJos }, novih] = await Promise.all([
    dohvatiNarudzbe(supabase, { kartica, upit, broj }),
    brojNovih(supabase),
  ])

  // Trenutak slaganja popisa: za "prije 2 h" na karticama i "Osvježeno prije X min".
  // Ovo je serverska komponenta koja se izvodi jednom po zahtjevu (nakon čitanja
  // prijave i linka), pa je čitanje sata ovdje namjerno.
  // eslint-disable-next-line react-hooks/purity
  const sada = Date.now()
  const danas = danasUZagrebu()

  let sadrzaj: React.ReactNode
  if (!upit && kartica === 'raspored') {
    // Raspored ima dva pogleda: planer jednog dana (zadano) i svi dani (1.8).
    const pogled = tekst(parametri.pogled) === 'svi' ? 'svi' : 'planer'
    let raspored: React.ReactNode
    if (pogled === 'planer') {
      const trazeniDan = tekst(parametri.dan)
      raspored = await planerDana({
        supabase,
        narudzbe,
        datum: jeDatum(trazeniDan) ? trazeniDan : danas,
        danas,
        sada,
      })
    } else if (narudzbe.length === 0) {
      raspored = <PrazanPopis kartica={kartica} upit={upit} />
    } else {
      const { dolazeci, prosli } = grupirajPoDanu(narudzbe, danas)
      const { bodovi, kapacitet } = await zauzetostDana(supabase, [
        ...new Set(narudzbe.map((n) => n.datum_odvoza)),
      ])
      raspored = (
        <Raspored
          dolazeci={dolazeci}
          prosli={prosli}
          bodovi={bodovi}
          kapacitet={kapacitet}
          danas={danas}
          sada={sada}
        />
      )
    }
    sadrzaj = (
      <div className="flex flex-col gap-4">
        <PrekidacPogleda pogled={pogled} />
        {raspored}
      </div>
    )
  } else if (narudzbe.length === 0) {
    sadrzaj = <PrazanPopis kartica={kartica} upit={upit} />
  } else {
    // Sličice samo u kartici "Nove" (Vedran ih gleda prije poziva).
    const nove = !upit && kartica === 'nove'
    const slicice = nove
      ? await linkoviFotografija(
          supabase,
          narudzbe.flatMap((n) => n.fotografije.map((f) => f.putanja)),
        )
      : undefined
    sadrzaj = (
      <ul className="flex flex-col gap-3">
        {narudzbe.map((n) => (
          <li key={n.id}>
            <KarticaNarudzbe
              narudzba={n}
              sada={sada}
              danas={danas}
              kupac={nove || !!upit}
              slicice={slicice}
            />
          </li>
        ))}
      </ul>
    )
  }

  // "Učitaj još" zadržava otvorenu karticu ili pretragu.
  const linkJos = new URLSearchParams()
  if (upit) linkJos.set('q', upit)
  else if (kartica !== 'nove') linkJos.set('kartica', kartica)
  linkJos.set('broj', String(broj + NARUDZBI_PO_STRANICI))

  return (
    <div className="flex flex-col gap-4">
      <PopisUzivo osvjezeno={sada} />
      <PretragaNarudzbi upit={upit} />

      {upit ? (
        <p className="text-sm text-muted-foreground">
          Rezultati pretrage za „{upit}” (sve narudžbe, od najnovije)
        </p>
      ) : (
        <KarticeNarudzbi aktivna={kartica} brojNovih={novih} />
      )}

      {sadrzaj}

      {imaJos && (
        <Link
          href={`/admin/narudzbe?${linkJos}`}
          scroll={false}
          className={buttonVariants({ variant: 'outline', className: 'w-full' })}
        >
          Učitaj još
        </Link>
      )}
    </div>
  )
}

// Planer rute za jedan dan. `narudzbe` su sve potvrđene (kartica "Raspored"):
// one s tim danom čine rutu, a ostale se mogu dodati u dan.
async function planerDana({
  supabase,
  narudzbe,
  datum,
  danas,
  sada,
}: {
  supabase: Awaited<ReturnType<typeof zahtijevajKorisnika>>['supabase']
  narudzbe: NarudzbaPopisa[]
  datum: string
  danas: string
  sada: number
}) {
  const [{ bodovi, nove, kapacitet }, zatvoren] = await Promise.all([
    zauzetostDana(supabase, [datum]),
    zatvorenDan(supabase, datum),
  ])

  // Upozorenje ako se na taj dan inače ne radi.
  const blagdan = nazivBlagdana(datum)
  const oznakaDana =
    [
      danUTjednu(datum) === 7 && 'Nedjelja: inače se ne radi.',
      blagdan && `Blagdan (${blagdan}).`,
      zatvoren && `Zatvoren dan${zatvoren.razlog ? ` (${zatvoren.razlog})` : ''}.`,
    ]
      .filter(Boolean)
      .join(' ') || null

  const kandidati: KandidatZaDan[] = narudzbe
    .filter((n) => n.datum_odvoza !== datum)
    .map((n) => ({
      id: n.id,
      broj: n.broj,
      ime: n.ime_prezime,
      naselje: n.naselje.naziv,
      datum: n.datum_odvoza,
      kg: ukupnoKg(n.stavke),
    }))

  return (
    <PlanerRute
      datum={datum}
      danas={danas}
      sada={sada}
      narudzbe={poredajDan(narudzbe.filter((n) => n.datum_odvoza === datum))}
      kandidati={kandidati}
      bodovi={bodovi.get(datum) ?? 0}
      novih={nove.get(datum) ?? 0}
      kapacitet={kapacitet}
      oznakaDana={oznakaDana}
    />
  )
}

const PORUKE_PRAZNOG: Record<Kartica, string> = {
  nove: 'Nema novih narudžbi. Nova će se ovdje pojaviti sama.',
  raspored: 'Nema potvrđenih odvoza.',
  realizirane: 'Još nema realiziranih narudžbi.',
  otkazane: 'Nema otkazanih narudžbi.',
}

function PrazanPopis({ kartica, upit }: { kartica: Kartica; upit: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-muted-foreground">
          {upit ? 'Nijedna narudžba ne odgovara pretrazi.' : PORUKE_PRAZNOG[kartica]}
        </p>
      </CardContent>
    </Card>
  )
}

// Privremeni prikaz dok se popis učitava.
function KosturPopisa() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="h-12 animate-pulse rounded-lg bg-muted" />
      <div className="h-12 animate-pulse rounded-lg bg-muted" />
      <div className="h-14 animate-pulse rounded-xl bg-muted" />
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
      <span className="sr-only">Učitavanje…</span>
    </div>
  )
}
