import { MapPin, Phone } from 'lucide-react'
import { cn } from 'cn'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { NarudzbaPopisa } from '@/lib/admin/narudzbe'
import {
  BOJE_STATUSA,
  NAZIVI_RAZLOGA,
  NAZIVI_STATUSA,
  nazivStavke,
  starost,
} from '@/lib/admin/oznake'
import { formatDan } from '@/lib/datum'
import { formatBrojUnos, formatEur, prikaziMobitel } from '@/lib/format'
import { NAZIVI_DIJELA_DANA } from '@/lib/validacija/narudzba'

// Kartica jedne narudžbe u admin popisu.
// `kupac` = prikaži ime i gumb Nazovi (kartica "Nove" i rezultati pretrage).
// `sličice` = potpisani linkovi fotografija (samo kartica "Nove").
export function KarticaNarudzbe({
  narudzba: n,
  sada,
  kupac = false,
  slicice,
}: {
  narudzba: NarudzbaPopisa
  sada: number
  kupac?: boolean
  slicice?: Map<string, string>
}) {
  const fotografije = slicice
    ? n.fotografije.flatMap((f) => {
        const link = slicice.get(f.putanja)
        return link ? [{ id: f.id, link }] : []
      })
    : []

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <ZaglavljeNarudzbe narudzba={n} sada={sada} />

        <div className="flex flex-col gap-0.5">
          <p className="flex items-start gap-1.5 font-semibold">
            <MapPin className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>
              {n.naselje.naziv}
              <span className="font-normal text-muted-foreground">
                {' '}
                · {n.naselje.zupanija.naziv}
              </span>
            </span>
          </p>
          {kupac && <p>{n.ime_prezime}</p>}
        </div>

        <PopisStavki narudzba={n} />

        <p className="text-sm">
          <span className="text-muted-foreground">{nazivTermina(n.status)}: </span>
          {terminNarudzbe(n)}
        </p>

        {n.status === 'otkazana' && n.razlog_otkaza && (
          <p className="text-sm">
            <span className="text-muted-foreground">Razlog: </span>
            {NAZIVI_RAZLOGA[n.razlog_otkaza]}
          </p>
        )}

        {fotografije.length > 0 && (
          <ul className="flex gap-2" aria-label="Fotografije">
            {fotografije.map((f, i) => (
              <li key={f.id}>
                <a href={f.link} target="_blank" rel="noreferrer" className="block rounded-md">
                  {/* Obični <img>: potpisani link vrijedi sat vremena i ne ide kroz Next.js optimizaciju. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.link}
                    alt={`Fotografija ${i + 1}`}
                    loading="lazy"
                    className="size-14 rounded-md border object-cover"
                  />
                </a>
              </li>
            ))}
          </ul>
        )}

        {kupac && <GumbNazovi mobitel={n.mobitel} />}
      </CardContent>
    </Card>
  )
}

// Broj narudžbe, status i koliko je stara.
export function ZaglavljeNarudzbe({ narudzba: n, sada }: { narudzba: NarudzbaPopisa; sada: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Badge className={cn('h-6 px-2.5 text-xs', BOJE_STATUSA[n.status])}>
          {NAZIVI_STATUSA[n.status]}
        </Badge>
        <span className="font-heading text-lg font-semibold tabular-nums">#{n.broj}</span>
      </div>
      <span className="text-sm text-muted-foreground">{starost(n.created_at, sada)}</span>
    </div>
  )
}

// Materijali s prijavljenim količinama i ukupno: kilogrami i okvirni iznos za isplatu.
// Iznos je procjena iz trenutka narudžbe (izračunao ju je server), a konačni određuje vaganje.
export function PopisStavki({ narudzba: n }: { narudzba: NarudzbaPopisa }) {
  // Zbroj u stotinkama kilograma, da ne ostane "170.00000000000003".
  const ukupnoKg = n.stavke.reduce((zbroj, s) => zbroj + Math.round(s.kg_prijavljeno * 100), 0) / 100

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <ul className="flex flex-col gap-0.5">
        {n.stavke.map((s) => (
          <li key={s.id} className="flex justify-between gap-3">
            <span>{nazivStavke(s.klasa.materijal.naziv, s.klasa.naziv)}</span>
            <span className="shrink-0 font-medium tabular-nums">
              {formatBrojUnos(s.kg_prijavljeno)} kg
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-0.5 border-t pt-1.5">
        <p className="flex justify-between gap-3 font-semibold">
          <span>Ukupno</span>
          <span className="shrink-0 tabular-nums">{formatBrojUnos(ukupnoKg)} kg</span>
        </p>
        <p className="flex justify-between gap-3">
          <span className="text-muted-foreground">Okvirno za isplatu</span>
          <span className="shrink-0 font-semibold tabular-nums">{formatEur(n.procjena_ukupno)}</span>
        </p>
      </div>
    </div>
  )
}

// Poziv kupcu (otvara aplikaciju za pozive na mobitelu).
// `kratko` = samo "Nazovi", bez broja (kad je gumb u pola širine).
export function GumbNazovi({ mobitel, kratko = false }: { mobitel: string; kratko?: boolean }) {
  return (
    <a
      href={`tel:${mobitel}`}
      aria-label={`Nazovi ${prikaziMobitel(mobitel)}`}
      className={buttonVariants({ className: 'w-full' })}
    >
      <Phone />
      {kratko ? 'Nazovi' : `Nazovi ${prikaziMobitel(mobitel)}`}
    </a>
  )
}

function nazivTermina(status: NarudzbaPopisa['status']): string {
  if (status === 'potvrdjena') return 'Odvoz'
  if (status === 'realizirana') return 'Odvezeno'
  return 'Željeni termin'
}

// Nova i otkazana: dan koji je kupac želio. Potvrđena i realizirana: dogovoreni dan odvoza.
function terminNarudzbe(n: NarudzbaPopisa): string {
  const datum = n.status === 'nova' || n.status === 'otkazana' ? n.zeljeni_datum : n.datum_odvoza
  const dan = formatDan(datum, 'EEEE, d. M.')
  return n.status === 'realizirana' ? dan : `${dan} · ${NAZIVI_DIJELA_DANA[n.dio_dana].toLowerCase()}`
}
