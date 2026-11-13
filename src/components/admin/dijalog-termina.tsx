'use client'

import { useState, useTransition } from 'react'
import { CalendarClock, Check, TriangleAlert } from 'lucide-react'
import { cn } from 'cn'
import { toast } from 'sonner'
import {
  potvrdi,
  promijeniDan,
  type DioDana,
  type OdgovorAkcije,
} from '@/app/(admin)/admin/narudzbe/akcije'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { formatDan, jeDatum } from '@/lib/datum'
import { DIJELOVI_DANA, NAZIVI_DIJELA_DANA } from '@/lib/validacija/narudzba'

type Props = {
  id: string
  broj: string
  // potvrdi = nova narudžba dobiva termin, promijeni = potvrđena se seli ili mijenja sat
  nacin: 'potvrdi' | 'promijeni'
  // unaprijed popunjeno: dan i dio dana iz narudžbe, vrijeme "09:30" ili ""
  datum: string
  dioDana: DioDana
  vrijeme: string
  // današnji dan (sa servera), najraniji koji se može odabrati
  danas: string
  // izgled gumba koji otvara dijalog
  klaseGumba?: string
}

// Dijalog "Potvrdi" (nova narudžba) i "Promijeni dan" (potvrđena narudžba).
// Dan se bira mobitelovim kalendarom. Ako je dan pun, nedjelja, blagdan ili zatvoren,
// server ništa ne spremi nego vrati upozorenja, a Vedran može svjesno "Ipak spremiti".
export function DijalogTermina({ klaseGumba, ...props }: Props) {
  const [otvoren, setOtvoren] = useState(false)
  const potvrda = props.nacin === 'potvrdi'

  return (
    <Dialog open={otvoren} onOpenChange={setOtvoren}>
      <DialogTrigger
        className={buttonVariants({
          variant: 'outline',
          className: cn('w-full', klaseGumba),
        })}
      >
        {potvrda ? <Check /> : <CalendarClock />}
        {potvrda ? 'Potvrdi' : 'Promijeni dan'}
      </DialogTrigger>
      <DialogContent>
        {/* Forma se slaže svaki put kad se dijalog otvori, pa uvijek kreće od podataka narudžbe. */}
        {otvoren && <FormaTermina {...props} zatvori={() => setOtvoren(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function FormaTermina({
  id,
  broj,
  nacin,
  datum: pocetniDatum,
  dioDana: pocetniDio,
  vrijeme: pocetnoVrijeme,
  danas,
  zatvori,
}: Omit<Props, 'klaseGumba'> & { zatvori: () => void }) {
  // Ako je kupčev dan već prošao, nudi se danas.
  const [datum, setDatum] = useState(pocetniDatum < danas ? danas : pocetniDatum)
  const [dioDana, setDioDana] = useState<DioDana>(pocetniDio)
  const [vrijeme, setVrijeme] = useState(pocetnoVrijeme)
  const [upozorenja, setUpozorenja] = useState<string[]>([])
  const [greska, setGreska] = useState<string | null>(null)
  const [radi, zapocni] = useTransition()

  const potvrda = nacin === 'potvrdi'
  const ispravanDan = jeDatum(datum)

  // Svaka promjena poništava stara upozorenja (vrijede samo za dan na koji se odnose).
  function promijeni(postavi: () => void) {
    postavi()
    setUpozorenja([])
    setGreska(null)
  }

  function spremi(prekoraci: boolean) {
    if (!ispravanDan) {
      setGreska('Odaberite dan odvoza.')
      return
    }
    zapocni(async () => {
      const termin = { datum, dioDana, vrijeme: vrijeme || undefined }
      let odgovor: OdgovorAkcije
      try {
        odgovor = potvrda
          ? await potvrdi(id, termin, prekoraci)
          : await promijeniDan(id, termin, prekoraci)
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
      toast.success(
        potvrda
          ? `Narudžba #${broj} je potvrđena za ${formatDan(datum, 'EEEE, d. M.')}.`
          : `Narudžba #${broj} je premještena na ${formatDan(datum, 'EEEE, d. M.')}.`,
      )
      zatvori()
    })
  }

  return (
    <>
      <DialogHeader className="pr-10">
        <DialogTitle className="text-xl font-semibold">
          {potvrda ? `Potvrdi narudžbu #${broj}` : `Promijeni dan #${broj}`}
        </DialogTitle>
        <DialogDescription>
          {potvrda
            ? `Kupac je odabrao ${formatDan(pocetniDatum, 'EEEE, d. M.')}. Ako ste se na telefonu dogovorili drukčije, promijenite dan.`
            : 'Ako ne upišete vrijeme, dosad dogovoreno vrijeme se briše.'}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`dan-${id}`} className="font-medium">
            Dan odvoza
          </label>
          <Input
            id={`dan-${id}`}
            type="date"
            min={danas}
            value={datum}
            onChange={(e) => promijeni(() => setDatum(e.target.value))}
            aria-invalid={!ispravanDan || undefined}
          />
          {ispravanDan && (
            <p className="text-sm text-muted-foreground first-letter:uppercase">
              {formatDan(datum, 'EEEE, d. MMMM yyyy.')}
            </p>
          )}
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 font-medium">Dio dana</legend>
          <div className="grid grid-cols-3 gap-2">
            {DIJELOVI_DANA.map((dio) => (
              <button
                key={dio}
                type="button"
                aria-pressed={dioDana === dio}
                onClick={() => promijeni(() => setDioDana(dio))}
                className={cn(
                  'h-12 cursor-pointer rounded-lg border text-base transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  dioDana === dio
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-card hover:border-primary',
                )}
              >
                {NAZIVI_DIJELA_DANA[dio]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`vrijeme-${id}`} className="font-medium">
            Točno vrijeme <span className="font-normal text-muted-foreground">(neobavezno)</span>
          </label>
          <Input
            id={`vrijeme-${id}`}
            type="time"
            value={vrijeme}
            onChange={(e) => promijeni(() => setVrijeme(e.target.value))}
          />
        </div>

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
              <p className="font-medium">Želite li ipak spremiti taj dan?</p>
            </div>
          </div>
        )}

        {greska && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {greska}
          </p>
        )}
      </div>

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Odustani</DialogClose>
        <Button disabled={radi} onClick={() => spremi(upozorenja.length > 0)}>
          {radi
            ? 'Spremam…'
            : upozorenja.length > 0
              ? 'Ipak spremi'
              : potvrda
                ? 'Potvrdi termin'
                : 'Spremi'}
        </Button>
      </DialogFooter>
    </>
  )
}
