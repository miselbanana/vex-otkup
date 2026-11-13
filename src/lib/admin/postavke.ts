import 'server-only'
import type { createClient } from '@/lib/supabase/server'

// Postavke kalendara i zatvoreni dani za admin (1.11). Čitaju se svježe, sesijom korisnika.

type Klijent = Awaited<ReturnType<typeof createClient>>

export type PostavkeIzBaze = {
  kapacitet_dana: number
  granica_1_km: number
  bodovi_1: number
  granica_2_km: number
  bodovi_2: number
  bodovi_dalje: number
  // polazište (Reka), od kojeg se mjeri udaljenost; u adminu se ne mijenja
  polaziste: string
}

// Jedini redak postavki ili null ako još nije upisan (supabase/postavke.sql).
export async function dohvatiPostavkeKalendara(supabase: Klijent): Promise<PostavkeIzBaze | null> {
  const { data, error } = await supabase
    .from('postavke_kalendara')
    .select(
      'kapacitet_dana, granica_1_km, bodovi_1, granica_2_km, bodovi_2, bodovi_dalje, naselja (naziv, opcina)',
    )
    .maybeSingle()
  if (error) throw new Error(`Postavke kalendara se ne mogu učitati: ${error.message}`)
  if (!data) return null

  const { naselja, ...postavke } = data
  return { ...postavke, polaziste: `${naselja.naziv} (${naselja.opcina})` }
}

export type ZatvorenDan = {
  datum: string
  razlog: string | null
  // nove i potvrđene narudžbe koje su ostale na taj dan
  narudzbi: number
}

// Zatvoreni dani od zadanog dana nadalje, s brojem narudžbi koje su ostale na njima.
export async function dohvatiZatvoreneDane(supabase: Klijent, od: string): Promise<ZatvorenDan[]> {
  const { data: dani, error } = await supabase
    .from('zatvoreni_dani')
    .select('datum, razlog')
    .gte('datum', od)
    .order('datum')
  if (error) throw new Error(`Zatvoreni dani se ne mogu učitati: ${error.message}`)
  if (dani.length === 0) return []

  const { data: narudzbe, error: greskaNarudzbi } = await supabase
    .from('narudzbe')
    .select('datum_odvoza')
    .in('status', ['nova', 'potvrdjena'])
    .in(
      'datum_odvoza',
      dani.map((d) => d.datum),
    )
  if (greskaNarudzbi) {
    throw new Error(`Narudžbe zatvorenih dana se ne mogu učitati: ${greskaNarudzbi.message}`)
  }

  const brojPoDanu = new Map<string, number>()
  for (const n of narudzbe) {
    brojPoDanu.set(n.datum_odvoza, (brojPoDanu.get(n.datum_odvoza) ?? 0) + 1)
  }
  return dani.map((d) => ({ ...d, narudzbi: brojPoDanu.get(d.datum) ?? 0 }))
}
