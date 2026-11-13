'use client'

import { useState, useTransition } from 'react'
import { Plus, TriangleAlert } from 'lucide-react'
import { cn } from 'cn'
import { toast } from 'sonner'
import { promijeniDan, type OdgovorAkcije } from '@/app/(admin)/admin/narudzbe/akcije'
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
import { formatDan } from '@/lib/datum'
import { formatBrojUnos } from '@/lib/format'

// Potvrđena narudžba iz nekog drugog dana, koju Vedran može prebaciti u ovaj dan.
export type KandidatZaDan = {
  id: string
  broj: string
  ime: string
  naselje: string
  datum: string
  kg: number
}

// Planer rute: "Dodaj narudžbu u ovaj dan" prebacuje odabranu potvrđenu narudžbu
// u otvoreni dan (akcija promijeniDan, s istom provjerom kapaciteta kao kod potvrde).
export function DijalogDodajUDan({
  datum,
  kandidati,
}: {
  datum: string
  kandidati: KandidatZaDan[]
}) {
  const [otvoren, setOtvoren] = useState(false)

  return (
    <Dialog open={otvoren} onOpenChange={setOtvoren}>
      <DialogTrigger className={buttonVariants({ variant: 'outline', className: 'w-full' })}>
        <Plus />
        Dodaj narudžbu u ovaj dan
      </DialogTrigger>
      <DialogContent>
        {otvoren && (
          <FormaDodavanja
            datum={datum}
            kandidati={kandidati}
            zatvori={() => setOtvoren(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function FormaDodavanja({
  datum,
  kandidati,
  zatvori,
}: {
  datum: string
  kandidati: KandidatZaDan[]
  zatvori: () => void
}) {
  const [odabrana, setOdabrana] = useState<KandidatZaDan | null>(null)
  const [upozorenja, setUpozorenja] = useState<string[]>([])
  const [greska, setGreska] = useState<string | null>(null)
  const [radi, zapocni] = useTransition()
  const imeDana = formatDan(datum, 'EEEE, d. M.')

  function dodaj() {
    if (!odabrana) {
      setGreska('Odaberite narudžbu.')
      return
    }
    const prekoraci = upozorenja.length > 0
    zapocni(async () => {
      let odgovor: OdgovorAkcije
      try {
        odgovor = await promijeniDan(odabrana.id, { datum }, prekoraci)
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
      toast.success(`Narudžba #${odabrana.broj} je premještena na ${imeDana}.`)
      zatvori()
    })
  }

  return (
    <>
      <DialogHeader className="pr-10">
        <DialogTitle className="text-xl font-semibold">Dodaj u {imeDana}</DialogTitle>
        <DialogDescription>
          Odaberite potvrđenu narudžbu iz drugog dana. Dio dana ostaje isti, a dogovoreno
          vrijeme se briše. Nova narudžba se u dan dodaje gumbom Potvrdi.
        </DialogDescription>
      </DialogHeader>

      {kandidati.length === 0 ? (
        <p className="text-muted-foreground">Nema drugih potvrđenih narudžbi.</p>
      ) : (
        <ul className="-mx-1 flex max-h-[50dvh] flex-col gap-2 overflow-y-auto px-1 py-1">
          {kandidati.map((k) => (
            <li key={k.id}>
              <button
                type="button"
                aria-pressed={odabrana?.id === k.id}
                onClick={() => {
                  setOdabrana(k)
                  setUpozorenja([])
                  setGreska(null)
                }}
                className={cn(
                  'flex min-h-12 w-full cursor-pointer flex-col gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  odabrana?.id === k.id
                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                    : 'bg-card hover:border-primary',
                )}
              >
                <span className="flex justify-between gap-2 font-medium">
                  <span>
                    #{k.broj} · {k.ime}
                  </span>
                  <span className="shrink-0 tabular-nums">{formatBrojUnos(k.kg)} kg</span>
                </span>
                <span className="text-sm text-muted-foreground">
                  {k.naselje} · sada: {formatDan(k.datum, 'EEEE, d. M.')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

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
            <p className="font-medium">Želite li je ipak dodati u taj dan?</p>
          </div>
        </div>
      )}

      {greska && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {greska}
        </p>
      )}

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Odustani</DialogClose>
        {kandidati.length > 0 && (
          <Button disabled={radi || !odabrana} onClick={dodaj}>
            {radi ? 'Spremam…' : upozorenja.length > 0 ? 'Ipak dodaj' : 'Dodaj u ovaj dan'}
          </Button>
        )}
      </DialogFooter>
    </>
  )
}
