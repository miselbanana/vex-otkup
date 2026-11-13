import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

// Javni cjenik: aktivni materijali i njihove aktivne klase.

export type KlasaCjenika = {
  id: number
  naziv: string
  opis: string
  cijena_po_kg: number
}

export type MaterijalCjenika = {
  id: number
  naziv: string
  slug: string
  klase: KlasaCjenika[]
}

// Dohvaća cjenik za javni sajt.
// Čita se tajnim ključem jer RLS anonimnim posjetiteljima ne dopušta čitanje tablica.
// Zato se vraćaju SAMO javni stupci, a funkcija radi isključivo na serveru.
// Rezultat se kešira: nakon promjene cjenika u adminu (cjenik/akcije.ts) osvježava se s
// updateTag('cjenik') te revalidatePath('/cjenik') i revalidatePath('/'),
// a u svakom slučaju najkasnije za sat vremena.
export async function dohvatiCjenik(): Promise<MaterijalCjenika[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('cjenik')

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('materijali')
    .select('id, naziv, slug, klase (id, naziv, opis, cijena_po_kg, aktivna)')
    .eq('aktivan', true)
    .order('redoslijed')

  if (error) throw new Error(`Cjenik se ne može učitati: ${error.message}`)

  return data
    .map((m) => ({
      id: m.id,
      naziv: m.naziv,
      slug: m.slug,
      klase: m.klase
        .filter((k) => k.aktivna)
        .sort((a, b) => b.cijena_po_kg - a.cijena_po_kg)
        .map(({ id, naziv, opis, cijena_po_kg }) => ({ id, naziv, opis, cijena_po_kg })),
    }))
    // Materijal bez ijedne aktivne klase nema što ponuditi.
    .filter((m) => m.klase.length > 0)
}
