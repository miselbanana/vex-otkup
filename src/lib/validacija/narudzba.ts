import { z } from 'zod'
import { NAJVISE_FOTOGRAFIJA } from '@/lib/fotografije'
import { NAJVISE_STAVKI, greskaKolicine, procitajKg } from '@/lib/izracun'

// Zod sheme narudžbe. Dijele ih preglednik (forma) i server (spremanje, korak 1.6).
// Zasad sadrže materijale i fotografije. Koraci 1.5–1.6 dodaju svoja polja
// (lokaciju i termin, kontakt) proširivanjem ovih shema.

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

// Cijela forma narudžbe. Kasniji koraci je proširuju svojim poljima.
export const narudzbaFormeShema = korakMaterijaliShema.extend(korakFotografijeShema.shape)

// Vrijednosti forme dok se ispunjava, i one koje su prošle provjeru.
export type NarudzbaForme = z.input<typeof narudzbaFormeShema>
export type NarudzbaFormeProvjerena = z.output<typeof narudzbaFormeShema>
