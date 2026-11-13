import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MapPin, Navigation, User } from 'lucide-react'
import { z } from 'zod'
import { DijalogOtkaza } from '@/components/admin/dijalog-otkaza'
import { DijalogTermina } from '@/components/admin/dijalog-termina'
import { GalerijaFotografija } from '@/components/admin/galerija-fotografija'
import { InternaNapomena } from '@/components/admin/interna-napomena'
import {
  GumbNazovi,
  PopisStavki,
  ZaglavljeNarudzbe,
  terminNarudzbe,
} from '@/components/admin/kartica-narudzbe'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { dohvatiNarudzbu, linkoviFotografija, type NarudzbaPopisa } from '@/lib/admin/narudzbe'
import { NAZIVI_RAZLOGA, linkNavigacije } from '@/lib/admin/oznake'
import { linkPlanera } from '@/lib/admin/raspored'
import { danasUZagrebu, formatDan, formatTrenutak } from '@/lib/datum'
import { prikaziMobitel } from '@/lib/format'
import { zahtijevajKorisnika } from '@/lib/supabase/provjera'

export const metadata: Metadata = { title: 'Narudžba' }

// Detalji jedne narudžbe: sve što Vedranu treba za poziv i dolazak na jednom ekranu.
// Okvir je statičan, a narudžba se dočita (params i prijava su podaci zahtjeva).
export default function StranicaNarudzbe({ params }: PageProps<'/admin/narudzbe/[id]'>) {
  return (
    <Suspense fallback={<KosturDetalja />}>
      <Detalji params={params} />
    </Suspense>
  )
}

