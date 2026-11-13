'use client'

import { useLayoutEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  realiziraj,
  type OdgovorAkcije,
  type StavkaRealizacije,
} from '@/app/(admin)/admin/narudzbe/akcije'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { MaterijalAdmin } from '@/lib/admin/cjenik'
import { nazivStavke } from '@/lib/admin/oznake'
import { formatBrojUnos, formatCijenaUnos, formatEur } from '@/lib/format'
import { NAJVISE_STAVKI, izracunajIsplatu, procitajCijenu, procitajKg } from '@/lib/izracun'

// Početno stanje jedne stavke (složi ga stranica na serveru).
export type PocetniRedak = {
  // id stavke u bazi
  id: number
  // "Bakar sjajni · 12,5 kg"; null = stavku je Vedran dodao pri vaganju
  prijavljeno: string | null
  klasaId: number
  kgTekst: string
  cijenaTekst: string
}

type Redak = {
  kljuc: string
  id: number | null
  prijavljeno: string | null
  klasaId: string | null
  kgTekst: string
  cijenaTekst: string
}

type KlasaPodaci = { naziv: string; cijena: number; aktivna: boolean }

// Upis stvarnih vrijednosti nakon vaganja (1.10). Stavke su unaprijed popunjene,
// a Vedran mijenja samo ono što odstupa. Iznos se računa uživo, ali ga sprema baza.
export function FormaRealizacije({
  id,
  broj,
  uredivanje,
  materijali,
  pocetni,
}: {
  id: string
  broj: string
  // true = narudžba je već realizirana i ovo je ispravak
  uredivanje: boolean
  materijali: MaterijalAdmin[]
  pocetni: PocetniRedak[]
}) {
  const router = useRouter()
  const [retci, setRetci] = useState<Redak[]>(() =>
    pocetni.map((r) => ({ ...r, kljuc: `s${r.id}`, klasaId: String(r.klasaId) })),
  )
  const [pokusano, setPokusano] = useState(false)
  const [greska, setGreska] = useState<string | null>(null)
  const [gotovo, setGotovo] = useState(false)
  const [radi, zapocni] = useTransition()
  const brojac = useRef(0)
  const spremljeno = useRef(false)

  // Next.js (cacheComponents) stranicu pri odlasku ne briše nego je sakrije i zapamti
  // joj stanje. Nakon uspješnog spremanja forma se zato pri skrivanju vraća u početno
  // stanje, inače bi "Uredi realizaciju" otvorio formu koja i dalje piše "Spremam…".
  // Nove vrijednosti iz baze donosi `key` na stranici (forma se tada složi ispočetka).
  useLayoutEffect(() => {
    return () => {
      if (!spremljeno.current) return
      spremljeno.current = false
      setGotovo(false)
      setPokusano(false)
      setGreska(null)
    }
  }, [])

  // Sve klase po id-u: naziv za prikaz, današnja cijena i je li još u ponudi.
  const klase = new Map<string, KlasaPodaci>()
  for (const m of materijali) {
    for (const k of m.klase) {
      klase.set(String(k.id), {
        naziv: nazivStavke(m.naziv, k.naziv),
        cijena: k.cijena_po_kg,
        aktivna: k.aktivna,
      })
    }
  }

  // Svaki redak pročitan: vrijednosti (ili null) i poruke grešaka.
  const procitani = retci.map((r) => {
    const { kg, greska: greskaKg } = procitajKg(r.kgTekst, { dopustiNulu: r.id !== null })
    const { cijena, greska: greskaCijene } = procitajCijenu(r.cijenaTekst)
    const klasa = r.klasaId ? klase.get(r.klasaId) : undefined
    return {
      kg,
      cijena,
      klasa,
      greske: {
        klasa: pokusano && !klasa ? 'Odaberite klasu' : undefined,
        kg: greskaKg ?? (pokusano && kg === null ? 'Upišite kilograme' : undefined),
        cijena: greskaCijene ?? (pokusano && cijena === null ? 'Upišite cijenu' : undefined),
      },
    }
  })

  const ispravni = procitani.flatMap((p) =>
    p.kg !== null && p.cijena !== null ? [{ kg: p.kg, cijenaKg: p.cijena }] : [],
  )
  const { ukupno } = izracunajIsplatu(ispravni)
  const ukupnoKg = ispravni.reduce((zbroj, s) => zbroj + Math.round(s.kg * 100), 0) / 100

  function promijeni(kljuc: string, izmjena: Partial<Redak>) {
    setGreska(null)
    setRetci((stari) => stari.map((r) => (r.kljuc === kljuc ? { ...r, ...izmjena } : r)))
  }

  function dodaj() {
    brojac.current += 1
    setRetci((stari) => [
      ...stari,
      {
        kljuc: `n${brojac.current}`,
        id: null,
        prijavljeno: null,
        klasaId: null,
        kgTekst: '',
        cijenaTekst: '',
      },
    ])
  }

  function ukloni(kljuc: string) {
    setGreska(null)
    setRetci((stari) => stari.filter((r) => r.kljuc !== kljuc))
  }

  function spremi() {
    setPokusano(true)
    setGreska(null)

    const stavke: StavkaRealizacije[] = []
    for (const [i, p] of procitani.entries()) {
      if (!p.klasa || p.kg === null || p.cijena === null) break
      stavke.push({
        id: retci[i].id,
        klasaId: Number(retci[i].klasaId),
        kg: p.kg,
        cijenaKg: p.cijena,
      })
    }
    if (stavke.length !== retci.length) {
      setGreska('Ispravite označena polja.')
      // Fokus na prvo neispravno polje (nakon što se greške prikažu).
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>('[data-realizacija] [aria-invalid="true"]')?.focus(),
      )
      return
    }
    if (ukupnoKg <= 0) {
      setGreska('Ukupno mora biti više od 0 kg. Ako ništa nije preuzeto, otkažite narudžbu.')
      return
    }

    zapocni(async () => {
      let odgovor: OdgovorAkcije
      try {
        odgovor = await realiziraj(id, stavke)
      } catch {
        odgovor = { greska: 'Veza ne radi. Pokušajte ponovno.' }
      }
      if (odgovor.greska) {
        setGreska(odgovor.greska)
        return
      }
      setGotovo(true)
      spremljeno.current = true
      toast.success(
        uredivanje ? `Realizacija #${broj} je ispravljena.` : `Narudžba #${broj} je realizirana.`,
      )
      router.push(`/admin/narudzbe/${id}`)
    })
  }

  return (
    <div className="flex flex-col gap-3" data-realizacija>
      <ul className="flex flex-col gap-3">
        {retci.map((r, i) => {
          const p = procitani[i]
          const iznos =
            p.kg !== null && p.cijena !== null
              ? izracunajIsplatu([{ kg: p.kg, cijenaKg: p.cijena }]).ukupno
              : null
          return (
            <RedakRealizacije
              key={r.kljuc}
              redak={r}
              redniBroj={i + 1}
              materijali={materijali}
              klase={klase}
              iznos={iznos}
              cijena={p.cijena}
              greske={p.greske}
              onPromjena={(izmjena) => promijeni(r.kljuc, izmjena)}
              onUkloni={() => ukloni(r.kljuc)}
            />
          )
        })}
      </ul>

      {retci.length < NAJVISE_STAVKI && (
        <Button type="button" variant="outline" className="w-full" onClick={dodaj}>
          <Plus />
          Dodaj stavku
        </Button>
      )}

      {/* Traka s iznosom i spremanjem ostaje vidljiva iznad donje navigacije. */}
      <div className="sticky bottom-[calc(4rem+1px+env(safe-area-inset-bottom))] z-30 -mx-4 mt-2 flex flex-col gap-2 border-t bg-card px-4 py-3 shadow-panel">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-muted-foreground">
            Za isplatu
            <span className="tabular-nums"> · {formatBrojUnos(ukupnoKg)} kg</span>
          </span>
          <span className="font-heading text-2xl font-semibold tabular-nums">
            {formatEur(ukupno)}
          </span>
        </div>
        {greska && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {greska}
          </p>
        )}
        <Button type="button" className="w-full" disabled={radi || gotovo} onClick={spremi}>
          <Check />
          {radi || gotovo
            ? 'Spremam…'
            : uredivanje
              ? 'Spremi izmjene'
              : 'Spremi i označi realiziranom'}
        </Button>
      </div>
    </div>
  )
}

