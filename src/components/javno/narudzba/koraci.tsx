'use client'

import { useEffect, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, LoaderCircle } from 'lucide-react'
import { FormProvider, useForm, type FieldPath } from 'react-hook-form'
import { toast } from 'sonner'
import { KorakFotografije } from '@/components/javno/narudzba/korak-fotografije'
import { KorakMaterijali } from '@/components/javno/narudzba/korak-materijali'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { MaterijalCjenika } from '@/lib/cjenik'
import { BUCKET_FOTOGRAFIJA, type UploadOdgovor } from '@/lib/fotografije'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { formatBrojUnos } from '@/lib/format'
import type { StavkaUnos } from '@/lib/izracun'
import {
  narudzbaFormeShema,
  praznaStavka,
  type NarudzbaForme,
  type NarudzbaFormeProvjerena,
  type StavkaForme,
} from '@/lib/validacija/narudzba'

// Koraci forme. `polja` su dijelovi forme koji se provjeravaju prije prelaska dalje.
const KORACI: { naslov: string; polja: FieldPath<NarudzbaForme>[] }[] = [
  { naslov: 'Materijali', polja: ['stavke'] },
  { naslov: 'Fotografije', polja: ['fotografije'] },
  { naslov: 'Lokacija i termin', polja: [] },
  { naslov: 'Kontakt', polja: [] },
]

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
    },
  })
  const [korak, setKorak] = useState(0)
  // Broj fotografija koje se upravo smanjuju (korak 2) i traje li slanje fotografija.
  const [smanjujem, setSmanjujem] = useState(0)
  const [saljem, setSaljem] = useState(false)
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
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      })
      return
    }
    if (korak === 1 && !(await posaljiFotografije())) return
    setKorak((k) => Math.min(k + 1, KORACI.length - 1))
  }

  const zadnji = korak === KORACI.length - 1
  // Dalje čeka dok se fotografije smanjuju ili šalju.
  const zauzeto = saljem || (korak === 1 && smanjujem > 0)

  return (
    <FormProvider {...forma}>
      <form
        noValidate
        onSubmit={(e) => {
          // Enter na tipkovnici = Dalje. Slanje narudžbe dolazi u koraku 1.6.
          e.preventDefault()
          if (!zadnji && !zauzeto) void dalje()
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
            {korak > 1 && (
              // Privremeno: ovi koraci se grade u 1.5 i 1.6.
              <p className="text-muted-foreground">Ovaj korak uskoro dolazi.</p>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          {korak > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setKorak((k) => Math.max(k - 1, 0))}
              disabled={saljem}
              className="flex-1 sm:flex-none"
            >
              <ArrowLeft />
              Natrag
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