async function Detalji({ params }: { params: PageProps<'/admin/narudzbe/[id]'>['params'] }) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()

  const { supabase } = await zahtijevajKorisnika()
  const n = await dohvatiNarudzbu(supabase, id)
  if (!n) notFound()

  const linkovi = await linkoviFotografija(
    supabase,
    n.fotografije.map((f) => f.putanja),
  )
  const fotografije = n.fotografije.flatMap((f) => {
    const link = linkovi.get(f.putanja)
    return link ? [{ id: f.id, link }] : []
  })

  // Trenutak slaganja stranice (za "prije 2 h"). Izvodi se jednom po zahtjevu.
  // eslint-disable-next-line react-hooks/purity
  const sada = Date.now()
  const danas = danasUZagrebu()
  const vrijeme = n.dogovoreni_termin ? formatTrenutak(n.dogovoreni_termin, 'HH:mm') : ''

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={linkNatrag(n, danas)}
        className={buttonVariants({ variant: 'ghost', className: '-ml-3 self-start' })}
      >
        <ArrowLeft />
        Natrag
      </Link>

      <ZaglavljeNarudzbe narudzba={n} sada={sada} link={false} />

      {/* Kupac i poziv: prvo što Vedran treba. */}
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <User className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="flex flex-col">
              <p className="text-lg font-semibold">{n.ime_prezime}</p>
              <p className="text-muted-foreground tabular-nums">{prikaziMobitel(n.mobitel)}</p>
            </div>
          </div>
          {(n.status === 'nova' || n.status === 'potvrdjena') && (
            <GumbNazovi mobitel={n.mobitel} />
          )}
        </CardContent>
      </Card>

      {/* Radnje ovise o statusu. Realizacija dolazi u koraku 1.10. */}
      {n.status === 'nova' && (
        <div className="grid grid-cols-2 gap-2">
          <DijalogTermina
            id={n.id}
            broj={n.broj}
            nacin="potvrdi"
            datum={n.datum_odvoza}
            dioDana={n.dio_dana}
            vrijeme=""
            danas={danas}
          />
          <DijalogOtkaza id={n.id} broj={n.broj} />
        </div>
      )}
      {n.status === 'potvrdjena' && (
        <div className="grid grid-cols-2 gap-2">
          <DijalogTermina
            id={n.id}
            broj={n.broj}
            nacin="promijeni"
            datum={n.datum_odvoza}
            dioDana={n.dio_dana}
            vrijeme={vrijeme}
            danas={danas}
          />
          <DijalogOtkaza id={n.id} broj={n.broj} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Termin</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <p className="first-letter:uppercase">
            <span className="text-muted-foreground">{nazivTermina(n)}: </span>
            {terminNarudzbe(n)}
          </p>
          {/* Kupčev izbor, ako se dogovoreni dan ili dio dana razlikuje od njega. */}
          {(n.status === 'potvrdjena' || n.status === 'realizirana') &&
            n.zeljeni_datum !== n.datum_odvoza && (
              <p className="text-sm text-muted-foreground">
                Kupac je želio {formatDan(n.zeljeni_datum, 'EEEE, d. M.')}
              </p>
            )}
          {n.status === 'otkazana' && n.razlog_otkaza && (
            <p>
              <span className="text-muted-foreground">Razlog otkaza: </span>
              <span className="font-medium">{NAZIVI_RAZLOGA[n.razlog_otkaza]}</span>
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Zaprimljeno {formatTrenutak(n.created_at)}
            {n.potvrdjena_at && ` · potvrđeno ${formatTrenutak(n.potvrdjena_at)}`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Adresa</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-start gap-2">
            <MapPin className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="flex flex-col">
              <p className="font-semibold">
                {n.ulica}, {n.naselje.naziv}
              </p>
              <p className="text-sm text-muted-foreground">
                {n.naselje.opcina} · {n.naselje.zupanija.naziv}
              </p>
              <p className="text-sm text-muted-foreground">
                {n.udaljenost_km.toLocaleString('hr-HR')} km zračno od Reke ·{' '}
                {n.lat !== null && n.lng !== null ? 'kupac je poslao GPS točku' : 'bez GPS točke'}
              </p>
            </div>
          </div>
          <a
            href={linkNavigacije({
              lat: n.lat,
              lng: n.lng,
              ulica: n.ulica,
              naselje: n.naselje.naziv,
            })}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'outline', className: 'w-full' })}
          >
            <Navigation />
            Navigiraj
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Materijali</CardTitle>
        </CardHeader>
        <CardContent>
          <PopisStavki narudzba={n} cijene />
        </CardContent>
      </Card>

      {n.fotografije.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Fotografije</CardTitle>
          </CardHeader>
          <CardContent>
            {fotografije.length > 0 ? (
              <GalerijaFotografija fotografije={fotografije} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Fotografije se trenutno ne mogu učitati. Osvježite stranicu.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Napomene</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="font-medium">Napomena kupca</p>
            <p className={n.napomena_kupca ? 'whitespace-pre-line' : 'text-muted-foreground'}>
              {n.napomena_kupca ?? 'Kupac nije ostavio napomenu.'}
            </p>
          </div>
          <InternaNapomena id={n.id} napomena={n.napomena_interna} />
        </CardContent>
      </Card>
    </div>
  )
}

function nazivTermina(n: NarudzbaPopisa): string {
  if (n.status === 'potvrdjena') return 'Odvoz'
  if (n.status === 'realizirana') return 'Odvezeno'
  if (n.status === 'otkazana') return 'Kupac je želio'
  return 'Kupac želi'
}

// Natrag vodi na popis u kojem narudžba trenutno jest.
function linkNatrag(n: NarudzbaPopisa, danas: string): string {
  switch (n.status) {
    case 'nova':
      return '/admin/narudzbe'
    case 'potvrdjena':
      return linkPlanera(n.datum_odvoza, danas)
    case 'realizirana':
      return '/admin/narudzbe?kartica=realizirane'
    case 'otkazana':
      return '/admin/narudzbe?kartica=otkazane'
  }
}

// Privremeni prikaz dok se narudžba učitava.
function KosturDetalja() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="h-12 w-28 animate-pulse rounded-lg bg-muted" />
      <div className="h-8 animate-pulse rounded-lg bg-muted" />
      <div className="h-36 animate-pulse rounded-xl bg-muted" />
      <div className="h-12 animate-pulse rounded-lg bg-muted" />
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
      <span className="sr-only">Učitavanje…</span>
    </div>
  )
}
