import { z } from 'zod'
import { jeDatum } from '@/lib/datum'
import { normalizirajMobitel } from '@/lib/format'
import { NAJVISE_FOTOGRAFIJA } from '@/lib/fotografije'
import { NAJVISE_STAVKI, greskaKolicine, procitajKg } from '@/lib/izracun'

// Zod sheme narudžbe. Dijele ih preglednik (forma) i server (POST /api/narudzbe).

// ---------- Server: stavka kako stiže u zahtjevu ----------

export const stavkaShema = z.object({
  klasaId: z.number().int().positive(),
  kg: z.number().superRefine((kg, ctx) => {
    const greska = greskaKolicine(kg)
    if (greska) ctx.addIssue({ code: 'custom', message: greska })
  }),
})

export type Stavka = z.infer<typeof stavkaShema>

// ---------- Preglednik: stavka onako kako je kupac ispunjava ----------

// Odabiri su tekst (vrijednost iz padajućeg izbornika), a količina točno kako je
// upisana ("12,5"), jer se čita s parseBroj().
export const stavkaFormeShema = z.object({
  materijalId: z
    .string()
    .nullable()
    .refine((v) => v !== null, 'Odaberite materijal'),
  klasaId: z
    .string()
    .nullable()
    .refine((v) => v !== null, 'Odaberite klasu'),
  kgTekst: z.string().superRefine((tekst, ctx) => {
    let greska: string | null = null
    if (tekst.trim() === '') {
      greska = 'Upišite količinu'
    } else {
      const procitano = procitajKg(tekst)
      // kg === null bez greške znači nedovršen broj ("12,")
      greska = procitano.greska ?? (procitano.kg === null ? 'Upišite broj, npr. 12,5' : null)
    }
    if (greska) ctx.addIssue({ code: 'custom', message: greska })
  }),
})

// Ulazni tip (dok se ispunjava, odabir smije biti prazan).
export type StavkaForme = z.input<typeof stavkaFormeShema>

export function praznaStavka(): StavkaForme {
  return { materijalId: null, klasaId: null, kgTekst: '' }
}

// Korak 1: materijali.
export const korakMaterijaliShema = z.object({
  stavke: z
    .array(stavkaFormeShema)
    .min(1, 'Dodajte barem jedan materijal')
    .max(NAJVISE_STAVKI, `Najviše ${NAJVISE_STAVKI} materijala u jednoj narudžbi`),
})

// ---------- Fotografije (korak 2) ----------

// Server: zahtjev za potpisane linkove (POST /api/narudzbe/upload).
export const uploadZahtjevShema = z.object({
  broj: z.number().int().min(1).max(NAJVISE_FOTOGRAFIJA),
})

// Preglednik: fotografija u formi, već smanjena.
// `pregled` je privremena adresa sličice (URL.createObjectURL), a `putanja`
// je mjesto u Storageu nakon uploada (null dok nije poslana).
export const fotografijaFormeShema = z.object({
  kljuc: z.string(),
  datoteka: z.instanceof(Blob),
  pregled: z.string(),
  putanja: z.string().nullable(),
})

export type FotografijaForme = z.input<typeof fotografijaFormeShema>

// Korak 2: fotografije. `narudzbaId` dodjeljuje server pri uploadu
// i kasnije je id narudžbe (zaštita od dvostrukog slanja, korak 1.6).
export const korakFotografijeShema = z.object({
  fotografije: z
    .array(fotografijaFormeShema)
    .min(1, 'Dodajte barem jednu fotografiju materijala')
    .max(NAJVISE_FOTOGRAFIJA, `Najviše ${NAJVISE_FOTOGRAFIJA} fotografija`),
  narudzbaId: z.string().nullable(),
})

// ---------- Lokacija i termin (korak 3) ----------

// Server: upit za pretragu naselja (GET /api/naselja?q=…).
export const naseljaUpitShema = z.object({
  q: z.string().trim().max(60),
})

// Server: upit za kalendar (GET /api/kalendar?naselje=ID).
export const kalendarUpitShema = z.object({
  // najviše koliko stane u tip integer u bazi
  naselje: z.coerce.number().int().positive().max(2_147_483_647),
})

// Naselje kako ga vraća pretraga. Kupac nikad ne upisuje mjesto slobodnim tekstom.
export const naseljeShema = z.object({
  id: z.number().int().positive(),
  naziv: z.string(),
  opcina: z.string(),
  zupanija: z.string(),
  pokrivena: z.boolean(),
})

export type Naselje = z.infer<typeof naseljeShema>

export const DIJELOVI_DANA = ['jutro', 'popodne', 'svejedno'] as const

export const NAZIVI_DIJELA_DANA: Record<(typeof DIJELOVI_DANA)[number], string> = {
  jutro: 'Jutro',
  popodne: 'Popodne',
  svejedno: 'Svejedno',
}

export const NAJVISE_ZNAKOVA_NAPOMENE = 500

