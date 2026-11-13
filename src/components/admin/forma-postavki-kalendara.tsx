'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  spremiPostavkeKalendara,
  type OdgovorPostavki,
} from '@/app/(admin)/admin/postavke/akcije'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { formatBrojUnos, parseBroj } from '@/lib/format'
import {
  bodovaRijec,
  postavkeKalendaraShema,
  type PostavkeKalendara,
} from '@/lib/validacija/postavke'

type Polje = keyof PostavkeKalendara

// Kapacitet dana i bodovi prema zračnoj udaljenosti od polazišta (1.5, uređuje se u 1.11).
// Stranica formi daje `key` složen od podataka iz baze, pa nakon spremanja kreće ispočetka.
export function FormaPostavkiKalendara({
  pocetno,
  polaziste,
}: {
  pocetno: PostavkeKalendara
  polaziste: string
}) {
  const [tekst, setTekst] = useState<Record<Polje, string>>(() => ({
    kapacitet: formatBrojUnos(pocetno.kapacitet),
    granica1: formatBrojUnos(pocetno.granica1),
    bodovi1: formatBrojUnos(pocetno.bodovi1),
    granica2: formatBrojUnos(pocetno.granica2),
    bodovi2: formatBrojUnos(pocetno.bodovi2),
    bodoviDalje: formatBrojUnos(pocetno.bodoviDalje),
  }))
  const [greska, setGreska] = useState<string | null>(null)
  const [radi, zapocni] = useTransition()

  // Sva polja pročitana kao brojevi; ako bilo koje nije broj, provjera ne prolazi.
  const brojevi = Object.fromEntries(
    Object.entries(tekst).map(([kljuc, vrijednost]) => [kljuc, parseBroj(vrijednost) ?? NaN]),
  ) as PostavkeKalendara
  const provjera = postavkeKalendaraShema.safeParse(brojevi)
  const promijenjeno = (Object.keys(tekst) as Polje[]).some((k) => brojevi[k] !== pocetno[k])

  function postavi(polje: Polje, vrijednost: string) {
    setTekst((t) => ({ ...t, [polje]: vrijednost }))
    setGreska(null)
  }

  function spremi(e: React.FormEvent) {
    e.preventDefault()
    if (!provjera.success) {
      const poruka = provjera.error.issues.find((i) => i.code === 'custom')?.message
      setGreska(
        poruka ?? 'Bodovi su cijeli brojevi od 1 do 20, a granice od 1 do 500 km (npr. 30 ili 30,5).',
      )
      return
    }
    const podaci = provjera.data
    zapocni(async () => {
      let odgovor: OdgovorPostavki
      try {
        odgovor = await spremiPostavkeKalendara(podaci)
      } catch {
        odgovor = { greska: 'Veza ne radi. Pokušajte ponovno.' }
      }
      if (odgovor.greska) {
        setGreska(odgovor.greska)
        return
      }
      toast.success('Postavke kalendara su spremljene.')
    })
  }

  // Polje s oznakom iznad i jedinicom u polju ("km" ili "bod/boda/bodova" prema broju).
  function polje(kljuc: Polje, oznaka: string, vrsta: 'km' | 'bodovi') {
    const broj = brojevi[kljuc]
    const jedinica =
      vrsta === 'km' ? 'km' : Number.isInteger(broj) ? bodovaRijec(broj) : 'bodova'
    return (
      <Field>
        <FieldLabel htmlFor={`postavke-${kljuc}`}>{oznaka}</FieldLabel>
        <div className="relative">
          <Input
            id={`postavke-${kljuc}`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={tekst[kljuc]}
            onChange={(e) => postavi(kljuc, e.target.value)}
            onFocus={(e) => e.target.select()}
            aria-invalid={Number.isNaN(brojevi[kljuc]) || undefined}
            className="pr-16 text-lg font-semibold tabular-nums"
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
            {jedinica}
          </span>
        </div>
      </Field>
    )
  }

  const p = provjera.success ? provjera.data : null

  return (
    <form onSubmit={spremi} className="flex flex-col gap-5">
      <p className="text-muted-foreground">
        Udaljenost je zračna, od polazišta {polaziste}. Cestom je otprilike 1,5 puta više.
      </p>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">Blizu</legend>
        <div className="grid grid-cols-2 gap-3">
          {polje('granica1', 'Do', 'km')}
          {polje('bodovi1', 'Troši', 'bodovi')}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">Srednje</legend>
        <div className="grid grid-cols-2 gap-3">
          {polje('granica2', 'Do', 'km')}
          {polje('bodovi2', 'Troši', 'bodovi')}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">Daleko</legend>
        <div className="grid grid-cols-2 gap-3">
          <p className="self-end pb-3 text-muted-foreground">
            Preko {p ? formatBrojUnos(p.granica2) : '…'} km
          </p>
          {polje('bodoviDalje', 'Troši', 'bodovi')}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">Dan</legend>
        <div className="grid grid-cols-2 gap-3">
          {polje('kapacitet', 'Ima', 'bodovi')}
        </div>
      </fieldset>

      {p && (
        <p className="rounded-lg bg-muted px-3 py-2 text-sm">
          Narudžba do {formatBrojUnos(p.granica1)} km troši {p.bodovi1} {bodovaRijec(p.bodovi1)},
          do {formatBrojUnos(p.granica2)} km {p.bodovi2} {bodovaRijec(p.bodovi2)}, a dalje{' '}
          {p.bodoviDalje} {bodovaRijec(p.bodoviDalje)}. U jedan dan stane {p.kapacitet}{' '}
          {bodovaRijec(p.kapacitet)}.
        </p>
      )}

      <p className="text-sm text-muted-foreground">
        Promjena vrijedi za nove narudžbe. Postojeće zadržavaju bodove iz trenutka narudžbe.
      </p>

      {greska && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {greska}
        </p>
      )}

      <Button type="submit" disabled={!promijenjeno || radi}>
        {radi ? 'Spremam…' : 'Spremi postavke'}
      </Button>
    </form>
  )
}
