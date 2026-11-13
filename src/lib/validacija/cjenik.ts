import { z } from 'zod'
import { NAJVISE_CIJENA_KG } from '@/lib/izracun'

// Pravila za uređivanje cjenika (1.11). Granice koristi i forma u pregledniku (maxLength).

export const NAJVISE_ZNAKOVA_NAZIVA = 60
export const NAJVISE_ZNAKOVA_OPISA = 300

// Najviše 2 decimale (baza sprema numeric(10,2)); mala tolerancija zbog 7,35 × 100.
const dvijeDecimale = (broj: number) => Math.abs(Math.round(broj * 100) - broj * 100) <= 1e-6

export const idShema = z.number().int().positive()

// Cijena na cjeniku: barem 1 cent (0 € bi kupcu izgledalo kao greška), najviše 100 €/kg.
export const cijenaCjenikaShema = z.number().min(0.01).max(NAJVISE_CIJENA_KG).refine(dvijeDecimale)

export const tekstKlaseShema = z.object({
  naziv: z.string().trim().min(1).max(NAJVISE_ZNAKOVA_NAZIVA),
  opis: z.string().trim().max(NAJVISE_ZNAKOVA_OPISA),
})

export type TekstKlase = z.input<typeof tekstKlaseShema>

export const GRESKA_CIJENE = `Cijena mora biti između 0,01 i ${NAJVISE_CIJENA_KG} €, s najviše 2 decimale.`
export const GRESKA_TEKSTA = `Naziv je obavezan (najviše ${NAJVISE_ZNAKOVA_NAZIVA} znakova), a opis može imati najviše ${NAJVISE_ZNAKOVA_OPISA} znakova.`
