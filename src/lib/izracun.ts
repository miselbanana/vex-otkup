// Izračun procjene narudžbe: cijena po kg × količina.
// Istu funkciju koriste preglednik (kalkulator, forma narudžbe) i server,
// koji nikad ne vjeruje iznosu iz preglednika nego sam ponovno računa.

// Ono što je kupac odabrao: klasa i količina u kg.
export type StavkaUnos = {
  klasaId: number
  kg: number
}

// Dio cjenika potreban za izračun.
export type KlasaCijena = {
  id: number
  cijena_po_kg: number
}

export type StavkaProcjene = StavkaUnos & {
  cijenaKg: number
  // iznos retka, zaokružen na 2 decimale (samo za prikaz)
  iznos: number
}

export type Procjena = {
  stavke: StavkaProcjene[]
  // ukupni iznos, zaokružen na 2 decimale tek na kraju
  ukupno: number
}

import { parseBroj } from '@/lib/format'

// Najveća količina po retku. Sprječava besmislene unose (npr. 1e12 kg).
export const NAJVISE_KG = 100_000

// Najviše redaka (materijala) u jednoj narudžbi.
export const NAJVISE_STAVKI = 20

// Provjerava količinu u kg. Vraća poruku o grešci ili null ako je sve u redu.
// Baza sprema kg kao numeric(10,2), pa su dopuštene najviše 2 decimale.
export function greskaKolicine(kg: number): string | null {
  if (!Number.isFinite(kg)) return 'Upišite broj, npr. 12,5'
  if (kg <= 0) return 'Količina mora biti veća od 0'
  if (kg > NAJVISE_KG) return `Najviše ${NAJVISE_KG.toLocaleString('hr-HR')} kg po retku`
  // Usporedba s malom tolerancijom, jer npr. 12,55 × 100 daje 1255,0000000000002.
  if (Math.abs(Math.round(kg * 100) - kg * 100) > 1e-6) return 'Najviše 2 decimale, npr. 12,55'
  return null
}

// Čita količinu dok je kupac upisuje (kalkulator i forma narudžbe).
// Prazno polje i broj koji se još tipka ("12,") nisu greška, ali nemaju ni vrijednost.
export function procitajKg(tekst: string): { kg: number | null; greska: string | null } {
  if (tekst.trim() === '') return { kg: null, greska: null }
  if (/^\d[\d.,]*[.,]$/.test(tekst.trim())) return { kg: null, greska: null }
  const kg = parseBroj(tekst)
  if (kg === null) return { kg: null, greska: 'Upišite broj, npr. 12,5' }
  const greska = greskaKolicine(kg)
  return greska ? { kg: null, greska } : { kg, greska: null }
}

// Računa procjenu. Stavke s nepoznatom klasom ili neispravnom količinom se preskaču.
export function izracunajProcjenu(stavke: StavkaUnos[], klase: KlasaCijena[]): Procjena {
  const cijene = new Map(klase.map((k) => [k.id, k.cijena_po_kg]))

  const rezultat: StavkaProcjene[] = []
  // Zbroj u centima, NEZAOKRUŽEN. JavaScript računa 0,1 + 0,2 = 0,30000000000000004,
  // pa se na 2 decimale zaokružuje tek na samom kraju.
  let ukupnoCenti = 0

  for (const s of stavke) {
    const cijenaKg = cijene.get(s.klasaId)
    if (cijenaKg === undefined) continue
    if (!Number.isFinite(s.kg) || s.kg <= 0 || s.kg > NAJVISE_KG) continue

    // Cijena je u bazi numeric(10,2), pa je u centima uvijek cijeli broj.
    const centi = Math.round(cijenaKg * 100) * s.kg
    ukupnoCenti += centi
    rezultat.push({ ...s, cijenaKg, iznos: Math.round(centi) / 100 })
  }

  return { stavke: rezultat, ukupno: Math.round(ukupnoCenti) / 100 }
}

// Pretvara stavke u tekst za link na narudžbu: /naruci?s=3:12.5,7:40
// (klasaId:kg, retci odvojeni zarezom). Čita ga stavkeIzUrla().
export function stavkeUUrl(stavke: StavkaUnos[]): string {
  return stavke.map((s) => `${s.klasaId}:${s.kg}`).join(',')
}

// Čita stavke iz linka na narudžbu (obrnuto od stavkeUUrl).
// Link može biti ručno promijenjen, pa se nepoznate klase i neispravne količine
// tiho preskaču. Prihvaća se najviše NAJVISE_STAVKI redaka.
export function stavkeIzUrla(tekst: string, klase: KlasaCijena[]): StavkaUnos[] {
  const poznate = new Set(klase.map((k) => k.id))
  const rezultat: StavkaUnos[] = []

  for (const dio of tekst.split(',')) {
    if (rezultat.length >= NAJVISE_STAVKI) break
    const m = /^(\d+):(\d+(?:\.\d+)?)$/.exec(dio.trim())
    if (!m) continue
    const klasaId = Number(m[1])
    const kg = Number(m[2])
    if (!poznate.has(klasaId) || greskaKolicine(kg) !== null) continue
    rezultat.push({ klasaId, kg })
  }

  return rezultat
}
