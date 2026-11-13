import 'server-only'
import type { createClient } from '@/lib/supabase/server'

// Cjenik za admin (realizacija, 1.10). Čita se svježe, sesijom prijavljenog korisnika,
// bez keša: Vedran mora odmah vidjeti današnju cijenu. Javni dohvatiCjenik() je keširan.

type Klijent = Awaited<ReturnType<typeof createClient>>

export type KlasaAdmin = {
  id: number
  naziv: string
  cijena_po_kg: number
  // klasa se nudi u izborniku samo ako su aktivni i ona i njezin materijal
  aktivna: boolean
}

export type MaterijalAdmin = {
  id: number
  naziv: string
  klase: KlasaAdmin[]
}

// Svi materijali i klase (i ugašeni), jer stavka može imati klasu koja je u međuvremenu ugašena.
export async function dohvatiCjenikAdmin(supabase: Klijent): Promise<MaterijalAdmin[]> {
  const { data, error } = await supabase
    .from('materijali')
    .select('id, naziv, aktivan, redoslijed, klase (id, naziv, cijena_po_kg, aktivna)')
    .order('redoslijed')
  if (error) throw new Error(`Cjenik se ne može učitati: ${error.message}`)

  return data.map((m) => ({
    id: m.id,
    naziv: m.naziv,
    klase: m.klase
      .sort((a, b) => b.cijena_po_kg - a.cijena_po_kg)
      .map((k) => ({
        id: k.id,
        naziv: k.naziv,
        cijena_po_kg: k.cijena_po_kg,
        aktivna: k.aktivna && m.aktivan,
      })),
  }))
}
