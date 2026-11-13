import { Navigation } from 'lucide-react'
import { cn } from 'cn'
import { DijalogTermina } from '@/components/admin/dijalog-termina'
import { GumbNazovi, PopisStavki, ZaglavljeNarudzbe } from '@/components/admin/kartica-narudzbe'
import { StreliceRedoslijeda } from '@/components/admin/strelice-redoslijeda'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { NarudzbaPopisa } from '@/lib/admin/narudzbe'
import { linkNavigacije } from '@/lib/admin/oznake'
import type { DanRasporeda } from '@/lib/admin/raspored'
import { dodajDane, formatDan, formatTrenutak } from '@/lib/datum'
import { formatBrojUnos, formatEur } from '@/lib/format'
import { NAZIVI_DIJELA_DANA } from '@/lib/validacija/narudzba'

type Dan = DanRasporeda<NarudzbaPopisa>

// Planer potvrđenih odvoza: dani redom (danas na vrhu), a unutar dana redoslijed obilaska.
export function Raspored({
  dolazeci,
  prosli,
  bodovi,
  kapacitet,
  danas,
  sada,
}: {
  dolazeci: Dan[]
  prosli: Dan[]
  bodovi: Map<string, number>
  kapacitet: number | null
  danas: string
  sada: number
}) {
  const dani = (popis: Dan[]) =>
    popis.map((d) => (
      <DanOdvoza
        key={d.datum}
        dan={d}
        bodovi={bodovi.get(d.datum) ?? 0}
        kapacitet={kapacitet}
        danas={danas}
        sada={sada}
      />
    ))

  return (
    <div className="flex flex-col gap-8">
      {dani(dolazeci)}

      {prosli.length > 0 && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1 border-t pt-6">
            <h2 className="text-xl">Prošli dani — čeka realizaciju</h2>
            <p className="text-sm text-muted-foreground">
              Potvrđene narudžbe kojima je dan odvoza prošao, a nisu realizirane.
            </p>
          </div>
          {dani(prosli)}
        </div>
      )}
    </div>
  )
}

function DanOdvoza({
  dan,
  bodovi,
  kapacitet,
  danas,
  sada,
}: {
  dan: Dan
  bodovi: number
  kapacitet: number | null
  danas: string
  sada: number
}) {
  return (
    <section className="flex flex-col gap-3" aria-label={formatDan(dan.datum)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl first-letter:uppercase">{naslovDana(dan.datum, danas)}</h2>
        <OznakaBodova bodovi={bodovi} kapacitet={kapacitet} />
      </div>

      <SazetakDana narudzbe={dan.narudzbe} />

      <ListaOdvoza narudzbe={dan.narudzbe} danas={danas} sada={sada} />
    </section>
  )
}

// "Danas, utorak, 17. 11.", "Sutra, …" ili samo "četvrtak, 19. 11."
export function naslovDana(datum: string, danas: string): string {
  const prefiks = datum === danas ? 'Danas, ' : datum === dodajDane(danas, 1) ? 'Sutra, ' : ''
  return `${prefiks}${formatDan(datum, 'EEEE, d. M.')}`
}

// Zauzeti bodovi dana, npr. "3/4 boda" (crveno kad je dan pun).
export function OznakaBodova({ bodovi, kapacitet }: { bodovi: number; kapacitet: number | null }) {
  if (kapacitet === null) return null
  const pun = bodovi >= kapacitet
  return (
    <span
      className={cn(
        'shrink-0 text-sm font-medium tabular-nums',
        pun ? 'text-dan-popunjeno-tekst' : 'text-muted-foreground',
      )}
      title="Zauzeti bodovi (nove i potvrđene narudžbe) / kapacitet dana"
    >
      {bodovi}/{kapacitet} boda
    </span>
  )
}

// Narudžbe jednog dana redom obilaska, sa strelicama za promjenu redoslijeda.
export function ListaOdvoza({
  narudzbe,
  danas,
  sada,
}: {
  narudzbe: NarudzbaPopisa[]
  danas: string
  sada: number
}) {
  return (
    <ol className="flex flex-col gap-3">
      {narudzbe.map((n, i) => (
        <li key={n.id}>
          <KarticaOdvoza
            narudzba={n}
            redniBroj={i + 1}
            prva={i === 0}
            zadnja={i === narudzbe.length - 1}
            danas={danas}
            sada={sada}
          />
        </li>
      ))}
    </ol>
  )
}

// Zbroj za cijeli dan: koliko kila i koliko gotovine (okvirno) Vedran treba ponijeti.
// Zbrajaju se samo procjene (ove narudžbe još nisu izvagane), u centima i stotinkama kg,
// da u ispisu ne ostanu greške zaokruživanja.
export function SazetakDana({ narudzbe }: { narudzbe: NarudzbaPopisa[] }) {
  let stotinkeKg = 0
  let centi = 0
  for (const n of narudzbe) {
    centi += Math.round(n.procjena_ukupno * 100)
    for (const s of n.stavke) stotinkeKg += Math.round(s.kg_prijavljeno * 100)
  }
  const kupaca = narudzbe.length

  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-muted/60 px-4 py-3">
      <p className="text-sm text-muted-foreground">
        Za ovaj dan: {kupaca} {rijecKupac(kupaca)}
      </p>
      <p className="flex justify-between gap-3 font-semibold">
        <span>Ukupno</span>
        <span className="tabular-nums">{formatBrojUnos(stotinkeKg / 100)} kg</span>
      </p>
      <p className="flex justify-between gap-3 text-lg font-semibold">
        <span>Gotovina (okvirno)</span>
        <span className="tabular-nums">{formatEur(centi / 100)}</span>
      </p>
    </div>
  )
}

