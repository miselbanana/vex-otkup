import { BUCKET_FOTOGRAFIJA, putanjaFotografije, type UploadOdgovor } from '@/lib/fotografije'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadZahtjevShema } from '@/lib/validacija/narudzba'

// POST /api/narudzbe/upload  { broj: 1–5 }
// Stvara novi id narudžbe i za svaku fotografiju potpisani link za upload
// na putanju narudzbe/{id}/{n}.jpg. Same fotografije NE prolaze kroz ovaj server:
// preglednik ih šalje izravno u Supabase Storage (Vercel prima najviše 4,5 MB po zahtjevu).
//
// Ruta je javna (kupac nije prijavljen). Bucket dopušta samo JPEG do 2 MB,
// a fotografije bez narudžbe brišu se same (korak 2.8).
export async function POST(request: Request) {
  let tijelo: unknown
  try {
    tijelo = await request.json()
  } catch {
    return Response.json({ greska: 'Neispravan zahtjev.' }, { status: 400 })
  }

  const provjera = uploadZahtjevShema.safeParse(tijelo)
  if (!provjera.success) {
    return Response.json({ greska: 'Neispravan broj fotografija.' }, { status: 400 })
  }

  // Id narudžbe nastaje ovdje, na serveru. U koraku 1.6 postaje id retka
  // u tablici narudzbe, pa drugo slanje iste narudžbe baza odbija.
  const id = crypto.randomUUID()
  const bucket = createAdminClient().storage.from(BUCKET_FOTOGRAFIJA)

  const rezultati = await Promise.all(
    Array.from({ length: provjera.data.broj }, (_, i) =>
      bucket.createSignedUploadUrl(putanjaFotografije(id, i + 1)),
    ),
  )

  const linkovi: UploadOdgovor['linkovi'] = []
  for (const { data, error } of rezultati) {
    if (error || !data) {
      console.error('Potpisani link za upload nije stvoren:', error)
      return Response.json(
        { greska: 'Slanje fotografija trenutno ne radi. Pokušajte ponovno.' },
        { status: 500 },
      )
    }
    linkovi.push({ putanja: data.path, token: data.token })
  }

  const odgovor: UploadOdgovor = { id, linkovi }
  return Response.json(odgovor)
}
