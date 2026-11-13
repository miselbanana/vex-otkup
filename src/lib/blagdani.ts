import { dodajDane } from '@/lib/datum'

// Državni blagdani u Hrvatskoj (Zakon o blagdanima, spomendanima i neradnim danima).
// Tim danima Vedran ne vozi, pa se ne mogu odabrati u kalendaru narudžbe.
// Uskrs se mijenja svake godine, pa se računa, a od njega Uskrsni ponedjeljak i Tijelovo.

const STALNI: [string, string][] = [
  ['01-01', 'Nova godina'],
  ['01-06', 'Bogojavljenje ili Sveta tri kralja'],
  ['05-01', 'Praznik rada'],
  ['05-30', 'Dan državnosti'],
  ['06-22', 'Dan antifašističke borbe'],
  ['08-05', 'Dan pobjede i domovinske zahvalnosti i Dan hrvatskih branitelja'],
  ['08-15', 'Velika Gospa'],
  ['11-01', 'Svi sveti'],
  ['11-18', 'Dan sjećanja na žrtve Domovinskog rata'],
  ['12-25', 'Božić'],
  ['12-26', 'Sveti Stjepan'],
]

// Datum Uskrsa (katolički, gregorijanski kalendar) po "anonimnom" algoritmu
// (Meeus/Jones/Butcher). Npr. 2026 → "2026-04-05".
export function uskrs(godina: number): string {
  const a = godina % 19
  const b = Math.floor(godina / 100)
  const c = godina % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mjesec = Math.floor((h + l - 7 * m + 114) / 31)
  const dan = ((h + l - 7 * m + 114) % 31) + 1
  return `${godina}-${String(mjesec).padStart(2, '0')}-${String(dan).padStart(2, '0')}`
}

// Svi blagdani u godini: dan → naziv.
export function blagdaniGodine(godina: number): Map<string, string> {
  const blagdani = new Map<string, string>()
  for (const [mjesecDan, naziv] of STALNI) blagdani.set(`${godina}-${mjesecDan}`, naziv)
  const uskrsnaNedjelja = uskrs(godina)
  blagdani.set(uskrsnaNedjelja, 'Uskrs')
  blagdani.set(dodajDane(uskrsnaNedjelja, 1), 'Uskrsni ponedjeljak')
  blagdani.set(dodajDane(uskrsnaNedjelja, 60), 'Tijelovo')
  return blagdani
}

// Naziv blagdana za zadani dan ("2026-11-18"), ili null ako dan nije blagdan.
export function nazivBlagdana(datum: string): string | null {
  return blagdaniGodine(Number(datum.slice(0, 4))).get(datum) ?? null
}

export function jeBlagdan(datum: string): boolean {
  return nazivBlagdana(datum) !== null
}