// 1 kupac, 2 kupca, 5 kupaca, 21 kupac, 12 kupaca…
function rijecKupac(broj: number): string {
  const jedinice = broj % 10
  const desetice = broj % 100
  if (jedinice === 1 && desetice !== 11) return 'kupac'
  if (jedinice >= 2 && jedinice <= 4 && (desetice < 12 || desetice > 14)) return 'kupca'
  return 'kupaca'
}

function KarticaOdvoza({
  narudzba: n,
  redniBroj,
  prva,
  zadnja,
  danas,
  sada,
}: {
  narudzba: NarudzbaPopisa
  redniBroj: number
  prva: boolean
  zadnja: boolean
  danas: string
  sada: number
}) {
  const vrijeme = n.dogovoreni_termin ? formatTrenutak(n.dogovoreni_termin, 'HH:mm') : ''

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <ZaglavljeNarudzbe narudzba={n} sada={sada} />

        <div className="flex gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <p className="font-semibold">
                <span className="text-muted-foreground tabular-nums">{redniBroj}. </span>
                {n.ime_prezime}
              </p>
              <p>
                {n.naselje.naziv}, {n.ulica}
              </p>
              <p className="text-sm text-muted-foreground">
                {NAZIVI_DIJELA_DANA[n.dio_dana]}
                {vrijeme && <span className="font-semibold text-foreground"> · u {vrijeme}</span>} ·{' '}
                {n.udaljenost_km.toLocaleString('hr-HR')} km
              </p>
            </div>

            <PopisStavki narudzba={n} />
          </div>

          {/* Strelice imaju smisla samo kad je u danu više od jedne narudžbe. */}
          {!(prva && zadnja) && <StreliceRedoslijeda id={n.id} prva={prva} zadnja={zadnja} />}
        </div>

        {n.napomena_kupca && (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm">
            <span className="font-medium">Napomena kupca: </span>
            {n.napomena_kupca}
          </p>
        )}
        {n.napomena_interna && (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm">
            <span className="font-medium">Interna napomena: </span>
            {n.napomena_interna}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <GumbNazovi mobitel={n.mobitel} kratko />
          <a
            href={linkNavigacije({
              lat: n.lat,
              lng: n.lng,
              ulica: n.ulica,
              naselje: n.naselje.naziv,
            })}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'outline', className: 'w-full' })}
          >
            <Navigation />
            Navigiraj
          </a>
        </div>

        {/* Narudžba uvijek ima dan, pa se "iz dana miče" premještanjem na drugi dan. */}
        <DijalogTermina
          id={n.id}
          broj={n.broj}
          nacin="promijeni"
          datum={n.datum_odvoza}
          dioDana={n.dio_dana}
          vrijeme={vrijeme}
          danas={danas}
        />
      </CardContent>
    </Card>
  )
}
