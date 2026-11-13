'use client'

import { useEffect, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { FormProvider, useForm, type FieldPath } from 'react-hook-form'
import { KorakMaterijali } from '@/components/javno/narudzba/korak-materijali'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { MaterijalCjenika } from '@/lib/cjenik'
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
  { naslov: 'Fotografije', polja: [] },
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
    defaultValues: { stavke: pocetniRetci(pocetneStavke, materijali) },
  })
  const [korak, setKorak] = useState(0)
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
    setKorak((k) => Math.min(k + 1, KORACI.length - 1))
  }

  const zadnji = korak === KORACI.length - 1

  return (
    <FormProvider {...forma}>
      <form
        noValidate
        onSubmit={(e) => {
          // Enter na tipkovnici = Dalje. Slanje narudžbe dolazi u koraku 1.6.
          e.preventDefault()
          if (!zadnji) void dalje()
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
            {korak > 0 && (
              // Privremeno: ovi koraci se grade u 1.4, 1.5 i 1.6.
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
              className="flex-1 sm:flex-none"
            >
              <ArrowLeft />
              Natrag
            </Button>
          )}
          {!zadnji && (
            <Button type="submit" className="flex-1 sm:ml-auto sm:flex-none">
              Dalje
              <ArrowRight />
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  )
}
