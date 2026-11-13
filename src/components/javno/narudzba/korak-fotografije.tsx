'use client'

import { useRef, type ChangeEvent } from 'react'
import { Camera, Images, LoaderCircle, X } from 'lucide-react'
import { useFormContext, useFormState, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field'
import { NAJVISE_FOTOGRAFIJA } from '@/lib/fotografije'
import { smanjiFotografiju } from '@/lib/smanji-fotografiju'
import type {
  FotografijaForme,
  NarudzbaForme,
  NarudzbaFormeProvjerena,
} from '@/lib/validacija/narudzba'

// Ključ sličice za React popis. Namjerno brojač, a ne crypto.randomUUID():
// to ne radi na običnom http-u (npr. lokalni sajt otvoren s mobitela).
let zadnjiKljuc = 0

// Korak 2: od 1 do 5 fotografija materijala. Svaka se smanji odmah nakon odabira,
// a šalje se tek kad kupac pritisne Dalje (to radi okvir, koraci.tsx).
//
// `smanjujem` (broj fotografija koje se upravo smanjuju) čuva okvir, a ne ovaj korak,
// jer smanjivanje traje i ako kupac u međuvremenu ode na drugi korak.
export function KorakFotografije({
  smanjujem,
  setSmanjujem,
  zakljucano,
}: {
  smanjujem: number
  setSmanjujem: (promjena: (n: number) => number) => void
  zakljucano: boolean
}) {
  const { control, getValues, setValue, getFieldState } = useFormContext<
    NarudzbaForme,
    unknown,
    NarudzbaFormeProvjerena
  >()
  const fotografije = useWatch({ control, name: 'fotografije' }) ?? []
  const { errors } = useFormState({ control, name: 'fotografije' })
  const kameraRef = useRef<HTMLInputElement>(null)
  const galerijaRef = useRef<HTMLInputElement>(null)

  const preostalo = NAJVISE_FOTOGRAFIJA - fotografije.length - smanjujem
  const greska = errors.fotografije?.message ?? errors.fotografije?.root?.message

  function postavi(nove: FotografijaForme[]) {
    // Ako se greška već prikazuje, provjeri odmah, da nestane čim se doda fotografija.
    // getFieldState čita trenutno stanje (ovo se zove i iz petlje nakon čekanja).
    setValue('fotografije', nove, {
      shouldValidate: getFieldState('fotografije').invalid,
      shouldDirty: true,
    })
  }

  async function dodaj(e: ChangeEvent<HTMLInputElement>) {
    const odabrane = Array.from(e.target.files ?? [])
    // Isprazni polje, da se ista fotografija može odabrati ponovno.
    e.target.value = ''
    if (odabrane.length === 0) return

    const zaObradu = odabrane.slice(0, Math.max(preostalo, 0))
    if (zaObradu.length < odabrane.length) {
      toast(`Možete dodati najviše ${NAJVISE_FOTOGRAFIJA} fotografija.`)
    }
    if (zaObradu.length === 0) return

    setSmanjujem((n) => n + zaObradu.length)
    let neuspjelo = 0
    // Jedna po jedna, da slabiji mobitel ne ostane bez memorije.
    for (const datoteka of zaObradu) {
      try {
        const smanjena = await smanjiFotografiju(datoteka)
        zadnjiKljuc += 1
        postavi([
          ...getValues('fotografije'),
          {
            kljuc: String(zadnjiKljuc),
            datoteka: smanjena,
            pregled: URL.createObjectURL(smanjena),
            putanja: null,
          },
        ])
      } catch (greskaSmanjivanja) {
        console.error('Smanjivanje fotografije nije uspjelo:', greskaSmanjivanja)
        neuspjelo += 1
      } finally {
        setSmanjujem((n) => n - 1)
      }
    }

    if (neuspjelo > 0) {
      toast.error(
        neuspjelo === 1
          ? 'Jednu fotografiju nismo mogli otvoriti. Pokušajte s drugom fotografijom.'
          : `${neuspjelo} fotografije nismo mogli otvoriti. Pokušajte s drugima.`,
      )
    }
  }

  function ukloni(kljuc: string) {
    const fotografija = getValues('fotografije').find((f) => f.kljuc === kljuc)
    if (fotografija) URL.revokeObjectURL(fotografija.pregled)
    postavi(getValues('fotografije').filter((f) => f.kljuc !== kljuc))
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">
        Fotografirajte materijal koji predajete, tako da se vidi vrsta i otprilike količina. Tako
        unaprijed znamo što nas čeka. Dodajte od 1 do {NAJVISE_FOTOGRAFIJA} fotografija.
      </p>

      {(fotografije.length > 0 || smanjujem > 0) && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fotografije.map((f, i) => (
            <li
              key={f.kljuc}
              className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              {/* Obični <img>, jer je izvor privremena adresa iz preglednika (blob:). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.pregled}
                alt={`Fotografija ${i + 1}`}
                className="size-full object-cover"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={() => ukloni(f.kljuc)}
                disabled={zakljucano}
                aria-label={`Ukloni fotografiju ${i + 1}`}
                className="absolute top-1.5 right-1.5 shadow-kartica"
              >
                <X />
              </Button>
            </li>
          ))}
          {Array.from({ length: smanjujem }, (_, i) => (
            <li
              key={`smanjujem-${i}`}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted text-sm text-muted-foreground"
            >
              <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
              Smanjujem…
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {fotografije.length} od {NAJVISE_FOTOGRAFIJA} fotografija
      </p>

      {preostalo > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Dva gumba, jer na nekim mobitelima polje za više fotografija ne nudi kameru. */}
          <Button
            type="button"
            variant={fotografije.length === 0 ? 'default' : 'outline'}
            onClick={() => kameraRef.current?.click()}
            disabled={zakljucano}
            aria-invalid={greska !== undefined}
          >
            <Camera />
            Fotografiraj
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => galerijaRef.current?.click()}
            disabled={zakljucano}
          >
            <Images />
            Odaberi iz galerije
          </Button>
          <input
            ref={kameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={dodaj}
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
          />
          <input
            ref={galerijaRef}
            type="file"
            accept="image/*"
            multiple
            onChange={dodaj}
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      )}

      {greska && <FieldError>{greska}</FieldError>}

      <p className="text-sm text-muted-foreground">
        Fotografije se smanje na vašem uređaju prije slanja, a podaci o lokaciji iz fotografije se
        brišu.
      </p>
    </div>
  )
}
