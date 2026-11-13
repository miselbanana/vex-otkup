import type { NextRequest } from 'next/server'
import { jeBlagdan } from '@/lib/blagdani'
import { dodajDane, sutraUZagrebu } from '@/lib/datum'
import { DANA_U_KALENDARU, type KalendarOdgovor } from '@/lib/kalendar'
import { createAdminClient } from '@/lib/supabase/admin'
import { kalendarUpitShema } from '@/lib/validacija/narudzba'

// GET /api/kalendar?naselje=ID
// Slobodni dani za narudžbu iz zadanog naselja, od sutra (po hrvatskom vremenu)
// za idućih DANA_U_KALENDARU dana. Isti dan može biti slobodan za kupca iz blizine,
// a pun za kupca iz Osijeka, jer daljina troši više bodova.
//
// Nedjelje, ručno zatvorene i pune dane izbacuje funkcija slobodni_dani u bazi,
// a blagdane ova ruta (blagdani.ts). Kupac ne vidi tuđe narudžbe ni bodove.
// Ruta je javna i ne kešira se, jer se dan može popuniti svakog trenutka.
export async function GET(request: NextRequest) {
  const provjera = kalendarUpitShema.safeParse({
    naselje: request.nextUrl.searchParams.get('naselje'),
  })
  if (!provjera.success) {
    return Response.json({ greska: 'Neispravno naselje.' }, { status: 400 })
  }
  const naseljeId = provjera.data.naselje
  const supabase = createAdminClient()

  const { data: naselje, error: greskaNaselja } = await supabase
    .from('naselja')
    .select('id, zupanije (pokrivena)')
    .eq('id', naseljeId)
    .maybeSingle()
  if (greskaNaselja) {
    console.error('Naselje za kalendar nije učitano:', greskaNaselja)
    return Response.json({ greska: 'Kalendar trenutno ne radi.' }, { status: 500 })
  }
  if (!naselje) {
    return Response.json({ greska: 'Naselje ne postoji.' }, { status: 404 })
  }

  const bezKesa = { headers: { 'Cache-Control': 'no-store' } }

  if (!naselje.zupanije.pokrivena) {
    return Response.json({ pokriveno: false } satisfies KalendarOdgovor, bezKesa)
  }

  const od = sutraUZagrebu()
  const doDana = dodajDane(od, DANA_U_KALENDARU - 1)
  const { data: dani, error } = await supabase.rpc('slobodni_dani', {
    p_naselje_id: naseljeId,
    p_od: od,
    p_do: doDana,
  })
  if (error) {
    console.error('Slobodni dani nisu učitani:', error)
    return Response.json({ greska: 'Kalendar trenutno ne radi.' }, { status: 500 })
  }

  const odgovor: KalendarOdgovor = {
    pokriveno: true,
    od,
    do: doDana,
    slobodni: dani.filter((dan) => !jeBlagdan(dan)),
  }
  return Response.json(odgovor, bezKesa)
}
