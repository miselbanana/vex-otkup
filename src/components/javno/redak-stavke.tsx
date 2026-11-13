'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { formatBrojUnos, formatEur } from '@/lib/format'
import { izracunajProcjenu, procitajKg } from '@/lib/izracun'

// Jedan redak, onako kako ga kupac trenutno ispunjava.
export type RedakVrijednosti = {
  materijalId: string | null
  klasaId: string | null
  // količina točno kako je upisana ("12,5")
  kgTekst: string
}

type Props = {
  // početak HTML id-jeva polja u ovom retku (mora biti jedinstven na stranici)
  id: string
  redniBroj: number
  materijali: MaterijalCjenika[]
  vrijednost: RedakVrijednosti
  onPromjena: (izmjena: Partial<RedakVrijednosti>) => void
  onUkloni: () => void
  // greške iz forme (nakon klika na Dalje)
  greske?: { materijal?: string; klasa?: string; kg?: string }
}

// Redak materijal → klasa → količina s iznosom retka.
// Koriste ga kalkulator na /cjenik i prvi korak narudžbe.
export function RedakStavke({
  id,
  redniBroj,
  materijali,
  vrijednost,
  onPromjena,
  onUkloni,
  greske,
}: Props) {
  const materijal = materijali.find((m) => String(m.id) === vrijednost.materijalId)
  const klasa = materijal?.klase.find((k) => String(k.id) === vrijednost.klasaId)

  const materijalStavke = materijali.map((m) => ({ value: String(m.id), label: m.naziv }))
  const klasaStavke =
    materijal?.klase.map((k) => ({
      value: String(k.id),
      label: `${k.naziv} — ${formatEur(k.cijena_po_kg)}/kg`,
    })) ?? []

  const { kg, greska: greskaUnosa } = procitajKg(vrijednost.kgTekst)
  // Greška dok se tipka ima prednost, a inače se prikazuje greška iz forme.
  const greskaKg = greskaUnosa ?? greske?.kg ?? null
  const iznos =
    klasa && kg !== null ? izracunajProcjenu([{ klasaId: klasa.id, kg }], [klasa]).ukupno : null

  return (
    <li className="flex flex-col gap-3 rounded-lg border bg-background p-3 sm:grid sm:grid-cols-2">
      <Field data-invalid={greske?.materijal !== undefined}>
        <FieldLabel htmlFor={`${id}-materijal`}>Materijal</FieldLabel>
        <Select
          id={`${id}-materijal`}
          items={materijalStavke}
          value={vrijednost.materijalId}
          onValueChange={(v) =>
            // Novi materijal znači i novu klasu, pa se stara briše.
            onPromjena({ materijalId: v, klasaId: null })
          }
        >
          <SelectTrigger className="w-full" aria-invalid={greske?.materijal !== undefined}>
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
        {greske?.materijal && <FieldError>{greske.materijal}</FieldError>}
      </Field>

      <Field data-disabled={!materijal} data-invalid={greske?.klasa !== undefined && !!materijal}>
        <FieldLabel htmlFor={`${id}-klasa`}>Klasa</FieldLabel>
        <Select
          id={`${id}-klasa`}
          items={klasaStavke}
          value={vrijednost.klasaId}
          onValueChange={(v) => onPromjena({ klasaId: v })}
          disabled={!materijal}
        >
          <SelectTrigger
            className="w-full"
            aria-invalid={greske?.klasa !== undefined && !!materijal}
          >
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
        {/* Bez materijala je dovoljna greška kod materijala. */}
        {greske?.klasa && materijal && <FieldError>{greske.klasa}</FieldError>}
      </Field>

      <Field data-invalid={greskaKg !== null} className="sm:col-span-2">
        <FieldLabel htmlFor={`${id}-kg`}>Količina</FieldLabel>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:max-w-48">
            <Input
              id={`${id}-kg`}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="npr. 12,5"
              value={vrijednost.kgTekst}
              onChange={(e) => onPromjena({ kgTekst: e.target.value })}
              // Nakon upisa broj se prepiše u jasan oblik ("1.500" → "1500",
              // "1.237,59" → "1237,59"), da kupac vidi kako je shvaćen.
              onBlur={() => {
                if (kg !== null && formatBrojUnos(kg) !== vrijednost.kgTekst) {
                  onPromjena({ kgTekst: formatBrojUnos(kg) })
                }
              }}
              aria-invalid={greskaKg !== null}
              aria-describedby={greskaKg ? `${id}-kg-greska` : undefined}
              className="pr-10 tabular-nums"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
              kg
            </span>
          </div>
          <span className="ml-auto font-semibold tabular-nums whitespace-nowrap">
            {iznos !== null ? formatEur(iznos) : '—'}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onUkloni}
            aria-label={`Ukloni redak ${redniBroj}`}
          >
            <Trash2 />
          </Button>
        </div>
        {greskaKg && <FieldError id={`${id}-kg-greska`}>{greskaKg}</FieldError>}
      </Field>
    </li>
  )
}
