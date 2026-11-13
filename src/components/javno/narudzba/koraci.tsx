'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, LoaderCircle, Send } from 'lucide-react'
import { FormProvider, useForm, useWatch, type FieldPath } from 'react-hook-form'
import { toast } from 'sonner'
import { KorakFotografije } from '@/components/javno/narudzba/korak-fotografije'
import { KorakKontakt } from '@/components/javno/narudzba/korak-kontakt'
import { KorakLokacija } from '@/components/javno/narudzba/korak-lokacija'
import { KorakMaterijali } from '@/components/javno/narudzba/korak-materijali'
import { KLJUC_IZVORA } from '@/components/javno/spremi-izvor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { MaterijalCjenika } from '@/lib/cjenik'
import { BUCKET_FOTOGRAFIJA, type UploadOdgovor } from '@/lib/fotografije'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { formatBrojUnos } from '@/lib/format'
import { procitajKg, type StavkaUnos } from '@/lib/izracun'
import {
  narudzbaFormeShema,
  praznaStavka,
  type NarudzbaForme,
  type NarudzbaFormeProvjerena,
  type NarudzbaOdgovor,
  type NarudzbaZahtjev,
  type StavkaForme,
} from '@/lib/validacija/narudzba'

// Koraci forme. `polja` su dijelovi forme koji se provjeravaju prije prelaska dalje.
const KORACI: { naslov: string; polja: FieldPath<NarudzbaForme>[] }[] = [
  { naslov: 'Materijali', polja: ['stavke'] },
  { naslov: 'Fotografije', polja: ['fotografije'] },
  {
    naslov: 'Lokacija i termin',
    polja: ['naselje', 'ulica', 'lat', 'lng', 'zeljeniDatum', 'dioDana', 'napomena'],
  },
  { naslov: 'Kontakt', polja: ['imePrezime', 'mobitel', 'privola'] },
]

// Izvor oglasa koji je SpremiIzvor spremio pri dolasku na sajt (ako ga ima).
function procitajIzvor(): NarudzbaZahtjev['izvor'] {
  try {
    const spremljeno = sessionStorage.getItem(KLJUC_IZVORA)
    if (!spremljeno) return undefined
    const izvor = JSON.parse(spremljeno) as Record<string, unknown>
    const tekst = (v: unknown) => (typeof v === 'string' ? v.slice(0, 500) : undefined)
    return {
      utm_source: tekst(izvor.utm_source),
      utm_campaign: tekst(izvor.utm_campaign),
      fbclid: tekst(izvor.fbclid),
    }
  } catch {
    // sessionStorage nedostupan ili oštećen: narudžba ide i bez izvora.
    return undefined
  }
}

// Stavke iz kalkulatora (klasa + kg) pretvara u retke forme (materijal + klasa + tekst).
function pocetniRetci(stavke: StavkaUnos[], materijali: MaterijalCjenika[]): StavkaForme[] {
  const retci: StavkaForme[] = []
  for (const s of stavke) {
    const materijal = materijali.find((m) => m.klase.some((k) => k.id === s.klasaId))
    if (!materijal) continue
    retci.push({
      materijalId: String(materijal.id),
      klasaId: String(s.klasaId),
      kgTekst: formatBrojUnos(s.kg),
    })
  }
  return retci.length > 0 ? retci : [praznaStavka()]
}