// Korak 3: lokacija i termin. GPS (lat, lng) nije obavezan.
export const korakLokacijaShema = z.object({
  naselje: naseljeShema
    .nullable()
    .refine((n) => n !== null, 'Odaberite mjesto s popisa')
    .refine((n) => n === null || n.pokrivena, 'Trenutno ne dolazimo na vaše područje'),
  ulica: z
    .string()
    .trim()
    .min(3, 'Upišite ulicu i kućni broj')
    .max(200, 'Najviše 200 znakova'),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  napomena: z
    .string()
    .trim()
    .max(NAJVISE_ZNAKOVA_NAPOMENE, `Najviše ${NAJVISE_ZNAKOVA_NAPOMENE} znakova`),
  zeljeniDatum: z
    .string()
    .nullable()
    .refine((d) => d !== null && jeDatum(d), 'Odaberite dan odvoza'),
  dioDana: z.enum(DIJELOVI_DANA),
})

// ---------- Kontakt (korak 4) ----------

const imePrezimeShema = z
  .string()
  .trim()
  .min(2, 'Upišite ime i prezime')
  .max(100, 'Najviše 100 znakova')

const PORUKA_MOBITELA = 'Upišite broj mobitela, npr. 091 234 5678'

// Korak 4: kontakt i privola. Mobitel ostaje onako kako ga je kupac upisao,
// a u oblik +3859… pretvara ga server (narudzbaZahtjevShema).
export const korakKontaktShema = z.object({
  imePrezime: imePrezimeShema,
  mobitel: z.string().refine((m) => normalizirajMobitel(m) !== null, PORUKA_MOBITELA),
  privola: z.boolean().refine((p) => p, 'Za narudžbu je potrebna vaša privola'),
})

// Cijela forma narudžbe.
export const narudzbaFormeShema = korakMaterijaliShema
  .extend(korakFotografijeShema.shape)
  .extend(korakLokacijaShema.shape)
  .extend(korakKontaktShema.shape)

// Vrijednosti forme dok se ispunjava, i one koje su prošle provjeru.
export type NarudzbaForme = z.input<typeof narudzbaFormeShema>
export type NarudzbaFormeProvjerena = z.output<typeof narudzbaFormeShema>

// ---------- Server: zahtjev za spremanje (POST /api/narudzbe) ----------

// Iznos se namjerno NE šalje: server ga sam računa iz cjenika.
export const narudzbaZahtjevShema = z
  .object({
    // id iz koraka uploada fotografija; drugi isti zahtjev ne stvara novu narudžbu
    id: z.uuid(),
    stavke: z.array(stavkaShema).min(1).max(NAJVISE_STAVKI),
    fotografije: z
      .array(z.string().regex(/^narudzbe\/[0-9a-f-]{36}\/[1-5]\.jpg$/))
      .min(1)
      .max(NAJVISE_FOTOGRAFIJA),
    naseljeId: z.number().int().positive().max(2_147_483_647),
    ulica: korakLokacijaShema.shape.ulica,
    lat: korakLokacijaShema.shape.lat,
    lng: korakLokacijaShema.shape.lng,
    napomena: korakLokacijaShema.shape.napomena,
    zeljeniDatum: z.string().refine(jeDatum),
    dioDana: z.enum(DIJELOVI_DANA),
    imePrezime: imePrezimeShema,
    // "091/234-5678" → "+385912345678"
    mobitel: z.string().transform((m, ctx) => {
      const normaliziran = normalizirajMobitel(m)
      if (normaliziran === null) {
        ctx.addIssue({ code: 'custom', message: PORUKA_MOBITELA })
        return z.NEVER
      }
      return normaliziran
    }),
    privola: z.literal(true),
    turnstileToken: z.string().min(1).max(2048),
    // odakle je kupac došao (oglas); sve je neobavezno
    izvor: z
      .object({
        utm_source: z.string().max(500).optional(),
        utm_campaign: z.string().max(500).optional(),
        fbclid: z.string().max(500).optional(),
      })
      .optional(),
  })
  // GPS se sprema samo kao par (oba ili nijedno).
  .refine((n) => (n.lat === null) === (n.lng === null), 'Neispravna lokacija')
  // Sve fotografije moraju biti u mapi ove narudžbe.
  .refine(
    (n) => n.fotografije.every((p) => p.startsWith(`narudzbe/${n.id}/`)),
    'Neispravne fotografije',
  )

export type NarudzbaZahtjev = z.input<typeof narudzbaZahtjevShema>

// Naziv radnje u Turnstileu. Server provjerava da je token izdan baš za narudžbu.
export const TURNSTILE_AKCIJA = 'narudzba'

// Odgovor rute POST /api/narudzbe. Po `kod` forma zna kamo vratiti kupca.
export type KodGreskeNarudzbe =
  | 'turnstile'
  | 'podaci'
  | 'dan'
  | 'dan_popunjen'
  | 'fotografije'
  | 'cjenik'
  | 'podrucje'
  | 'server'

export type NarudzbaOdgovor = { broj: string } | { greska: string; kod: KodGreskeNarudzbe }
