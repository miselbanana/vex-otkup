import { z } from 'zod'

// Pravila za postavke kalendara (1.11). Iste provjere su i u bazi (postavke_kalendara),
// a ovdje su da Vedran dobije jasnu poruku umjesto greške baze.

export const NAJVISE_BODOVA = 20
export const NAJVISE_KM = 500
export const NAJVISE_ZNAKOVA_RAZLOGA = 100

const bodoviShema = z.number().int().min(1).max(NAJVISE_BODOVA)
// Granica u km s najviše 1 decimalom (baza: numeric(6,1)).
const kmShema = z
  .number()
  .min(1)
  .max(NAJVISE_KM)
  .refine((km) => Math.abs(Math.round(km * 10) - km * 10) <= 1e-6)

export const postavkeKalendaraShema = z
  .object({
    kapacitet: bodoviShema,
    granica1: kmShema,
    bodovi1: bodoviShema,
    granica2: kmShema,
    bodovi2: bodoviShema,
    bodoviDalje: bodoviShema,
  })
  .refine((p) => p.granica1 < p.granica2, {
    message: 'Prva granica mora biti manja od druge.',
  })
  .refine((p) => Math.max(p.bodovi1, p.bodovi2, p.bodoviDalje) <= p.kapacitet, {
    message: 'Nijedna narudžba ne smije trošiti više bodova nego što dan ima.',
  })

export type PostavkeKalendara = z.infer<typeof postavkeKalendaraShema>

// "1 bod", "2 boda", "5 bodova", "21 bod".
export function bodovaRijec(n: number): string {
  const zadnja = n % 10
  const zadnjeDvije = n % 100
  if (zadnja === 1 && zadnjeDvije !== 11) return 'bod'
  if (zadnja >= 2 && zadnja <= 4 && (zadnjeDvije < 12 || zadnjeDvije > 14)) return 'boda'
  return 'bodova'
}
