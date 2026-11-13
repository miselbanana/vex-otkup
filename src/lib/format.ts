// Pomoćne funkcije za prikaz i unos.
// Normalizacija mobitela u oblik +3859… dodaje se kad zatreba za kontakt kupca (korak 1.6).

// Ispisuje iznos u eurima na hrvatski način: 1234.5 → "1.234,50 €".
// Namjerno ručno, a ne preko Intl.NumberFormat: tako server i preglednik
// sigurno ispišu isti tekst (inače prijeti greška "hydration mismatch").
export function formatEur(iznos: number): string {
  const negativan = iznos < 0
  // Rad u cijelim centima, da u ispisu nikad ne ostane "0,30000000000000004".
  // Iznosi su ionako već zaokruženi na 2 decimale u izracun.ts.
  const centi = Math.round(Math.abs(iznos) * 100)
  const cijeli = Math.floor(centi / 100).toString()
  const decimale = (centi % 100).toString().padStart(2, '0')
  // Točka svake tri znamenke s desna: 1234567 → 1.234.567
  const sTockama = cijeli.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${negativan ? '-' : ''}${sTockama},${decimale} €`
}

// Čita broj koji je upisao korisnik. Kupac smije koristiti i zarez i točku,
// a funkcija sama zaključi što je decimalni znak, a što razdjelnik tisuća:
//   "12,5" / "12.5"            → 12.5     (jedan znak = decimale)
//   "1237.59" / "1237,59"      → 1237.59
//   "1.237,59" / "1,237.59"    → 1237.59  (oba znaka: zadnji je decimalni)
//   "1.500" / "1,500"          → 1500     (točno 3 znamenke iza = tisuće)
//   "0,500"                    → 0.5      (ispred je nula, pa su to decimale)
//   "1.234.567"                → 1234567  (isti znak više puta = tisuće)
//   ",5"                       → 0.5
// Za prazan ili neispravan unos ("abc", "1,2,3", "-5", "12,") vraća null.
export function parseBroj(tekst: string): number | null {
  let s = tekst.replace(/\s/g, '')
  if (/^[.,]/.test(s)) s = '0' + s
  // Samo znamenke, zarezi i točke; mora počinjati i završavati znamenkom.
  if (!/^\d([\d.,]*\d)?$/.test(s)) return null

  const zadnjaTocka = s.lastIndexOf('.')
  const zadnjiZarez = s.lastIndexOf(',')
  let cijeli = s
  let decimale = ''

  if (zadnjaTocka >= 0 && zadnjiZarez >= 0) {
    // Ima i točke i zareza: decimalni znak je onaj koji je zadnji.
    const d = Math.max(zadnjaTocka, zadnjiZarez)
    cijeli = s.slice(0, d)
    decimale = s.slice(d + 1)
  } else if (zadnjaTocka >= 0 || zadnjiZarez >= 0) {
    const dijelovi = s.split(zadnjaTocka >= 0 ? '.' : ',')
    const [prije, poslije] = dijelovi
    // Jedan znak s točno 3 znamenke iza i 1–3 znamenke ispred (bez vodeće nule) = tisuće.
    const tisuce = dijelovi.length === 2 && poslije.length === 3 && /^[1-9]\d{0,2}$/.test(prije)
    if (dijelovi.length === 2 && !tisuce) {
      cijeli = prije
      decimale = poslije
    }
  }

  // Cijeli dio: same znamenke ili ispravno grupirane tisuće (1.234.567 ili 1,234,567).
  if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(cijeli) || /^[1-9]\d{0,2}(,\d{3})+$/.test(cijeli)) {
    cijeli = cijeli.replace(/[.,]/g, '')
  }
  if (!/^\d+$/.test(cijeli) || !/^\d*$/.test(decimale)) return null

  const broj = Number(decimale ? `${cijeli}.${decimale}` : cijeli)
  return Number.isFinite(broj) ? broj : null
}

// Ispisuje broj za polje unosa: decimalni zarez, bez razdjelnika tisuća (1237.59 → "1237,59").
// Tako kupac nakon upisa vidi kako je broj shvaćen, bez dvoumljenja oko točke.
export function formatBrojUnos(broj: number): string {
  return String(broj).replace('.', ',')
}
