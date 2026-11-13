// Nazivi i pomoćne funkcije za prikaz narudžbi u adminu.
import type { Database } from '@/lib/supabase/tipovi'

type Enumi = Database['public']['Enums']
export type StatusNarudzbe = Enumi['status_narudzbe']
export type RazlogOtkaza = Enumi['razlog_otkaza']

export const NAZIVI_STATUSA: Record<StatusNarudzbe, string> = {
  nova: 'Nova',
  potvrdjena: 'Potvrđena',
  realizirana: 'Realizirana',
  otkazana: 'Otkazana',
}

// Boja oznake statusa (tokeni iz globals.css, korak 0.7).
export const BOJE_STATUSA: Record<StatusNarudzbe, string> = {
  nova: 'bg-status-nova text-white',
  potvrdjena: 'bg-status-potvrdjena text-white',
  realizirana: 'bg-status-realizirana text-white',
  otkazana: 'bg-status-otkazana text-white',
}

export const NAZIVI_RAZLOGA: Record<RazlogOtkaza, string> = {
  lazna_narudzba: 'Lažna narudžba',
  kupac_odustao: 'Kupac odustao',
  ne_javlja_se: 'Ne javlja se',
  premala_kolicina: 'Premala količina',
  izvan_podrucja: 'Izvan područja',
  ostalo: 'Ostalo',
}

// Kratki naziv stavke: klasa obično već sadrži materijal ("Bakar sjajni"),
// pa se materijal dodaje samo kad ga u nazivu klase nema ("Kabeli" → "Bakar – Kabeli").
export function nazivStavke(materijal: string, klasa: string): string {
  return klasa.toLowerCase().startsWith(materijal.toLowerCase()) ? klasa : `${materijal} – ${klasa}`
}

// Ukupno prijavljenih kilograma narudžbe. Zbraja u stotinkama kg,
// da ne ostane "170.00000000000003".
export function ukupnoKg(stavke: { kg_prijavljeno: number }[]): number {
  return stavke.reduce((zbroj, s) => zbroj + Math.round(s.kg_prijavljeno * 100), 0) / 100
}

// Koliko je narudžba stara, kratko: "upravo", "prije 5 min", "prije 2 h", "prije 3 d".
export function starost(trenutak: string, sada: number): string {
  const minute = Math.floor((sada - new Date(trenutak).getTime()) / 60_000)
  if (minute < 1) return 'upravo'
  if (minute < 60) return `prije ${minute} min`
  const sati = Math.floor(minute / 60)
  if (sati < 24) return `prije ${sati} h`
  return `prije ${Math.floor(sati / 24)} d`
}

// Link koji otvara navigaciju u Google Mapsu (na Androidu otvara aplikaciju Karte).
// Ako je kupac dao GPS, vodi točno na tu točku, a inače na adresu.
export function linkNavigacije(n: {
  lat: number | null
  lng: number | null
  ulica: string
  naselje: string
}): string {
  const odrediste =
    n.lat !== null && n.lng !== null ? `${n.lat},${n.lng}` : `${n.ulica}, ${n.naselje}, Hrvatska`
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(odrediste)}`
}
