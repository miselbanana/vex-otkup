import { TZDate } from '@date-fns/tz'
import { addDays, format, parseISO } from 'date-fns'
import { hr } from 'date-fns/locale'

// Rad s danima ("2026-11-16"). Dan je uvijek tekst oblika GGGG-MM-DD, isto kao
// tip `date` u bazi, pa ga razlika vremenskih zona ne može pomaknuti na drugi dan.

export const ZONA = 'Europe/Zagreb'

const OBLIK_DATUMA = /^\d{4}-\d{2}-\d{2}$/

// Je li tekst stvarni dan u obliku GGGG-MM-DD (npr. odbija "2026-02-30").
export function jeDatum(tekst: string): boolean {
  if (!OBLIK_DATUMA.test(tekst)) return false
  const d = new Date(`${tekst}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === tekst
}

// Današnji dan u Hrvatskoj, bez obzira na to gdje radi server (Vercel radi u UTC-u).
export function danasUZagrebu(): string {
  return format(TZDate.tz(ZONA), 'yyyy-MM-dd')
}

// Sutrašnji dan u Hrvatskoj, bez obzira na to gdje radi server (Vercel radi u UTC-u).
export function sutraUZagrebu(): string {
  return format(addDays(TZDate.tz(ZONA), 1), 'yyyy-MM-dd')
}

// Dan pomaknut za n dana. Računa se u UTC-u, pa ljetno/zimsko vrijeme ne smeta.
export function dodajDane(datum: string, n: number): string {
  const d = new Date(`${datum}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// Dan u tjednu: 1 = ponedjeljak … 7 = nedjelja.
export function danUTjednu(datum: string): number {
  const dan = new Date(`${datum}T00:00:00Z`).getUTCDay()
  return dan === 0 ? 7 : dan
}

// Trenutak (timestamptz) iz dana i sata po hrvatskom vremenu ("2026-11-17", "09:30").
// Vraća ISO zapis s pomakom zone, pa baza točno zna koji je to trenutak.
export function trenutakUZagrebu(datum: string, vrijeme: string): string {
  const [godina, mjesec, dan] = datum.split('-').map(Number)
  const [sat, minuta] = vrijeme.split(':').map(Number)
  return new TZDate(godina, mjesec - 1, dan, sat, minuta, ZONA).toISOString()
}

// Ispis trenutka (timestamptz) po hrvatskom vremenu, npr. "09:30" ili "13. 11. 2026. u 14:05".
export function formatTrenutak(trenutak: string, uzorak = "d. M. yyyy. 'u' HH:mm"): string {
  return format(new TZDate(trenutak, ZONA), uzorak, { locale: hr })
}

// Ispis dana na hrvatskom, npr. "utorak, 17. studenoga".
// parseISO čita dan kao ponoć po satu uređaja, pa ispis uvijek pokaže upravo taj dan.
export function formatDan(datum: string, uzorak = 'EEEE, d. MMMM'): string {
  return format(parseISO(datum), uzorak, { locale: hr })
}