// Okvir narudžbe u četiri koraka. React Hook Form čuva podatke svih koraka,
// pa ništa ne nestaje kad kupac ide naprijed i natrag.
export function Koraci({
  materijali,
  pocetneStavke,
}: {
  materijali: MaterijalCjenika[]
  pocetneStavke: StavkaUnos[]
}) {
  const forma = useForm<NarudzbaForme, unknown, NarudzbaFormeProvjerena>({
    resolver: zodResolver(narudzbaFormeShema),
    defaultValues: {
      stavke: pocetniRetci(pocetneStavke, materijali),
      fotografije: [],
      narudzbaId: null,
      naselje: null,
      ulica: '',
      lat: null,
      lng: null,
      napomena: '',
      zeljeniDatum: null,
      dioDana: 'svejedno',
      imePrezime: '',
      mobitel: '',
      privola: false,
    },
  })
  const router = useRouter()
  // Kupac iz mjesta izvan našeg područja ne može dalje (vidi telefon u koraku 3).
  const naselje = useWatch({ control: forma.control, name: 'naselje' })
  const [korak, setKorak] = useState(0)
  // Broj fotografija koje se upravo smanjuju (korak 2) i traje li slanje fotografija.
  const [smanjujem, setSmanjujem] = useState(0)
  const [saljem, setSaljem] = useState(false)
  // Korak 4: Turnstile token, ključ za ponovno postavljanje widgeta i slanje narudžbe.
  const [token, setToken] = useState<string | null>(null)
  const [kljucTurnstilea, setKljucTurnstilea] = useState(0)
  const [saljemNarudzbu, setSaljemNarudzbu] = useState(false)
  // Ref uz stanje: drugi klik u istom trenutku ne pokreće drugo slanje.
  const slanjeUTijeku = useRef(false)
  const naslovRef = useRef<HTMLHeadingElement>(null)
  const prviPrikaz = useRef(true)

  // Nakon promjene koraka: na vrh stranice i fokus na naslov (čitači zaslona ga pročitaju).
  useEffect(() => {
    if (prviPrikaz.current) {
      prviPrikaz.current = false
      return
    }
    window.scrollTo({ top: 0 })
    naslovRef.current?.focus({ preventScroll: true })
  }, [korak])

  // Kad kupac napusti stranicu, oslobodi memoriju sličica.
  useEffect(() => {
    return () => {
      for (const f of forma.getValues('fotografije')) URL.revokeObjectURL(f.pregled)
    }
  }, [forma])

  // Šalje fotografije izravno u Supabase Storage (ne kroz naš server).
  // Ako su sve već poslane (kupac se samo vratio korak natrag), ne radi ništa.
  // Ako je dodana nova, sve se šalju ponovno pod novim id-om narudžbe.
  async function posaljiFotografije(): Promise<boolean> {
    const fotografije = forma.getValues('fotografije')
    if (forma.getValues('narudzbaId') !== null && fotografije.every((f) => f.putanja !== null)) {
      return true
    }

    setSaljem(true)
    try {
      const odgovor = await fetch('/api/narudzbe/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broj: fotografije.length }),
      })
      if (!odgovor.ok) throw new Error(`Ruta za upload vratila je ${odgovor.status}`)
      const { id, linkovi } = (await odgovor.json()) as UploadOdgovor

      const bucket = createClient().storage.from(BUCKET_FOTOGRAFIJA)
      await Promise.all(
        fotografije.map(async (f, i) => {
          const { error } = await bucket.uploadToSignedUrl(
            linkovi[i].putanja,
            linkovi[i].token,
            f.datoteka,
            { contentType: 'image/jpeg' },
          )
          if (error) throw error
        }),
      )

      forma.setValue(
        'fotografije',
        fotografije.map((f, i) => ({ ...f, putanja: linkovi[i].putanja })),
      )
      forma.setValue('narudzbaId', id)
      return true
    } catch (greska) {
      console.error('Slanje fotografija nije uspjelo:', greska)
      toast.error('Slanje fotografija nije uspjelo. Provjerite internet i pokušajte ponovno.')
      return false
    } finally {
      setSaljem(false)
    }
  }

  // Fotografije treba poslati ponovno (pod novim id-om) na koraku 2.
  function zaboraviFotografije() {
    forma.setValue(
      'fotografije',
      forma.getValues('fotografije').map((f) => ({ ...f, putanja: null })),
    )
    forma.setValue('narudzbaId', null)
  }

  // Šalje narudžbu na server (korak 4). Iznos se ne šalje: server ga računa sam.
  async function posaljiNarudzbu(v: NarudzbaFormeProvjerena) {
    if (slanjeUTijeku.current || token === null) return

    const putanje = v.fotografije.map((f) => f.putanja)
    if (v.narudzbaId === null || putanje.some((p) => p === null)) {
      // Ne bi se smjelo dogoditi (Dalje na koraku 2 šalje fotografije), ali za svaki slučaj.
      zaboraviFotografije()
      setKorak(1)
      toast.error('Fotografije nisu poslane. Pritisnite Dalje da ih pošaljemo.')
      return
    }

    const zahtjev: NarudzbaZahtjev = {
      id: v.narudzbaId,
      stavke: v.stavke.map((s) => ({
        klasaId: Number(s.klasaId),
        // Već provjereno shemom, pa broj sigurno postoji.
        kg: procitajKg(s.kgTekst).kg ?? 0,
      })),
      fotografije: putanje.filter((p) => p !== null),
      naseljeId: v.naselje?.id ?? 0,
      ulica: v.ulica,
      lat: v.lat,
      lng: v.lng,
      napomena: v.napomena,
      zeljeniDatum: v.zeljeniDatum ?? '',
      dioDana: v.dioDana,
      imePrezime: v.imePrezime,
      mobitel: v.mobitel,
      privola: true,
      turnstileToken: token,
      izvor: procitajIzvor(),
    }

    slanjeUTijeku.current = true
    setSaljemNarudzbu(true)
    let odgovor: NarudzbaOdgovor
    try {
      const r = await fetch('/api/narudzbe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zahtjev),
      })
      odgovor = (await r.json()) as NarudzbaOdgovor
    } catch (greska) {
      console.error('Slanje narudžbe nije uspjelo:', greska)
      odgovor = {
        kod: 'server',
        greska: 'Slanje nije uspjelo. Provjerite internet i pokušajte ponovno.',
      }
    }

    if ('broj' in odgovor) {
      // Gumb ostaje onemogućen dok se ne otvori stranica zahvale.
      router.replace(`/naruci/hvala?broj=${encodeURIComponent(odgovor.broj)}`)
      return
    }

    slanjeUTijeku.current = false
    setSaljemNarudzbu(false)
    // Turnstile token vrijedi samo jednom, pa za novi pokušaj treba novi.
    setToken(null)
    setKljucTurnstilea((k) => k + 1)

    switch (odgovor.kod) {
      case 'dan':
      case 'dan_popunjen':
        // Natrag na kalendar, koji se sam ponovno učita s novim slobodnim danima.
        forma.setValue('zeljeniDatum', null)
        forma.setError('zeljeniDatum', { message: odgovor.greska })
        setKorak(2)
        break
      case 'podrucje':
        setKorak(2)
        break
      case 'fotografije':
        zaboraviFotografije()
        setKorak(1)
        break
      case 'cjenik':
        setKorak(0)
        break
    }
    toast.error(odgovor.greska)
  }

  // Greška u formi na zadnjem koraku: odvedi kupca do prvog neispravnog polja.
  function fokusirajGresku() {
    requestAnimationFrame(() => {
      // data-fokus-greske imaju dijelovi koji nisu polja za unos (kalendar u koraku 3).
      document
        .querySelector<HTMLElement>('[aria-invalid="true"], [data-fokus-greske="true"]')
        ?.focus()
    })
  }

  async function dalje() {
    if (korak === 0) {
      // Potpuno prazni retci (dodani pa nepopunjeni) samo se uklone, ako ima i popunjenih.
      const stavke = forma.getValues('stavke')
      const popunjene = stavke.filter((s) => s.materijalId !== null || s.kgTekst.trim() !== '')
      if (popunjene.length > 0 && popunjene.length < stavke.length) {
        forma.setValue('stavke', popunjene)
      }
    }

    const polja = KORACI[korak].polja
    const ispravno = polja.length === 0 || (await forma.trigger(polja))
    if (!ispravno) {
      // Kupca odvedi do prvog polja s greškom (nakon što se greške prikažu).
      fokusirajGresku()
      return
    }
    if (korak === 1 && !(await posaljiFotografije())) return
    setKorak((k) => Math.min(k + 1, KORACI.length - 1))
  }

  const zadnji = korak === KORACI.length - 1
  // Dalje čeka dok se fotografije smanjuju ili šalju.
  const zauzeto = saljem || (korak === 1 && smanjujem > 0) || (korak === 2 && naselje?.pokrivena === false)
  // Slanje narudžbe čeka Turnstile token i ne smije krenuti dvaput.
  const mozeSlati = token !== null && !saljemNarudzbu

  return (
    <FormProvider {...forma}>
      <form
        noValidate
        onSubmit={(e) => {
          // Enter na tipkovnici = Dalje, a na zadnjem koraku = Pošalji narudžbu.
          e.preventDefault()
          if (!zadnji) {
            if (!zauzeto) void dalje()
          } else if (mozeSlati) {
            void forma.handleSubmit(posaljiNarudzbu, fokusirajGresku)()
          }
        }}
        className="flex flex-col gap-6"
      >
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">
                Korak {korak + 1} od {KORACI.length}
              </p>
              <h2 ref={naslovRef} tabIndex={-1} className="outline-none">
                {KORACI[korak].naslov}
              </h2>
            </div>
            {/* Traka napretka: popunjeni dijelovi su prijeđeni koraci. */}
            <ol className="grid grid-cols-4 gap-1.5" aria-hidden="true">
              {KORACI.map((k, i) => (
                <li
                  key={k.naslov}
                  className={cn('h-1.5 rounded-full', i <= korak ? 'bg-primary' : 'bg-muted')}
                />
              ))}
            </ol>
          </CardHeader>

          <CardContent>
            {korak === 0 && <KorakMaterijali materijali={materijali} />}
            {korak === 1 && (
              <KorakFotografije
                smanjujem={smanjujem}
                setSmanjujem={setSmanjujem}
                zakljucano={saljem}
              />
            )}
            {korak === 2 && <KorakLokacija />}
            {korak === 3 && (
              <KorakKontakt
                materijali={materijali}
                onToken={setToken}
                kljucTurnstilea={kljucTurnstilea}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          {korak > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setKorak((k) => Math.max(k - 1, 0))}
              disabled={saljem || saljemNarudzbu}
              className="flex-1 sm:flex-none"
            >
              <ArrowLeft />
              Natrag
            </Button>
          )}
          {zadnji && (
            <Button type="submit" disabled={!mozeSlati} className="flex-1 sm:ml-auto sm:flex-none">
              {saljemNarudzbu ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Šaljem narudžbu…
                </>
              ) : (
                <>
                  <Send />
                  Pošalji narudžbu
                </>
              )}
            </Button>
          )}
          {!zadnji && (
            <Button type="submit" disabled={zauzeto} className="flex-1 sm:ml-auto sm:flex-none">
              {saljem ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Šaljem fotografije…
                </>
              ) : korak === 1 && smanjujem > 0 ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Smanjujem…
                </>
              ) : (
                <>
                  Dalje
                  <ArrowRight />
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  )
}
