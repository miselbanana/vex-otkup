'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { cn } from 'cn'
import { toast } from 'sonner'
import { otkazi, type OdgovorAkcije, type RazlogOtkaza } from '@/app/(admin)/admin/narudzbe/akcije'
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
import { NAZIVI_RAZLOGA } from '@/lib/admin/oznake'

const RAZLOZI = Object.keys(NAZIVI_RAZLOGA) as RazlogOtkaza[]

// Otkaz nove ili potvrđene narudžbe. Razlog je obavezan: "Lažna narudžba"
// kasnije pokazuje radi li zaštita od botova, pa se ne smije preskočiti.
export function DijalogOtkaza({
  id,
  broj,
  klaseGumba,
}: {
  id: string
  broj: string
  klaseGumba?: string
}) {
  const [otvoren, setOtvoren] = useState(false)

  return (
    <Dialog open={otvoren} onOpenChange={setOtvoren}>
      <DialogTrigger
        className={buttonVariants({ variant: 'outline', className: cn('w-full', klaseGumba) })}
      >
        <X />
        Otkaži
      </DialogTrigger>
      <DialogContent>
        {otvoren && <FormaOtkaza id={id} broj={broj} zatvori={() => setOtvoren(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function FormaOtkaza({ id, broj, zatvori }: { id: string; broj: string; zatvori: () => void }) {
  const [razlog, setRazlog] = useState<RazlogOtkaza | null>(null)
  const [greska, setGreska] = useState<string | null>(null)
  const [radi, zapocni] = useTransition()

  function spremi() {
    if (!razlog) {
      setGreska('Odaberite razlog otkaza.')
      return
    }
    zapocni(async () => {
      let odgovor: OdgovorAkcije
      try {
        odgovor = await otkazi(id, razlog)
      } catch {
        odgovor = { greska: 'Veza ne radi. Pokušajte ponovno.' }
      }
      if (odgovor.greska) {
        setGreska(odgovor.greska)
        return
      }
      toast.success(`Narudžba #${broj} je otkazana.`)
      zatvori()
    })
  }

  return (
    <>
      <DialogHeader className="pr-10">
        <DialogTitle className="text-xl font-semibold">Otkaži narudžbu #{broj}</DialogTitle>
        <DialogDescription>Odaberite razlog otkaza.</DialogDescription>
      </DialogHeader>

      <fieldset>
        <legend className="sr-only">Razlog otkaza</legend>
        <div className="grid grid-cols-2 gap-2">
          {RAZLOZI.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={razlog === r}
              onClick={() => {
                setRazlog(r)
                setGreska(null)
              }}
              className={cn(
                'min-h-12 cursor-pointer rounded-lg border px-2 py-1 text-base transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                razlog === r
                  ? 'border-destructive bg-destructive text-white'
                  : 'bg-card hover:border-destructive',
              )}
            >
              {NAZIVI_RAZLOGA[r]}
            </button>
          ))}
        </div>
      </fieldset>

      {greska && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {greska}
        </p>
      )}

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Odustani</DialogClose>
        <Button
          disabled={radi}
          onClick={spremi}
          className="bg-destructive text-white hover:bg-destructive/90"
        >
          {radi ? 'Spremam…' : 'Otkaži narudžbu'}
        </Button>
      </DialogFooter>
    </>
  )
}
