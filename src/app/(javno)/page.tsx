import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Camera, MapPin, Phone, PhoneCall, Scale } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { dohvatiCjenik } from '@/lib/cjenik'
import { formatEur } from '@/lib/format'
import { NAZIV, PODRUCJE, TELEFON_LINK, TELEFON_PRIKAZ } from '@/lib/kontakt'
import { dohvatiPokriveneZupanije } from '@/lib/zupanije'

const NASLOV = 'Otkup bakra, čelika i aluminija'
const OPIS_STRANICE =
  'Dolazimo po bakar, mesing, aluminij, kabele, željezo i drugi otpadni metal od Rijeke do Slavonije. Pošaljite fotografiju, dogovorimo termin i plaćamo gotovinom na licu mjesta.'

// Bez vlastitog `openGraph`: on bi u cijelosti zamijenio onaj iz korijenskog layouta, pa i sliku
// za dijeljenje linka. Naslov i opis za dijeljenje Next.js sam preuzme iz `title` i `description`.
export const metadata: Metadata = {
  title: { absolute: `${NASLOV} | ${NAZIV}` },
  description: OPIS_STRANICE,
}

// Koliko materijala prikazujemo u sažetku cijena (prvi po redoslijedu iz cjenika).
const BROJ_MATERIJALA_U_SAZETKU = 4

const KORACI = [
  {
    ikona: Camera,
    naslov: 'Naručite s fotografijom',
    opis: 'Odaberite materijal, upišite približnu količinu i fotografirajte ga mobitelom.',
  },
  {
    ikona: PhoneCall,
    naslov: 'Nazovemo vas',
    opis: 'Javimo se, provjerimo detalje i dogovorimo termin koji vam odgovara.',
  },
  {
    ikona: Scale,
    naslov: 'Dolazimo, važemo i plaćamo',
    opis: 'Materijal izvažemo kod vas i isplatimo ga gotovinom na licu mjesta.',
  },
]

// Početna stranica: na nju dolaze kupci s oglasa. Gumb za narudžbu mora biti vidljiv odmah.
export default async function Pocetna() {
  const [materijali, zupanije] = await Promise.all([dohvatiCjenik(), dohvatiPokriveneZupanije()])
  const sazetak = materijali.slice(0, BROJ_MATERIJALA_U_SAZETKU)

  return (
    <div className="flex flex-col gap-12">
      {/* Vrh: što nudimo, gdje i gumb za narudžbu. */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            <MapPin className="size-4" />
            {PODRUCJE}
          </p>
          <h1 className="sm:text-4xl">{NASLOV}</h1>
          <p className="max-w-prose text-lg text-muted-foreground">
            Dolazimo po materijal na vašu adresu. Vagu nosimo sa sobom, a plaćamo gotovinom na licu
            mjesta.
          </p>
        </div>
        <Gumbi />
      </section>

      {/* Kako radi: tri koraka. */}
      <section aria-labelledby="kako-radi" className="flex flex-col gap-4">
        <h2 id="kako-radi">Kako radi</h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {KORACI.map(({ ikona: Ikona, naslov, opis }, i) => (
            <li key={naslov}>
              <Card className="h-full">
                <CardContent className="flex gap-4 md:flex-col">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Ikona className="size-6" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3>
                      <span className="text-primary tabular-nums">{i + 1}.</span> {naslov}
                    </h3>
                    <p className="text-muted-foreground">{opis}</p>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* Sažetak cijena: najviša cijena po materijalu. Ako cjenik nije dostupan, dio se preskače. */}
      {sazetak.length > 0 && (
        <section aria-labelledby="cijene" className="flex flex-col gap-4">
          <h2 id="cijene">Otkupne cijene</h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {sazetak.map((m) => (
              <li key={m.id}>
                <Card className="h-full">
                  <CardContent className="flex flex-col gap-1">
                    <h3>{m.naziv}</h3>
                    <p className="text-muted-foreground">
                      do{' '}
                      <span className="text-xl font-semibold whitespace-nowrap text-foreground tabular-nums">
                        {formatEur(m.klase[0].cijena_po_kg)}
                      </span>
                      <span className="whitespace-nowrap">/kg</span>
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Cijena ovisi o klasi materijala. Konačni iznos određuje vaganje.
          </p>
          <Link
            href="/cjenik"
            className={buttonVariants({ variant: 'outline', className: 'w-full sm:w-auto sm:self-start' })}
          >
            Cijeli cjenik i kalkulator
            <ArrowRight />
          </Link>
        </section>
      )}

      {/* Područje: pokrivene županije. */}
      {zupanije.length > 0 && (
        <section aria-labelledby="podrucje" className="flex flex-col gap-4">
          <h2 id="podrucje">Gdje dolazimo</h2>
          <ul className="flex flex-wrap gap-2">
            {zupanije.map((naziv) => (
              <li key={naziv}>
                <Badge variant="outline" className="h-8 bg-card px-3 text-sm">
                  {naziv}
                </Badge>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground">
            Niste na popisu? Nazovite nas na{' '}
            <a
              href={TELEFON_LINK}
              className="font-medium whitespace-nowrap text-foreground underline underline-offset-4 tabular-nums hover:text-primary"
            >
              {TELEFON_PRIKAZ}
            </a>{' '}
            pa ćemo vidjeti možemo li doći.
          </p>
        </section>
      )}

      {/* Završni poziv, za one koji su pročitali sve do dna. */}
      <section aria-labelledby="poziv">
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="poziv">Imate materijal za odvoz?</h2>
              <p className="text-muted-foreground">
                Narudžba traje dvije minute. Javit ćemo vam se i dogovoriti termin.
              </p>
            </div>
            <Gumbi />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

// Glavni gumb za narudžbu i telefon. Na mobitelu jedan ispod drugoga, preko cijele širine.
function Gumbi() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Link href="/naruci" className={buttonVariants({ size: 'lg', className: 'w-full sm:w-auto' })}>
        Naruči odvoz
        <ArrowRight />
      </Link>
      <a
        href={TELEFON_LINK}
        className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full sm:w-auto' })}
      >
        <Phone />
        <span className="tabular-nums">{TELEFON_PRIKAZ}</span>
      </a>
    </div>
  )
}
