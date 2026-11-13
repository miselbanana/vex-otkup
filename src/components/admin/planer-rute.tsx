import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'
import { cn } from 'cn'
import { DijalogDodajUDan, type KandidatZaDan } from '@/components/admin/dijalog-dodaj-u-dan'
import { OdabirDana } from '@/components/admin/odabir-dana'
import {
  ListaOdvoza,
  OznakaBodova,
  SazetakDana,
  naslovDana,
} from '@/components/admin/raspored'
import { Card, CardContent } from '@/components/ui/card'
import type { NarudzbaPopisa } from '@/lib/admin/narudzbe'

// Planer rute: jedan dan (zadano danas). Ruta dana = potvrđene narudžbe s tim danom
// odvoza, redom obilaska. Vedran ovdje vidi koliko kila i gotovine treba za taj dan,
// mijenja redoslijed i dodaje narudžbe iz drugih dana.
export function PlanerRute({
  datum,
  danas,
  sada,
  narudzbe,
  kandidati,
  bodovi,
  novih,
  kapacitet,
  oznakaDana,
}: {
  datum: string
  danas: string
  sada: number
  // potvrđene narudžbe ovog dana, već poredane (poredajDan)
  narudzbe: NarudzbaPopisa[]
  // potvrđene narudžbe iz drugih dana
  kandidati: KandidatZaDan[]
  bodovi: number
  // nove (nepotvrđene) narudžbe koje također zauzimaju ovaj dan
  novih: number
  kapacitet: number | null
  // "Nedjelja", "Blagdan (Božić)", "Zatvoren dan (godišnji)" ili null
  oznakaDana: string | null
}) {
  return (
    <div className="flex flex-col gap-4">
      <OdabirDana datum={datum} danas={danas} />

      <section className="flex flex-col gap-3" aria-label="Ruta dana">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl first-letter:uppercase">{naslovDana(datum, danas)}</h2>
            <OznakaBodova bodovi={bodovi} kapacitet={kapacitet} />
          </div>
          {novih > 0 && (
            <p className="text-sm text-muted-foreground">
              Bodovi uključuju i {opisNovih(novih)} za ovaj dan.
            </p>
          )}
        </div>

        {oznakaDana && (
          <p className="flex items-center gap-2 rounded-lg border border-dan-djelomicno bg-dan-djelomicno/30 px-3 py-2 text-sm">
            <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
            {oznakaDana}
          </p>
        )}

        {narudzbe.length > 0 ? (
          <>
            <SazetakDana narudzbe={narudzbe} />
            <ListaOdvoza narudzbe={narudzbe} danas={danas} sada={sada} />
          </>
        ) : (
          <Card>
            <CardContent>
              <p className="text-muted-foreground">Za ovaj dan nema potvrđenih odvoza.</p>
            </CardContent>
          </Card>
        )}

        {/* U prošli dan se ne može ništa dodati. */}
        {datum >= danas && <DijalogDodajUDan datum={datum} kandidati={kandidati} />}
      </section>
    </div>
  )
}

// "1 novu narudžbu koja čeka potvrdu", "2 nove narudžbe koje čekaju potvrdu", "5 novih narudžbi…"
function opisNovih(broj: number): string {
  const jedinice = broj % 10
  const desetice = broj % 100
  if (jedinice === 1 && desetice !== 11) return `${broj} novu narudžbu koja čeka potvrdu`
  if (jedinice >= 2 && jedinice <= 4 && (desetice < 12 || desetice > 14)) {
    return `${broj} nove narudžbe koje čekaju potvrdu`
  }
  return `${broj} novih narudžbi koje čekaju potvrdu`
}

// Prekidač između dva pogleda kartice "Raspored": planer jednog dana i svi dani.
export function PrekidacPogleda({ pogled }: { pogled: 'planer' | 'svi' }) {
  const stavke = [
    { kljuc: 'planer', natpis: 'Planer rute', href: '/admin/narudzbe?kartica=raspored' },
    { kljuc: 'svi', natpis: 'Svi dani', href: '/admin/narudzbe?kartica=raspored&pogled=svi' },
  ] as const

  return (
    <nav aria-label="Pogled rasporeda" className="grid grid-cols-2 gap-1 rounded-xl border p-1">
      {stavke.map((s) => (
        <Link
          key={s.kljuc}
          href={s.href}
          aria-current={s.kljuc === pogled ? 'page' : undefined}
          className={cn(
            'flex min-h-12 items-center justify-center rounded-lg text-sm font-medium transition-colors duration-150 ease-out',
            s.kljuc === pogled
              ? 'bg-secondary text-secondary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {s.natpis}
        </Link>
      ))}
    </nav>
  )
}
