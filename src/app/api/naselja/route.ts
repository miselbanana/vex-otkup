import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { naseljaUpitShema, type Naselje } from '@/lib/validacija/narudzba'

// GET /api/naselja?q=kopr
// Vraća do 10 naselja čiji naziv (ili riječ u nazivu) počinje upitom, s općinom,
// županijom i podatkom dolazi li Vedran onamo. Kvačice nisu važne ("cakovec" → Čakovec).
//
// Ruta je javna (pretraga u koraku 3 narudžbe). Tablice čita tajnim ključem,
// jer RLS anonimnima ne dopušta čitanje, i vraća samo ova polja.
export async function GET(request: NextRequest) {
  const provjera = naseljaUpitShema.safeParse({
    q: request.nextUrl.searchParams.get('q') ?? '',
  })
  if (!provjera.success) {
    return Response.json({ greska: 'Neispravan upit.' }, { status: 400 })
  }

  // Za jedno slovo ima previše pogodaka, pa se ni ne traži.
  const upit = provjera.data.q
  if (upit.length < 2) return Response.json([] satisfies Naselje[])

  const { data, error } = await createAdminClient().rpc('trazi_naselja', { upit })
  if (error) {
    console.error('Pretraga naselja nije uspjela:', error)
    return Response.json({ greska: 'Pretraga trenutno ne radi.' }, { status: 500 })
  }

  return Response.json(data satisfies Naselje[])
}
