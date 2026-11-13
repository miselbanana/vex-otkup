'use client'

import { useState, useTransition } from 'react'
import { CalendarX, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import {
  otvoriDan,
  zatvoriDan,
  type OdgovorPostavki,
} from '@/app/(admin)/admin/postavke/akcije'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { ZatvorenDan } from '@/lib/admin/postavke'
import { formatDan, jeDatum } from '@/lib/datum'
import { NAJVISE_ZNAKOVA_RAZLOGA } from '@/lib/validacija/postavke'

// Zatvaranje dana (godišnji, kvar kamiona…) i popis zatvorenih dana od danas nadalje.
// Kupci zatvoren dan vide prekrižen u kalendaru, a Vedran u planeru dobiva upozorenje.
export function ZatvoreniDani({ dani, danas }: { dani: ZatvorenDan[]; danas: string }) {
  return (
    <div className="flex flex-col gap-5">
      <FormaZatvaranja danas={danas} />

      {dani.length > 0 ? (
        <ul className="flex flex-col">
          {dani.map((d) => (
            <RedakDana key={`${d.datum}-${d.razlog}-${d.narudzbi}`} dan={d} />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">Nijedan dan nije zatvoren.</p>
      )}
    </div>
  )
}

function FormaZatvaranja({ danas }: { danas: string }) {
  const [datum, setDatum] = useState('')
  const [razlog, setRazlog] = useState('')
  const [upozorenja, setUpozorenja] = useState<string[]>([])
  const [greska, setGreska] = useState<string | null>(null)
  const [radi, zapocni] = useTransition()

  const ispravanDan = jeDatum(datum)

  // Svaka promjena poništava stara upozorenja (vrijede samo za dan na koji se odnose).
  function promijeni(postavi: () => void) {
    postavi()
    setUpozorenja([])
    setGreska(null)
  }

  function spremi(e: React.FormEvent) {
    e.preventDefault()
    if (!ispravanDan) {
      setGreska('Odaberite dan.')
      return
    }
    const ipak = upozorenja.length > 0
    zapocni(async () => {
      let odgovor: OdgovorPostavki
      try {
        odgovor = await zatvoriDan(datum, razlog, ipak)
      } catch {
        odgovor = { greska: 'Veza ne radi. Pokušajte ponovno.' }
      }
      if (odgovor.upozorenja) {
        setUpozorenja(odgovor.upozorenja)
        return
      }
      if (odgovor.greska) {
        setGreska(odgovor.greska)
        return
      }
      toast.success(`Zatvoren je ${formatDan(datum, 'EEEE, d. M.')}.`)
      setDatum('')
      setRazlog('')
      setUpozorenja([])
    })
  }

  return (
    <form onSubmit={spremi} className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="zatvori-dan">Dan</FieldLabel>
        <Input
          id="zatvori-dan"
          type="date"
          min={danas}
          value={datum}
          onChange={(e) => promijeni(() => setDatum(e.target.value))}
        />
        {ispravanDan && (
          <p className="text-sm text-muted-foreground first-letter:uppercase">
            {formatDan(datum, 'EEEE, d. MMMM yyyy.')}
          </p>
        )}
      </Field>

      <Field>
        <FieldLabel htmlFor="zatvori-razlog">
          Razlog <span className="font-normal text-muted-foreground">(neobavezno)</span>
        </FieldLabel>
        <Input
          id="zatvori-razlog"
          value={razlog}
          maxLength={NAJVISE_ZNAKOVA_RAZLOGA}
          autoComplete="off"
          placeholder="npr. godišnji odmor"
          onChange={(e) => promijeni(() => setRazlog(e.target.value))}
        />
      </Field>

      {upozorenja.length > 0 && (
        <div
          role="alert"
          className="flex gap-2 rounded-lg border border-dan-djelomicno bg-dan-djelomicno/30 px-3 py-2 text-sm"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            {upozorenja.map((u) => (
              <p key={u}>{u}</p>
            ))}
            <p className="font-medium">Želite li ipak zatvoriti taj dan?</p>
          </div>
        </div>
      )}

      {greska && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {greska}
        </p>
      )}

      <Button type="submit" disabled={radi}>
        <CalendarX />
        {radi ? 'Spremam…' : upozorenja.length > 0 ? 'Ipak zatvori' : 'Zatvori dan'}
      </Button>
    </form>
  )
}

function RedakDana({ dan }: { dan: ZatvorenDan }) {
  const [radi, zapocni] = useTransition()

  function otvori() {
    zapocni(async () => {
      let odgovor: OdgovorPostavki
      try {
        odgovor = await otvoriDan(dan.datum)
      } catch {
        odgovor = { greska: 'Veza ne radi. Pokušajte ponovno.' }
      }
      if (odgovor.greska) toast.error(odgovor.greska)
      else toast.success(`Otvoren je ${formatDan(dan.datum, 'EEEE, d. M.')}.`)
    })
  }

  return (
    <li className="flex items-center gap-3 border-t py-3 first:border-t-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="font-semibold first-letter:uppercase">
          {formatDan(dan.datum, 'EEEE, d. M. yyyy.')}
        </p>
        {dan.razlog && <p className="text-sm text-muted-foreground">{dan.razlog}</p>}
        {dan.narudzbi > 0 && (
          <p className="text-sm font-medium text-destructive">
            Na taj dan {dan.narudzbi === 1 ? 'je ostala' : 'su ostale'} {dan.narudzbi}{' '}
            {dan.narudzbi === 1 ? 'narudžba' : dan.narudzbi < 5 ? 'narudžbe' : 'narudžbi'}.
          </p>
        )}
      </div>
      <Button variant="outline" disabled={radi} onClick={otvori}>
        {radi ? 'Otvaram…' : 'Otvori'}
      </Button>
    </li>
  )
}
