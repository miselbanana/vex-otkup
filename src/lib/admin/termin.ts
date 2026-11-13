import 'server-only'
import type { createClient } from '@/lib/supabase/server'
import { nazivBlagdana } from '@/lib/blagdani'
import { danUTjednu, danasUZagrebu, dodajDane, formatDan } from '@/lib/datum'

// Provjera dana odvoza kad Vedran potvrdi narudžbu ili joj promijeni dan (korak 1.9).
// Dan u prošlosti se ne može spremiti. Nedjelja, blagdan, zatvoren ili pun dan samo
// daju upozorenje: Vedran se s kupcem može svjesno dogovoriti i za takav dan.

type Klijent = Awaited<ReturnType<typeof createClient>>

// Koliko daleko unaprijed se može dogovoriti odvoz.
const NAJVISE_DANA_UNAPRIJED = 365

export type ProvjeraDana = { greska: string } | { upozorenja: string[] }

export async function provjeriDan(
  supabase: Klijent,
  { id, datum, bodovi }: { id: string; datum: string; bodovi: number },
): Promise<ProvjeraDana> {
  const danas = danasUZagrebu()
  if (datum < danas) return { greska: 'Dan odvoza ne može biti u prošlosti.' }
  if (datum > dodajDane(danas, NAJVISE_DANA_UNAPRIJED)) {
    return { greska: 'Dan odvoza može biti najviše godinu dana unaprijed.' }
  }

  const [zauzeto, postavke, zatvoren] = await Promise.all([
    // Dan zauzimaju nove i potvrđene narudžbe (kao u kalendaru), osim ove same.
    supabase
      .from('narudzbe')
      .select('bodovi')
      .eq('datum_odvoza', datum)
      .in('status', ['nova', 'potvrdjena'])
      .neq('id', id),
    supabase.from('postavke_kalendara').select('kapacitet_dana').maybeSingle(),
    supabase.from('zatvoreni_dani').select('razlog').eq('datum', datum).maybeSingle(),
  ])
  const greskaBaze = zauzeto.error ?? postavke.error ?? zatvoren.error
  if (greskaBaze) {
    console.error('Provjera dana nije uspjela:', greskaBaze.message)
    return { greska: 'Provjera dana nije uspjela. Pokušajte ponovno.' }
  }

  const upozorenja: string[] = []
  const imeDana = formatDan(datum, 'EEEE, d. M.')

  if (danUTjednu(datum) === 7) upozorenja.push(`${velikoSlovo(imeDana)} je nedjelja.`)

  const blagdan = nazivBlagdana(datum)
  if (blagdan) upozorenja.push(`${velikoSlovo(imeDana)} je blagdan (${blagdan}).`)

  if (zatvoren.data) {
    const razlog = zatvoren.data.razlog ? ` (${zatvoren.data.razlog})` : ''
    upozorenja.push(`Taj dan je zatvoren${razlog}.`)
  }

  const kapacitet = postavke.data?.kapacitet_dana
  if (kapacitet) {
    const zauzetoBodova = (zauzeto.data ?? []).reduce((zbroj, n) => zbroj + n.bodovi, 0)
    if (zauzetoBodova + bodovi > kapacitet) {
      upozorenja.push(
        `Dan je pun: već je zauzeto ${zauzetoBodova}/${kapacitet} boda, a ova narudžba treba ${bodovi}.`,
      )
    }
  }

  return { upozorenja }
}

function velikoSlovo(tekst: string): string {
  return tekst.charAt(0).toUpperCase() + tekst.slice(1)
}
