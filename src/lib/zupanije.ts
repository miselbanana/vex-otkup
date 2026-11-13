import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

// Nazivi županija u kojima Vedran preuzima materijal (zupanije.pokrivena = true).
// Čita se tajnim ključem jer RLS anonimnim posjetiteljima ne dopušta čitanje tablica,
// pa funkcija radi isključivo na serveru i vraća samo nazive.
// Popis se rijetko mijenja, zato se kešira na dan.
export async function dohvatiPokriveneZupanije(): Promise<string[]> {
  'use cache'
  cacheLife('days')
  cacheTag('zupanije')

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('zupanije')
    .select('naziv')
    .eq('pokrivena', true)
    .order('naziv')

  if (error) throw new Error(`Županije se ne mogu učitati: ${error.message}`)

  return data.map((z) => z.naziv)
}
