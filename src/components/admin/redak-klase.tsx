'use client'

import { useState, useTransition } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from 'cn'
import { toast } from 'sonner'
import {
  postaviAktivnu,
  spremiCijenu,
  type OdgovorCjenika,
} from '@/app/(admin)/admin/cjenik/akcije'
import { DijalogKlase } from '@/components/admin/dijalog-klase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { KlasaUredivanja } from '@/lib/admin/cjenik'
import { formatTrenutak } from '@/lib/datum'
import { formatCijenaUnos } from '@/lib/format'
import { procitajCijenu } from '@/lib/izracun'

// Jedna klasa u adminu cjenika: cijena (polje + Spremi), datum zadnje promjene cijene,
// Uredi (naziv i opis) i Uključi/Isključi.
// Stranica retku daje `key` složen od podataka iz baze, pa se nakon spremanja
// redak sam vrati u početno stanje s novom cijenom.
export function RedakKlase({ klasa, materijal }: { klasa: KlasaUredivanja; materijal: string }) {
  const [cijenaTekst, setCijenaTekst] = useState(formatCijenaUnos(klasa.cijena_po_kg))
  const [greska, setGreska] = useState<string | null>(null)
  const [spremaCijenu, zapocniCijenu] = useTransition()
  const [mijenjaAktivnu, zapocniAktivnu] = useTransition()

  const { cijena, greska: greskaUnosa } = procitajCijenu(cijenaTekst)
  const promijenjena = cijena !== null && cijena !== klasa.cijena_po_kg
  const poljeId = `cijena-${klasa.id}`
  const prikazGreske = greska ?? greskaUnosa

  function spremi(e: React.FormEvent) {
    e.preventDefault()
    if (cijena === null || cijena <= 0) {
      setGreska(greskaUnosa ?? 'Upišite cijenu veću od 0, npr. 7,20')
      return
    }
    if (!promijenjena) return
    zapocniCijenu(async () => {
      const odgovor = await pozovi(() => spremiCijenu(klasa.id, cijena))
      if (odgovor.greska) {
        setGreska(odgovor.greska)
        return
      }
      toast.success(`${klasa.naziv}: nova cijena ${formatCijenaUnos(cijena)} €/kg.`)
    })
  }

  function promijeniAktivnu() {
    const nova = !klasa.aktivna
    zapocniAktivnu(async () => {
      const odgovor = await pozovi(() => postaviAktivnu(klasa.id, nova))
      if (odgovor.greska) {
        toast.error(odgovor.greska)
        return
      }
      toast.success(
        nova
          ? `${klasa.naziv} je uključena i kupci je opet vide.`
          : `${klasa.naziv} je isključena. Kupci je više ne vide.`,
      )
    })
  }

  return (
    <li className="flex flex-col gap-2 border-t py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className={cn('flex flex-col gap-0.5', !klasa.aktivna && 'opacity-60')}>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{klasa.naziv}</h3>
          {!klasa.aktivna && <Badge variant="secondary">Isključena</Badge>}
        </div>
        {klasa.opis && <p className="text-sm text-muted-foreground">{klasa.opis}</p>}
      </div>

      <form onSubmit={spremi} className="flex flex-col gap-1">
        <label htmlFor={poljeId} className="sr-only">
          Cijena za {klasa.naziv} (€/kg)
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id={poljeId}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={cijenaTekst}
              onChange={(e) => {
                setCijenaTekst(e.target.value)
                setGreska(null)
              }}
              onFocus={(e) => e.target.select()}
              onBlur={() => {
                if (cijena !== null && formatCijenaUnos(cijena) !== cijenaTekst) {
                  setCijenaTekst(formatCijenaUnos(cijena))
                }
              }}
              aria-invalid={prikazGreske !== null || undefined}
              aria-describedby={prikazGreske ? `${poljeId}-greska` : undefined}
              className="pr-16 text-xl font-semibold tabular-nums"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
              €/kg
            </span>
          </div>
          <Button type="submit" disabled={!promijenjena || spremaCijenu} className="min-w-28">
            {spremaCijenu ? 'Spremam…' : 'Spremi'}
          </Button>
        </div>
        {prikazGreske ? (
          <p id={`${poljeId}-greska`} role="alert" className="text-sm font-medium text-destructive">
            {prikazGreske}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Cijena promijenjena: {formatTrenutak(klasa.azurirano, 'd. M. yyyy.')}
          </p>
        )}
      </form>

      <div className="grid grid-cols-2 gap-2">
        <DijalogKlase
          nacin="uredi"
          klasaId={klasa.id}
          materijal={materijal}
          naziv={klasa.naziv}
          opis={klasa.opis}
        />
        <Button variant="outline" disabled={mijenjaAktivnu} onClick={promijeniAktivnu}>
          {klasa.aktivna ? <EyeOff /> : <Eye />}
          {mijenjaAktivnu ? 'Spremam…' : klasa.aktivna ? 'Isključi' : 'Uključi'}
        </Button>
      </div>
    </li>
  )
}

// Poziv serverske akcije; pukla veza postaje obična poruka o grešci.
async function pozovi(akcija: () => Promise<OdgovorCjenika>): Promise<OdgovorCjenika> {
  try {
    return await akcija()
  } catch {
    return { greska: 'Veza ne radi. Pokušajte ponovno.' }
  }
}
