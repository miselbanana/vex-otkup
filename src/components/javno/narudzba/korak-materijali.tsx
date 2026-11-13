'use client'

import { useId } from 'react'
import { Plus } from 'lucide-react'
import { useFieldArray, useFormContext, useFormState, useWatch } from 'react-hook-form'
import { RedakStavke, type RedakVrijednosti } from '@/components/javno/redak-stavke'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field'
import type { MaterijalCjenika } from '@/lib/cjenik'
import { formatEur } from '@/lib/format'
import { NAJVISE_STAVKI, izracunajProcjenu, procitajKg, type StavkaUnos } from '@/lib/izracun'
import {
  praznaStavka,
  type NarudzbaForme,
  type NarudzbaFormeProvjerena,
} from '@/lib/validacija/narudzba'

// Korak 1: materijali, klase i količine, s okvirnim iznosom koji se računa uživo.
export function KorakMaterijali({ materijali }: { materijali: MaterijalCjenika[] }) {
  const idBaza = useId()
  const { control, setValue } = useFormContext<NarudzbaForme, unknown, NarudzbaFormeProvjerena>()
  // fields daje stalne ključeve redaka, a useWatch njihove trenutne vrijednosti.
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'stavke' })
  const stavke = useWatch({ control, name: 'stavke' }) ?? []
  const { errors } = useFormState({ control, name: 'stavke' })

  const sveKlase = materijali.flatMap((m) => m.klase)
  const unosi: StavkaUnos[] = []
  for (const s of stavke) {
    const { kg } = procitajKg(s.kgTekst)
    if (s.klasaId !== null && kg !== null) unosi.push({ klasaId: Number(s.klasaId), kg })
  }
  const procjena = izracunajProcjenu(unosi, sveKlase)

  function promijeni(i: number, izmjena: Partial<RedakVrijednosti>) {
    // Ako redak već prikazuje grešku, provjeri ga odmah, da greška nestane čim se ispravi.
    const opcije = { shouldValidate: errors.stavke?.[i] !== undefined, shouldDirty: true }
    if (izmjena.materijalId !== undefined) setValue(`stavke.${i}.materijalId`, izmjena.materijalId, opcije)
    if (izmjena.klasaId !== undefined) setValue(`stavke.${i}.klasaId`, izmjena.klasaId, opcije)
    if (izmjena.kgTekst !== undefined) setValue(`stavke.${i}.kgTekst`, izmjena.kgTekst, opcije)
  }

  function ukloni(i: number) {
    // Uvijek ostaje barem jedan (prazan) redak.
    if (fields.length === 1) replace([praznaStavka()])
    else remove(i)
  }

  const greskaPopisa = errors.stavke?.root?.message ?? errors.stavke?.message

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">
        Odaberite što predajete i upišite približnu količinu. Možete dodati više materijala.
      </p>

      <ol className="flex flex-col gap-3">
        {fields.map((polje, i) => {
          const greske = errors.stavke?.[i]
          return (
            <RedakStavke
              key={polje.id}
              id={`${idBaza}-${i}`}
              redniBroj={i + 1}
              materijali={materijali}
              vrijednost={stavke[i] ?? praznaStavka()}
              onPromjena={(izmjena) => promijeni(i, izmjena)}
              onUkloni={() => ukloni(i)}
              greske={{
                materijal: greske?.materijalId?.message,
                klasa: greske?.klasaId?.message,
                kg: greske?.kgTekst?.message,
              }}
            />
          )
        })}
      </ol>

      {greskaPopisa && <FieldError>{greskaPopisa}</FieldError>}

      {fields.length < NAJVISE_STAVKI && (
        <Button
          type="button"
          variant="outline"
          onClick={() => append(praznaStavka(), { shouldFocus: false })}
          className="self-start"
        >
          <Plus />
          Dodaj materijal
        </Button>
      )}

      <div className="flex flex-col gap-2 border-t pt-4">
        <p className="flex items-baseline justify-between gap-3 sm:justify-start">
          <span className="text-muted-foreground">Okvirni iznos</span>
          <span className="font-heading text-3xl font-bold tabular-nums" aria-live="polite">
            {formatEur(procjena.ukupno)}
          </span>
        </p>
        <p className="text-sm text-muted-foreground">
          Cijena po kg je fiksna. Ukupni iznos je procjena, a konačni iznos određuje se vaganjem
          i pregledom klase na licu mjesta.
        </p>
      </div>
    </div>
  )
}