function RedakRealizacije({
  redak: r,
  redniBroj,
  materijali,
  klase,
  iznos,
  cijena,
  greske,
  onPromjena,
  onUkloni,
}: {
  redak: Redak
  redniBroj: number
  materijali: MaterijalAdmin[]
  klase: Map<string, KlasaPodaci>
  iznos: number | null
  cijena: number | null
  greske: { klasa?: string; kg?: string; cijena?: string }
  onPromjena: (izmjena: Partial<Redak>) => void
  onUkloni: () => void
}) {
  const id = `stavka-${r.kljuc}`
  const klasa = r.klasaId ? klase.get(r.klasaId) : undefined

  // U izborniku su aktivne klase i trenutna klasa retka (ako je u međuvremenu ugašena).
  const grupe = materijali
    .map((m) => ({
      ...m,
      klase: m.klase.filter((k) => k.aktivna || String(k.id) === r.klasaId),
    }))
    .filter((m) => m.klase.length > 0)
  const stavkeIzbornika = grupe.flatMap((m) =>
    m.klase.map((k) => ({ value: String(k.id), label: nazivStavke(m.naziv, k.naziv) })),
  )

  const drugaCijena = klasa && cijena !== null && cijena !== klasa.cijena

  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-kartica">
      <div className="flex min-h-6 items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {r.prijavljeno ? `Prijavljeno: ${r.prijavljeno}` : 'Dodano pri vaganju'}
        </p>
        {r.id === null && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="-my-3 -mr-2"
            onClick={onUkloni}
            aria-label={`Ukloni stavku ${redniBroj}`}
          >
            <Trash2 />
          </Button>
        )}
      </div>

      <Field data-invalid={greske.klasa !== undefined}>
        <FieldLabel htmlFor={`${id}-klasa`}>Klasa</FieldLabel>
        <Select
          id={`${id}-klasa`}
          items={stavkeIzbornika}
          value={r.klasaId}
          onValueChange={(v) => {
            // Nova klasa donosi svoju današnju cijenu iz cjenika.
            const nova = v ? klase.get(v) : undefined
            onPromjena({ klasaId: v, ...(nova && { cijenaTekst: formatCijenaUnos(nova.cijena) }) })
          }}
        >
          <SelectTrigger className="w-full" aria-invalid={greske.klasa !== undefined}>
            <SelectValue placeholder="Odaberite klasu" />
          </SelectTrigger>
          <SelectContent>
            {grupe.map((m) => (
              <SelectGroup key={m.id}>
                <SelectLabel>{m.naziv}</SelectLabel>
                {m.klase.map((k) => (
                  <SelectItem key={k.id} value={String(k.id)}>
                    {k.naziv} — {formatEur(k.cijena_po_kg)}/kg
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        {greske.klasa && <FieldError>{greske.klasa}</FieldError>}
      </Field>

      <div className="grid grid-cols-[1fr_7.5rem] gap-2">
        <Field data-invalid={greske.kg !== undefined}>
          <FieldLabel htmlFor={`${id}-kg`}>Kilogrami</FieldLabel>
          <div className="relative">
            <Input
              id={`${id}-kg`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={r.kgTekst}
              onChange={(e) => onPromjena({ kgTekst: e.target.value })}
              onFocus={(e) => e.target.select()}
              onBlur={() => {
                const { kg } = procitajKg(r.kgTekst, { dopustiNulu: r.id !== null })
                if (kg !== null && formatBrojUnos(kg) !== r.kgTekst) {
                  onPromjena({ kgTekst: formatBrojUnos(kg) })
                }
              }}
              aria-invalid={greske.kg !== undefined}
              aria-describedby={greske.kg ? `${id}-kg-greska` : undefined}
              className="h-14 pr-11 text-2xl font-semibold tabular-nums"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
              kg
            </span>
          </div>
        </Field>

        <Field data-invalid={greske.cijena !== undefined}>
          <FieldLabel htmlFor={`${id}-cijena`}>€/kg</FieldLabel>
          <Input
            id={`${id}-cijena`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={r.cijenaTekst}
            onChange={(e) => onPromjena({ cijenaTekst: e.target.value })}
            onFocus={(e) => e.target.select()}
            onBlur={() => {
              const { cijena: c } = procitajCijenu(r.cijenaTekst)
              if (c !== null && formatCijenaUnos(c) !== r.cijenaTekst) {
                onPromjena({ cijenaTekst: formatCijenaUnos(c) })
              }
            }}
            aria-invalid={greske.cijena !== undefined}
            aria-describedby={greske.cijena ? `${id}-cijena-greska` : undefined}
            className="h-14 text-lg tabular-nums"
          />
        </Field>
      </div>

      {greske.kg && <FieldError id={`${id}-kg-greska`}>{greske.kg}</FieldError>}
      {greske.cijena && <FieldError id={`${id}-cijena-greska`}>{greske.cijena}</FieldError>}

      <div className="flex items-end justify-between gap-3">
        <FieldDescription className="text-sm">
          {drugaCijena
            ? `Cjenik danas: ${formatEur(klasa.cijena)}/kg`
            : r.id !== null
              ? 'Upišite 0 ako tog materijala nije bilo.'
              : ''}
        </FieldDescription>
        <span className="shrink-0 text-lg font-semibold tabular-nums">
          {iznos !== null ? formatEur(iznos) : '—'}
        </span>
      </div>
    </li>
  )
}
