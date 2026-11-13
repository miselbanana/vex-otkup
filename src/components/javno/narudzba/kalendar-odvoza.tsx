'use client'

import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, Phone, RotateCw } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { nazivBlagdana } from '@/lib/blagdani'
import { danUTjednu, dodajDane, formatDan } from '@/lib/datum'
import type { KalendarOdgovor } from '@/lib/kalendar'
import { TELEFON_LINK, TELEFON_PRIKAZ } from '@/lib/kontakt'
import { cn } from '@/lib/utils'

const DANI_TJEDNA = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned']

type Props = {
  naseljeId: number
  odabrano: string | null
  onOdabir: (datum: string) => void
  // Zove se nakon svakog učitavanja, da forma obriše odabrani dan ako više nije slobodan.
  onUcitano: (slobodni: string[]) => void
  // id naslova (legend) iznad kalendara, za čitače zaslona
  naslovId: string
  greska?: string
}

// "Živi" kalendar za idućih 30 dana. Slobodne dane za odabrano naselje daje
// /api/kalendar, a zauzeti, nedjelje i blagdani su prekriženi i ne mogu se odabrati.
export function KalendarOdvoza({
  naseljeId,
  odabrano,
  onOdabir,
  onUcitano,
  naslovId,
  greska,
}: Props) {
  // "Pokušaj ponovno" povećava brojač, a to ponovno učita kalendar.
  const [pokusaj, setPokusaj] = useState(0)
  const kljuc = `${naseljeId}:${pokusaj}`
  // Odgovor pamti za koji je ključ stigao, pa se "učitavam" izračuna, a ne sprema posebno.
  // odgovor null = učitavanje nije uspjelo.
  const [rezultat, setRezultat] = useState<{
    kljuc: string
    odgovor: KalendarOdgovor | null
  } | null>(null)

  // Zadnja verzija povratne funkcije, da njena promjena ne pokreće novo učitavanje.
  const onUcitanoRef = useRef(onUcitano)
  useEffect(() => {
    onUcitanoRef.current = onUcitano
  })

  useEffect(() => {
    const prekid = new AbortController()
    fetch(`/api/kalendar?naselje=${naseljeId}`, { signal: prekid.signal, cache: 'no-store' })
      .then(async (odgovor) => {
        if (!odgovor.ok) throw new Error(`Kalendar je vratio ${odgovor.status}`)
        return (await odgovor.json()) as KalendarOdgovor
      })
      .then((odgovor) => {
        setRezultat({ kljuc, odgovor })
        if (odgovor.pokriveno) onUcitanoRef.current(odgovor.slobodni)
      })
      .catch((e: unknown) => {
        // Prekinuto jer je kupac u međuvremenu odabrao drugo naselje.
        if (prekid.signal.aborted) return
        console.error('Kalendar nije učitan:', e)
        setRezultat({ kljuc, odgovor: null })
      })
    return () => prekid.abort()
  }, [naseljeId, kljuc])

  if (rezultat?.kljuc !== kljuc) {
    return (
      <p className="flex min-h-24 items-center justify-center gap-2 rounded-lg border bg-card text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin" />
        Učitavam slobodne dane…
      </p>
    )
  }

  const odgovor = rezultat.odgovor
  if (odgovor === null) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border bg-card p-4">
        <p>Kalendar se nije učitao. Provjerite internet i pokušajte ponovno.</p>
        <Button type="button" variant="outline" onClick={() => setPokusaj((p) => p + 1)}>
          <RotateCw />
          Pokušaj ponovno
        </Button>
      </div>
    )
  }

  // Nepokriveno naselje prikazuje korak (poruka s telefonom), a ne kalendar.
  if (!odgovor.pokriveno) return null

  if (odgovor.slobodni.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border bg-card p-4">
        <p>
          U idućih mjesec dana nema slobodnog termina za vaše mjesto. Nazovite nas pa ćemo se
          dogovoriti.
        </p>
        <a href={TELEFON_LINK} className={buttonVariants()}>
          <Phone />
          {TELEFON_PRIKAZ}
        </a>
      </div>
    )
  }

  const slobodni = new Set(odgovor.slobodni)
  const dani: string[] = []
  for (let dan = odgovor.od; dan <= odgovor.do; dan = dodajDane(dan, 1)) dani.push(dan)
  // Prazna polja prije prvog dana, da svaki dan bude u stupcu svog dana u tjednu.
  const pomak = danUTjednu(odgovor.od) - 1

  return (
    <div className="flex flex-col gap-3">
      <div
        role="group"
        aria-labelledby={naslovId}
        // Dalje stavlja fokus na prvo polje s greškom (vidi koraci.tsx),
        // pa i kalendar mora moći primiti fokus.
        data-fokus-greske={greska ? true : undefined}
        tabIndex={-1}
        className="flex flex-col gap-1 rounded-lg outline-none"
      >
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground" aria-hidden="true">
          {DANI_TJEDNA.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: pomak }, (_, i) => (
            <span key={`prazno-${i}`} aria-hidden="true" />
          ))}
          {dani.map((dan) => {
            const slobodan = slobodni.has(dan)
            const odabran = dan === odabrano
            const blagdan = nazivBlagdana(dan)
            // Na prvom danu kalendara i prvom u mjesecu piše i mjesec ("1. pro").
            const sMjesecom = dan === odgovor.od || dan.endsWith('-01')
            let opis = ''
            if (!slobodan) opis = blagdan ? ` – ${blagdan}, ne radimo` : ' – zauzeto'
            return (
              <button
                key={dan}
                type="button"
                disabled={!slobodan}
                aria-pressed={odabran}
                aria-label={`${formatDan(dan)}${opis}`}
                title={blagdan ?? undefined}
                onClick={() => onOdabir(dan)}
                className={cn(
                  'flex h-12 min-w-0 flex-col items-center justify-center rounded-lg border text-base tabular-nums transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  slobodan
                    ? 'cursor-pointer bg-card hover:border-primary'
                    : 'border-transparent bg-muted/60 text-muted-foreground line-through',
                  odabran && 'border-primary bg-primary text-primary-foreground hover:border-primary',
                )}
              >
                <span className="leading-none">{Number(dan.slice(8))}</span>
                {sMjesecom && (
                  <span className="mt-0.5 text-[0.65rem] leading-none">{formatDan(dan, 'LLL')}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Prekriženi dani su popunjeni ili neradni (nedjelje i blagdani).
      </p>
      {odabrano && slobodni.has(odabrano) && (
        <p aria-live="polite">
          Odabrano: <strong className="font-semibold">{formatDan(odabrano)}</strong>
        </p>
      )}
    </div>
  )
}
