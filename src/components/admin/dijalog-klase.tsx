'use client'

import { useState, useTransition } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { cn } from 'cn'
import { toast } from 'sonner'
import {
  dodajKlasu,
  urediKlasu,
  type OdgovorCjenika,
} from '@/app/(admin)/admin/cjenik/akcije'
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
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatCijenaUnos } from '@/lib/format'
import { procitajCijenu } from '@/lib/izracun'
import { NAJVISE_ZNAKOVA_NAZIVA, NAJVISE_ZNAKOVA_OPISA } from '@/lib/validacija/cjenik'

type PodaciKlase =
  // nova klasa u materijalu: naziv, opis i cijena
  | { nacin: 'dodaj'; materijalId: number; materijal: string }
  // postojeća klasa: samo naziv i opis (cijena se mijenja u retku)
  | { nacin: 'uredi'; klasaId: number; materijal: string; naziv: string; opis: string }

type Props = PodaciKlase & { klaseGumba?: string }

// Dijalog "Dodaj klasu" i "Uredi" (naziv i opis klase).
export function DijalogKlase({ klaseGumba, ...props }: Props) {
  const [otvoren, setOtvoren] = useState(false)
  const dodavanje = props.nacin === 'dodaj'

  return (
    <Dialog open={otvoren} onOpenChange={setOtvoren}>
      <DialogTrigger
        className={buttonVariants({ variant: 'outline', className: cn('w-full', klaseGumba) })}
      >
        {dodavanje ? <Plus /> : <Pencil />}
        {dodavanje ? 'Dodaj klasu' : 'Uredi'}
      </DialogTrigger>
      <DialogContent>
        {/* Forma se slaže svaki put kad se dijalog otvori, pa uvijek kreće od podataka iz baze. */}
        {otvoren && <FormaKlase {...props} zatvori={() => setOtvoren(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function FormaKlase(props: PodaciKlase & { zatvori: () => void }) {
  const dodavanje = props.nacin === 'dodaj'
  const [naziv, setNaziv] = useState(dodavanje ? '' : props.naziv)
  const [opis, setOpis] = useState(dodavanje ? '' : props.opis)
  const [cijenaTekst, setCijenaTekst] = useState('')
  const [greska, setGreska] = useState<string | null>(null)
  const [radi, zapocni] = useTransition()

  const { cijena, greska: greskaCijene } = procitajCijenu(cijenaTekst)

  function spremi(e: React.FormEvent) {
    e.preventDefault()
    if (naziv.trim() === '') {
      setGreska('Upišite naziv klase.')
      return
    }
    if (dodavanje && (cijena === null || cijena <= 0)) {
      setGreska(greskaCijene ?? 'Upišite cijenu veću od 0, npr. 7,20')
      return
    }
    zapocni(async () => {
      const tekst = { naziv, opis }
      let odgovor: OdgovorCjenika
      try {
        odgovor =
          props.nacin === 'dodaj'
            ? await dodajKlasu(props.materijalId, { ...tekst, cijena: cijena ?? 0 })
            : await urediKlasu(props.klasaId, tekst)
      } catch {
        odgovor = { greska: 'Veza ne radi. Pokušajte ponovno.' }
      }
      if (odgovor.greska) {
        setGreska(odgovor.greska)
        return
      }
      toast.success(
        dodavanje
          ? `Klasa „${naziv.trim()}” je dodana i kupci je odmah vide.`
          : `Klasa „${naziv.trim()}” je spremljena.`,
      )
      props.zatvori()
    })
  }

  return (
    <form onSubmit={spremi} className="flex flex-col gap-4">
      <DialogHeader className="pr-10">
        <DialogTitle className="text-xl font-semibold">
          {dodavanje ? `Nova klasa: ${props.materijal}` : `Uredi klasu: ${props.materijal}`}
        </DialogTitle>
        <DialogDescription>
          {dodavanje
            ? 'Nova klasa se odmah pojavi na javnom cjeniku i u narudžbi.'
            : 'Novi naziv vidi se i na starim narudžbama s ovom klasom.'}
        </DialogDescription>
      </DialogHeader>

      <Field>
        <FieldLabel htmlFor="klasa-naziv">Naziv</FieldLabel>
        <Input
          id="klasa-naziv"
          value={naziv}
          maxLength={NAJVISE_ZNAKOVA_NAZIVA}
          autoComplete="off"
          placeholder="npr. Bakar sjajni"
          onChange={(e) => {
            setNaziv(e.target.value)
            setGreska(null)
          }}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="klasa-opis">Opis za kupca</FieldLabel>
        <Textarea
          id="klasa-opis"
          value={opis}
          maxLength={NAJVISE_ZNAKOVA_OPISA}
          placeholder="Po čemu kupac prepoznaje ovu klasu."
          onChange={(e) => {
            setOpis(e.target.value)
            setGreska(null)
          }}
        />
        <FieldDescription>
          {opis.length}/{NAJVISE_ZNAKOVA_OPISA} znakova
        </FieldDescription>
      </Field>

      {dodavanje && (
        <Field data-invalid={greskaCijene !== null}>
          <FieldLabel htmlFor="klasa-cijena">Cijena (€/kg)</FieldLabel>
          <Input
            id="klasa-cijena"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="npr. 7,20"
            value={cijenaTekst}
            onChange={(e) => {
              setCijenaTekst(e.target.value)
              setGreska(null)
            }}
            onBlur={() => {
              if (cijena !== null && formatCijenaUnos(cijena) !== cijenaTekst) {
                setCijenaTekst(formatCijenaUnos(cijena))
              }
            }}
            aria-invalid={greskaCijene !== null}
            className="tabular-nums"
          />
          {greskaCijene && <FieldError>{greskaCijene}</FieldError>}
        </Field>
      )}

      {greska && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {greska}
        </p>
      )}

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Odustani</DialogClose>
        <Button type="submit" disabled={radi}>
          {radi ? 'Spremam…' : dodavanje ? 'Dodaj klasu' : 'Spremi'}
        </Button>
      </DialogFooter>
    </form>
  )
}
