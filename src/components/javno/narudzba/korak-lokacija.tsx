'use client'

import { useEffect, useId, useState } from 'react'
import { CircleCheck, LoaderCircle, LocateFixed, MapPin, Phone, X } from 'lucide-react'
import { useFormContext, useFormState, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { KalendarOdvoza } from '@/components/javno/narudzba/kalendar-odvoza'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TELEFON_LINK, TELEFON_PRIKAZ } from '@/lib/kontakt'
import { cn } from '@/lib/utils'
import {
  DIJELOVI_DANA,
  NAJVISE_ZNAKOVA_NAPOMENE,
  type Naselje,
  type NarudzbaForme,
  type NarudzbaFormeProvjerena,
} from '@/lib/validacija/narudzba'

const NAZIVI_DIJELA_DANA: Record<(typeof DIJELOVI_DANA)[number], string> = {
  jutro: 'Jutro',
  popodne: 'Popodne',
  svejedno: 'Svejedno',
}

// Korak 3: mjesto s popisa, ulica, GPS (nije obavezan), dan odvoza, dio dana i napomena.
// Kalendar se prikazuje tek kad je odabrano mjesto, jer slobodni dani ovise o udaljenosti.
export function KorakLokacija() {
  const id = useId()
  const { control, register, setValue, getValues, getFieldState } = useFormContext<
    NarudzbaForme,
    unknown,
    NarudzbaFormeProvjerena
  >()
  const [naselje, lat, lng, zeljeniDatum, dioDana] = useWatch({
    control,
    name: ['naselje', 'lat', 'lng', 'zeljeniDatum', 'dioDana'],
  })
  const { errors } = useFormState({
    control,
    name: ['naselje', 'ulica', 'napomena', 'zeljeniDatum'],
  })
  const [trazimGps, setTrazimGps] = useState(false)

  // Ako polje već prikazuje grešku, provjeri ga odmah, da greška nestane čim se ispravi.
  function odaberiNaselje(n: Naselje | null) {
    setValue('naselje', n, { shouldValidate: getFieldState('naselje').invalid, shouldDirty: true })
  }

  function odaberiDan(datum: string | null) {
    setValue('zeljeniDatum', datum, {
      shouldValidate: getFieldState('zeljeniDatum').invalid,
      shouldDirty: true,
    })
  }

  function promijeniNaselje() {
    odaberiNaselje(null)
    // Nakon što se pojavi polje za pretragu, stavi kursor u njega.
    requestAnimationFrame(() => document.getElementById(`${id}-naselje`)?.focus())
  }

  // GPS nije obavezan. Ako ga kupac ne dopusti ili ne radi, narudžba ide i bez njega.
  function uzmiLokaciju() {
    // Preglednik lokaciju daje samo na https adresi (i na localhostu). Na običnom
    // http-u (npr. lokalni sajt otvoren s mobitela) uvijek odbija, kao da kupac nije dopustio.
    if (!window.isSecureContext) {
      toast('Lokacija radi samo na sigurnoj (https) adresi. Nije obavezno, možete nastaviti.')
      return
    }
    if (!('geolocation' in navigator)) {
      toast('Vaš preglednik ne može odrediti lokaciju. Nije obavezno, možete nastaviti.')
      return
    }
    setTrazimGps(true)
    navigator.geolocation.getCurrentPosition(
      (polozaj) => {
        // 6 decimala (oko 10 cm), koliko prima baza
        setValue('lat', Number(polozaj.coords.latitude.toFixed(6)), { shouldDirty: true })
        setValue('lng', Number(polozaj.coords.longitude.toFixed(6)), { shouldDirty: true })
        setTrazimGps(false)
      },
      (greska) => {
        setTrazimGps(false)
        // Točan razlog (npr. "User denied Geolocation") vidi se u konzoli preglednika.
        console.warn('Lokacija nije dobivena:', greska.code, greska.message)
        toast(
          greska.code === greska.PERMISSION_DENIED
            ? 'Pristup lokaciji nije dopušten. Možete ga uključiti u postavkama preglednika (ikona lokota uz adresu), ali nije obavezno, možete nastaviti bez nje.'
            : 'Lokaciju nije moguće odrediti. Nije obavezno, možete nastaviti bez nje.',
        )
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  }

  function ukloniLokaciju() {
    setValue('lat', null, { shouldDirty: true })
    setValue('lng', null, { shouldDirty: true })
  }

  const izvanPodrucja = naselje !== null && !naselje.pokrivena

  return (
    <div className="flex flex-col gap-6">
      <Field data-invalid={errors.naselje !== undefined && naselje === null}>
        <FieldLabel htmlFor={`${id}-naselje`}>Mjesto</FieldLabel>
        {naselje === null ? (
          <PretragaNaselja
            inputId={`${id}-naselje`}
            onOdabir={odaberiNaselje}
            neispravno={errors.naselje !== undefined}
          />
        ) : (
          <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <MapPin className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium">{naselje.naziv}</span>
              <span className="text-sm text-muted-foreground">
                {naselje.opcina}, {naselje.zupanija}
              </span>
            </div>
            <Button type="button" variant="outline" onClick={promijeniNaselje}>
              Promijeni
            </Button>
          </div>
        )}
        {/* Za nepokriveno mjesto poruku već daje kartica ispod. */}
        {naselje === null && errors.naselje && <FieldError>{errors.naselje.message}</FieldError>}
      </Field>

      {izvanPodrucja ? (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-lg border border-status-potvrdjena/40 bg-status-potvrdjena/5 p-4"
        >
          <p className="font-heading text-lg font-semibold">Trenutno ne dolazimo na vaše područje</p>
          <p className="text-muted-foreground">
            Narudžba preko weba moguća je samo za mjesta na našem području. Nazovite nas pa ćemo
            vidjeti možemo li ipak pomoći.
          </p>
          <a href={TELEFON_LINK} className={buttonVariants()}>
            <Phone />
            {TELEFON_PRIKAZ}
          </a>
        </div>
      ) : (
        <>
          <Field data-invalid={errors.ulica !== undefined}>
            <FieldLabel htmlFor={`${id}-ulica`}>Ulica i kućni broj</FieldLabel>
            <Input
              id={`${id}-ulica`}
              autoComplete="street-address"
              placeholder="npr. Ulica Ivana Gundulića 12"
              aria-invalid={errors.ulica !== undefined}
              {...register('ulica')}
            />
            {errors.ulica && <FieldError>{errors.ulica.message}</FieldError>}
          </Field>

          <Field>
            {lat !== null && lng !== null ? (
              <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
                <CircleCheck className="size-5 shrink-0 text-status-realizirana" aria-hidden="true" />
                <span className="flex-1">Vaša lokacija je spremljena. Vozač će vas lakše pronaći.</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={ukloniLokaciju}
                  aria-label="Ukloni lokaciju"
                >
                  <X />
                </Button>
              </div>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={uzmiLokaciju}
                  disabled={trazimGps}
                  className="self-start"
                >
                  {trazimGps ? <LoaderCircle className="animate-spin" /> : <LocateFixed />}
                  {trazimGps ? 'Tražim lokaciju…' : 'Koristi moju lokaciju'}
                </Button>
                <FieldDescription>
                  Nije obavezno. Ako ste sada na mjestu preuzimanja, vozač će vas lakše pronaći.
                </FieldDescription>
              </>
            )}
          </Field>

          <FieldSet>
            <FieldLegend id={`${id}-dan`} variant="label">
              Dan odvoza
            </FieldLegend>
            {naselje === null ? (
              <p className="rounded-lg border border-dashed p-4 text-muted-foreground">
                Najprije odaberite mjesto, pa ćemo vam pokazati slobodne dane.
              </p>
            ) : (
              <KalendarOdvoza
                naseljeId={naselje.id}
                naslovId={`${id}-dan`}
                odabrano={zeljeniDatum}
                onOdabir={odaberiDan}
                onUcitano={(slobodni) => {
                  // Dan odabran za prijašnje mjesto možda nije slobodan za novo.
                  const dan = getValues('zeljeniDatum')
                  if (dan !== null && !slobodni.includes(dan)) odaberiDan(null)
                }}
                greska={errors.zeljeniDatum?.message}
              />
            )}
            {errors.zeljeniDatum && naselje !== null && (
              <FieldError>{errors.zeljeniDatum.message}</FieldError>
            )}
          </FieldSet>

          <FieldSet>
            <FieldLegend variant="label">Dio dana</FieldLegend>
            <div className="grid grid-cols-3 gap-2">
              {DIJELOVI_DANA.map((dio) => (
                <button
                  key={dio}
                  type="button"
                  aria-pressed={dioDana === dio}
                  onClick={() => setValue('dioDana', dio, { shouldDirty: true })}
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
            <FieldDescription>Točno vrijeme dogovorit ćemo telefonom.</FieldDescription>
          </FieldSet>

          <Field data-invalid={errors.napomena !== undefined}>
            <FieldLabel htmlFor={`${id}-napomena`}>Napomena za vozača (nije obavezno)</FieldLabel>
            <Textarea
              id={`${id}-napomena`}
              placeholder="npr. materijal je iza kuće, ulaz s dvorišta"
              maxLength={NAJVISE_ZNAKOVA_NAPOMENE}
              aria-invalid={errors.napomena !== undefined}
              {...register('napomena')}
            />
            {errors.napomena && <FieldError>{errors.napomena.message}</FieldError>}
          </Field>
        </>
      )}
    </div>
  )
}

// Polje za pretragu naselja s padajućim popisom. Pretraga se šalje 300 ms nakon
// zadnjeg tipkanja. Kad kupac odabere mjesto, polje nestaje i umjesto njega
// prikazuje se odabrano mjesto (s gumbom Promijeni).
function PretragaNaselja({
  inputId,
  onOdabir,
  neispravno,
}: {
  inputId: string
  onOdabir: (n: Naselje) => void
  neispravno: boolean
}) {
  const [upit, setUpit] = useState('')
  // Rezultat pamti za koji je upit stigao, pa se "tražim" izračuna, a ne sprema posebno.
  // naselja null = pretraga nije uspjela.
  const [rezultat, setRezultat] = useState<{ upit: string; naselja: Naselje[] | null }>({
    upit: '',
    naselja: [],
  })
  const cistiUpit = upit.trim()
  const prekratko = cistiUpit.length < 2

  useEffect(() => {
    if (cistiUpit.length < 2) return
    const prekid = new AbortController()
    const odgoda = setTimeout(() => {
      fetch(`/api/naselja?q=${encodeURIComponent(cistiUpit)}`, { signal: prekid.signal })
        .then(async (odgovor) => {
          if (!odgovor.ok) throw new Error(`Pretraga je vratila ${odgovor.status}`)
          return (await odgovor.json()) as Naselje[]
        })
        .then((naselja) => setRezultat({ upit: cistiUpit, naselja }))
        .catch((e: unknown) => {
          if (prekid.signal.aborted) return
          console.error('Pretraga naselja nije uspjela:', e)
          setRezultat({ upit: cistiUpit, naselja: null })
        })
    }, 300)
    return () => {
      clearTimeout(odgoda)
      prekid.abort()
    }
  }, [cistiUpit])

  const trazim = !prekratko && rezultat.upit !== cistiUpit
  // Dok traje nova pretraga, i dalje se vide prijašnji rezultati (nema treptanja).
  const naselja = prekratko ? [] : (rezultat.naselja ?? [])

  let poruka = 'Nema takvog mjesta. Provjerite naziv.'
  if (prekratko) poruka = 'Upišite barem 2 slova.'
  else if (trazim) poruka = 'Tražim…'
  else if (rezultat.naselja === null) poruka = 'Pretraga trenutno ne radi. Pokušajte ponovno.'

  return (
    <Combobox
      items={naselja}
      // Filtrira server, pa Base UI ne smije dodatno filtrirati.
      filter={null}
      // Odabir se ne čuva ovdje, nego u formi (ovo polje nakon odabira nestaje).
      value={null}
      onValueChange={(n: Naselje | null) => {
        if (n) onOdabir(n)
      }}
      inputValue={upit}
      onInputValueChange={setUpit}
      itemToStringLabel={(n: Naselje) => n.naziv}
      isItemEqualToValue={(a: Naselje, b: Naselje) => a.id === b.id}
      autoHighlight
    >
      <ComboboxInput
        id={inputId}
        placeholder="Upišite naziv mjesta, npr. Koprivnica"
        autoComplete="off"
        showTrigger={false}
        aria-invalid={neispravno || undefined}
        className="w-full"
      />
      <ComboboxContent>
        <ComboboxEmpty className="py-3 text-base">{poruka}</ComboboxEmpty>
        <ComboboxList>
          {(n: Naselje) => (
            <ComboboxItem key={n.id} value={n} className="min-h-12 py-2 pl-3 text-base">
              <span className="flex flex-col">
                <span className="font-medium">{n.naziv}</span>
                <span className="text-sm text-muted-foreground">
                  {n.opcina}, {n.zupanija}
                </span>
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
