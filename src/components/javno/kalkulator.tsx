'use client'

import { useId, useRef, useState } from 'react'
import Link from 'next/link'
import { Plus, Trash2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { MaterijalCjenika } from '@/lib/cjenik'
import { formatBrojUnos, formatEur, parseBroj } from '@/lib/format'
import { NAJVISE_KG, izracunajProcjenu, stavkeUUrl, type StavkaUnos } from '@/lib/izracun'

// Jedan redak kalkulatora, onako kako ga kupac trenutno ispunjava.
type Redak = {
  kljuc: string
  materijalId: string | null
  klasaId: string | null
  // količina točno kako je upisana ("12,5"), čita se s parseBroj()
  kgTekst: string
}

function prazanRedak(kljuc: string): Redak {
  return { kljuc, materijalId: null, klasaId: null, kgTekst: '' }
}

// Pretvara upisanu količinu u broj ili vraća poruku o grešci.
function procitajKg(tekst: string): { kg: number | null; greska: string | null } {
  if (tekst.trim() === '') return { kg: null, greska: null }
  // Kupac je upisao "12," i još tipka decimale, pa to još nije greška.
  if (/^\d[\d.,]*[.,]$/.test(tekst.trim())) return { kg: null, greska: null }
  const kg = parseBroj(tekst)
  if (kg === null) return { kg: null, greska: 'Upišite broj, npr. 12,5' }
  if (kg <= 0) return { kg: null, greska: 'Količina mora biti veća od 0' }
  if (kg > NAJVISE_KG) {
    return { kg: null, greska: `Najviše ${NAJVISE_KG.toLocaleString('hr-HR')} kg po retku` }
  }
  return { kg, greska: null }
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

  function promijeni(kljuc: string, izmjena: Partial<Redak>) {
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

  const materijalStavke = materijali.map((m) => ({ value: String(m.id), label: m.naziv }))

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
          {retci.map((r, i) => {
            const materijal = materijali.find((m) => String(m.id) === r.materijalId)
            const klasa = materijal?.klase.find((k) => String(k.id) === r.klasaId)
            const klasaStavke =
              materijal?.klase.map((k) => ({
                value: String(k.id),
                label: `${k.naziv} — ${formatEur(k.cijena_po_kg)}/kg`,
              })) ?? []
            const { kg, greska } = procitajKg(r.kgTekst)
            const iznosRetka = procjena.stavke.find(
              (s) => String(s.klasaId) === r.klasaId && s.kg === kg,
            )?.iznos
            const id = `${idBaza}-${r.kljuc}`

            return (
              <li
                key={r.kljuc}
                className="flex flex-col gap-3 rounded-lg border bg-background p-3 sm:grid sm:grid-cols-2"
              >
                <Field>
                  <FieldLabel htmlFor={`${id}-materijal`}>Materijal</FieldLabel>
                  <Select
                    id={`${id}-materijal`}
                    items={materijalStavke}
                    value={r.materijalId}
                    onValueChange={(v) =>
                      // Novi materijal znači i novu klasu, pa se stara briše.
                      promijeni(r.kljuc, { materijalId: v, klasaId: null })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Odaberite materijal" />
                    </SelectTrigger>
                    <SelectContent>
                      {materijalStavke.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field data-disabled={!materijal}>
                  <FieldLabel htmlFor={`${id}-klasa`}>Klasa</FieldLabel>
                  <Select
                    id={`${id}-klasa`}
                    items={klasaStavke}
                    value={r.klasaId}
                    onValueChange={(v) => promijeni(r.kljuc, { klasaId: v })}
                    disabled={!materijal}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={materijal ? 'Odaberite klasu' : 'Prvo odaberite materijal'}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {klasaStavke.map((k) => (
                        <SelectItem key={k.value} value={k.value}>
                          {k.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {klasa?.opis && <FieldDescription>{klasa.opis}</FieldDescription>}
                </Field>

                <Field data-invalid={greska !== null} className="sm:col-span-2">
                  <FieldLabel htmlFor={`${id}-kg`}>Količina</FieldLabel>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:max-w-48">
                      <Input
                        id={`${id}-kg`}
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="npr. 12,5"
                        value={r.kgTekst}
                        onChange={(e) => promijeni(r.kljuc, { kgTekst: e.target.value })}
                        // Nakon upisa broj se prepiše u jasan oblik ("1.500" → "1500",
                        // "1.237,59" → "1237,59"), da kupac vidi kako je shvaćen.
                        onBlur={() => {
                          if (kg !== null) promijeni(r.kljuc, { kgTekst: formatBrojUnos(kg) })
                        }}
                        aria-invalid={greska !== null}
                        aria-describedby={greska ? `${id}-kg-greska` : undefined}
                        className="pr-10 tabular-nums"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
                        kg
                      </span>
                    </div>
                    <span className="ml-auto font-semibold tabular-nums whitespace-nowrap">
                      {iznosRetka !== undefined ? formatEur(iznosRetka) : '—'}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => obrisiRedak(r.kljuc)}
                      aria-label={`Ukloni redak ${i + 1}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  {greska && <FieldError id={`${id}-kg-greska`}>{greska}</FieldError>}
                </Field>
              </li>
            )
          })}
        </ol>

        <Button type="button" variant="outline" onClick={dodajRedak} className="self-start">
          <Plus />
          Dodaj materijal
        </Button>

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
