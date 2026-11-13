'use client'

import { useId } from 'react'
import { useFormContext, useFormState, useWatch } from 'react-hook-form'
import { Turnstile } from '@/components/javno/turnstile'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { MaterijalCjenika } from '@/lib/cjenik'
import { formatDan } from '@/lib/datum'
import { formatBrojUnos, formatEur } from '@/lib/format'
import { izracunajProcjenu, procitajKg, type StavkaUnos } from '@/lib/izracun'
import {
  NAZIVI_DIJELA_DANA,
  type NarudzbaForme,
  type NarudzbaFormeProvjerena,
} from '@/lib/validacija/narudzba'

// Korak 4: ime, mobitel, privola, sažetak narudžbe i provjera da kupac nije robot.
export function KorakKontakt({
  materijali,
  onToken,
  kljucTurnstilea,
}: {
  materijali: MaterijalCjenika[]
  onToken: (token: string | null) => void
  // promjena ključa ponovno postavlja Turnstile (nakon neuspjelog slanja)
  kljucTurnstilea: number
}) {
  const id = useId()
  const { control, register } = useFormContext<NarudzbaForme, unknown, NarudzbaFormeProvjerena>()
  const { errors } = useFormState({ control, name: ['imePrezime', 'mobitel', 'privola'] })

  return (
    <div className="flex flex-col gap-6">
      <Field data-invalid={errors.imePrezime !== undefined}>
        <FieldLabel htmlFor={`${id}-ime`}>Ime i prezime</FieldLabel>
        <Input
          id={`${id}-ime`}
          autoComplete="name"
          maxLength={100}
          aria-invalid={errors.imePrezime !== undefined}
          {...register('imePrezime')}
        />
        {errors.imePrezime && <FieldError>{errors.imePrezime.message}</FieldError>}
      </Field>

      <Field data-invalid={errors.mobitel !== undefined}>
        <FieldLabel htmlFor={`${id}-mobitel`}>Mobitel</FieldLabel>
        <Input
          id={`${id}-mobitel`}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="npr. 091 234 5678"
          maxLength={30}
          aria-invalid={errors.mobitel !== undefined}
          {...register('mobitel')}
        />
        {errors.mobitel && <FieldError>{errors.mobitel.message}</FieldError>}
      </Field>

      <Sazetak materijali={materijali} />

      <Field data-invalid={errors.privola !== undefined}>
        {/* Cijeli redak je dodirna površina (najmanje 48 px). */}
        <label htmlFor={`${id}-privola`} className="flex min-h-12 cursor-pointer items-start gap-3">
          <input
            id={`${id}-privola`}
            type="checkbox"
            className="mt-0.5 size-6 shrink-0 cursor-pointer accent-primary"
            aria-invalid={errors.privola !== undefined}
            {...register('privola')}
          />
          <span>
            Pristajem da se moji podaci (ime, mobitel, lokacija i fotografije) koriste radi
            dogovora i odvoza, prema{' '}
            <a
              href="/politika-privatnosti"
              target="_blank"
              rel="noopener"
              className="font-medium text-primary underline underline-offset-4"
            >
              politici privatnosti
            </a>
            .
          </span>
        </label>
        {errors.privola && <FieldError>{errors.privola.message}</FieldError>}
      </Field>

      <Turnstile key={kljucTurnstilea} onToken={onToken} />
    </div>
  )
}

// Pregled svega što je kupac upisao, s okvirnim iznosom.
function Sazetak({ materijali }: { materijali: MaterijalCjenika[] }) {
  const naslovId = useId()
  const { control } = useFormContext<NarudzbaForme, unknown, NarudzbaFormeProvjerena>()
  const [stavke, fotografije, naselje, ulica, zeljeniDatum, dioDana] = useWatch({
    control,
    name: ['stavke', 'fotografije', 'naselje', 'ulica', 'zeljeniDatum', 'dioDana'],
  })

  const unosi: StavkaUnos[] = []
  for (const s of stavke) {
    const { kg } = procitajKg(s.kgTekst)
    if (s.klasaId !== null && kg !== null) unosi.push({ klasaId: Number(s.klasaId), kg })
  }
  const procjena = izracunajProcjenu(
    unosi,
    materijali.flatMap((m) => m.klase),
  )

  // Naziv materijala i klase za svaku klasu.
  const nazivi = new Map<number, string>()
  for (const m of materijali) {
    for (const k of m.klase) nazivi.set(k.id, `${m.naziv} – ${k.naziv}`)
  }

  return (
    <section
      aria-labelledby={naslovId}
      className="flex flex-col gap-4 rounded-lg border bg-muted/40 p-4"
    >
      <h3 id={naslovId} className="font-heading text-lg font-semibold">
        Vaša narudžba
      </h3>

      <ul className="flex flex-col gap-2">
        {procjena.stavke.map((s, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3">
            <span>
              {nazivi.get(s.klasaId)}
              <span className="text-muted-foreground"> · {formatBrojUnos(s.kg)} kg</span>
            </span>
            <span className="shrink-0 tabular-nums">{formatEur(s.iznos)}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1 border-t pt-3">
        <p className="flex items-baseline justify-between gap-3">
          <span className="text-muted-foreground">Okvirni iznos</span>
          <span className="font-heading text-2xl font-bold tabular-nums">
            {formatEur(procjena.ukupno)}
          </span>
        </p>
        <p className="text-sm text-muted-foreground">
          Konačni iznos određuje se vaganjem na licu mjesta. Plaćamo gotovinom.
        </p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t pt-3">
        <dt className="text-muted-foreground">Mjesto</dt>
        <dd>
          {naselje?.naziv}, {ulica}
        </dd>
        <dt className="text-muted-foreground">Dan</dt>
        <dd>
          {zeljeniDatum ? formatDan(zeljeniDatum) : '–'} ({NAZIVI_DIJELA_DANA[dioDana].toLowerCase()})
        </dd>
        <dt className="text-muted-foreground">Fotografije</dt>
        <dd>{fotografije.length}</dd>
      </dl>
    </section>
  )
}
