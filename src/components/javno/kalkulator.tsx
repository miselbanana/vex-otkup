'use client'

import { useId, useRef, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { RedakStavke, type RedakVrijednosti } from '@/components/javno/redak-stavke'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { MaterijalCjenika } from '@/lib/cjenik'
import { formatEur } from '@/lib/format'
import {
  NAJVISE_STAVKI,
  izracunajProcjenu,
  procitajKg,
  stavkeUUrl,
  type StavkaUnos,
} from '@/lib/izracun'

// Jedan redak kalkulatora sa stalnim ključem (za React).
type Redak = RedakVrijednosti & { kljuc: string }

function prazanRedak(kljuc: string): Redak {
  return { kljuc, materijalId: null, klasaId: null, kgTekst: '' }
}

// Kalkulator: kupac bira materijal, klasu i količinu, a okvirni iznos se računa uživo.
export function Kalkulator({ materijali }: { materijali: MaterijalCjenika[] }) {
  const idBaza = useId()
  // Brojač za ključeve novih redaka. Prvi redak ima stalan ključ, da se server i preglednik slažu.
  const sljedeci = useRef(1)
  const [retci, setRetci] = useState<Redak[]>([prazanRedak('r0')])

  const sveKlase = materijali.flatMap((m) => m.klase)

  // Ispravni retci (odabrana klasa + ispravna količina) ulaze u izračun.
  const stavke: StavkaUnos[] = []
  for (const r of retci) {
    const { kg } = procitajKg(r.kgTekst)
    if (r.klasaId !== null && kg !== null) stavke.push({ klasaId: Number(r.klasaId), kg })
  }
  const procjena = izracunajProcjenu(stavke, sveKlase)

  function promijeni(kljuc: string, izmjena: Partial<RedakVrijednosti>) {
    setRetci((stari) => stari.map((r) => (r.kljuc === kljuc ? { ...r, ...izmjena } : r)))
  }

  function dodajRedak() {
    setRetci((stari) => [...stari, prazanRedak(`r${sljedeci.current++}`)])
  }

  function obrisiRedak(kljuc: string) {
    setRetci((stari) => {
      const ostali = stari.filter((r) => r.kljuc !== kljuc)
      // Uvijek ostaje barem jedan (prazan) redak.
      return ostali.length > 0 ? ostali : [prazanRedak(`r${sljedeci.current++}`)]
    })
  }

  return (
    <Card id="kalkulator" className="scroll-mt-20">
      <CardHeader>
        <h2>Izračunajte okvirni iznos</h2>
        <p className="text-muted-foreground">
          Odaberite materijal i klasu te upišite približnu količinu.
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <ol className="flex flex-col gap-3">
          {retci.map((r, i) => (
            <RedakStavke
              key={r.kljuc}
              id={`${idBaza}-${r.kljuc}`}
              redniBroj={i + 1}
              materijali={materijali}
              vrijednost={r}
              onPromjena={(izmjena) => promijeni(r.kljuc, izmjena)}
              onUkloni={() => obrisiRedak(r.kljuc)}
            />
          ))}
        </ol>

        {retci.length < NAJVISE_STAVKI && (
          <Button type="button" variant="outline" onClick={dodajRedak} className="self-start">
            <Plus />
            Dodaj materijal
          </Button>
        )}

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-baseline justify-between gap-3 sm:justify-start">
            <span className="text-muted-foreground">Okvirni iznos</span>
            <span
              className="font-heading text-3xl font-bold tabular-nums"
              aria-live="polite"
            >
              {formatEur(procjena.ukupno)}
            </span>
          </p>

          {procjena.stavke.length > 0 ? (
            <Link
              href={`/naruci?s=${stavkeUUrl(procjena.stavke)}`}
              className={buttonVariants({ className: 'w-full sm:w-auto' })}
            >
              Naruči odvoz
            </Link>
          ) : (
            <Button disabled className="w-full sm:w-auto">
              Naruči odvoz
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          Cijena po kg je fiksna. Ukupni iznos je procjena, a konačni iznos određuje se vaganjem
          i pregledom klase na licu mjesta.
        </p>
      </CardContent>
    </Card>
  )
}
