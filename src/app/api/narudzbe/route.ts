import { jeBlagdan } from '@/lib/blagdani'
import { dodajDane, sutraUZagrebu } from '@/lib/datum'
import { BUCKET_FOTOGRAFIJA } from '@/lib/fotografije'
import { DANA_U_KALENDARU } from '@/lib/kalendar'
import { createAdminClient } from '@/lib/supabase/admin'
import { provjeriTurnstile } from '@/lib/turnstile'
import {
  narudzbaZahtjevShema,
  type KodGreskeNarudzbe,
  type NarudzbaOdgovor,
} from '@/lib/validacija/narudzba'

// POST /api/narudzbe — sprema narudžbu s javnog sajta.
// Ruta je javna (kupac nije prijavljen), pa ničemu iz preglednika ne vjeruje:
//   1. Turnstile (zaštita od botova)
//   2. Zod provjera podataka i mobitel u obliku +3859…
//   3. dan: unutar kalendara i nije blagdan
//   4. fotografije stvarno postoje u Storageu
//   5. kreiraj_narudzbu u bazi: u jednoj transakciji zaključa dan, provjeri mjesto,
//      sama izračuna bodove, cijene i procjenu, pa upiše narudžbu, stavke i fotografije.
export async function POST(request: Request) {
  let tijelo: unknown
  try {
    tijelo = await request.json()
  } catch {
    return greska('podaci', 'Neispravan zahtjev.', 400)
  }

  // 1) Turnstile prvi, da bot ne troši bazu.
  const token =
    typeof tijelo === 'object' && tijelo !== null && 'turnstileToken' in tijelo
      ? tijelo.turnstileToken
      : null
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  if (typeof token !== 'string' || !(await provjeriTurnstile(token, ip))) {
    return greska(
      'turnstile',
      'Provjera da niste robot nije uspjela. Pričekajte trenutak i pokušajte ponovno.',
      400,
    )
  }

  // 2) Podaci (mobitel se ovdje pretvara u +3859…).
  const provjera = narudzbaZahtjevShema.safeParse(tijelo)
  if (!provjera.success) {
    console.warn('Neispravna narudžba:', provjera.error.issues)
    return greska('podaci', 'Neki podaci nisu ispravni. Provjerite narudžbu.', 400)
  }
  const n = provjera.data

  // 3) Dan mora biti u kalendaru koji kupac vidi i ne smije biti blagdan
  //    (nedjelje, zatvorene i pune dane provjerava baza).
  const sutra = sutraUZagrebu()
  if (
    n.zeljeniDatum < sutra ||
    n.zeljeniDatum > dodajDane(sutra, DANA_U_KALENDARU - 1) ||
    jeBlagdan(n.zeljeniDatum)
  ) {
    return greska('dan', 'Odabrani dan više nije dostupan. Odaberite drugi.', 409)
  }

  const supabase = createAdminClient()

  // 4) Fotografije: sve moraju biti u Storageu.
  const { data: datoteke, error: greskaPopisa } = await supabase.storage
    .from(BUCKET_FOTOGRAFIJA)
    .list(`narudzbe/${n.id}`, { limit: 100 })
  if (greskaPopisa) {
    console.error('Popis fotografija nije učitan:', greskaPopisa)
    return greska('server', 'Slanje trenutno ne radi. Pokušajte ponovno za minutu.', 500)
  }
  const postoje = new Set(datoteke.map((d) => `narudzbe/${n.id}/${d.name}`))
  if (!n.fotografije.every((p) => postoje.has(p))) {
    return greska('fotografije', 'Fotografije nisu stigle do nas. Pošaljite ih ponovno.', 409)
  }

  // 5) Spremanje u jednoj transakciji.
  const { data: broj, error } = await supabase.rpc('kreiraj_narudzbu', {
    p_id: n.id,
    p_ime_prezime: n.imePrezime,
    p_mobitel: n.mobitel,
    p_naselje_id: n.naseljeId,
    p_ulica: n.ulica,
    p_zeljeni_datum: n.zeljeniDatum,
    p_dio_dana: n.dioDana,
    p_stavke: n.stavke.map((s) => ({ klasa_id: s.klasaId, kg: s.kg })),
    p_fotografije: n.fotografije,
    p_lat: n.lat ?? undefined,
    p_lng: n.lng ?? undefined,
    p_napomena: n.napomena || undefined,
    p_utm_source: n.izvor?.utm_source,
    p_utm_campaign: n.izvor?.utm_campaign,
    p_fbclid: n.izvor?.fbclid,
  })

  if (error) {
    // Isti id stigao je dvaput u istom trenutku (za različite dane): vrati već spremljenu.
    if (error.code === '23505') {
      const { data: postojeca } = await supabase
        .from('narudzbe')
        .select('broj')
        .eq('id', n.id)
        .maybeSingle()
      if (postojeca) return Response.json({ broj: postojeca.broj } satisfies NarudzbaOdgovor)
    }

    const poruka = error.message
    if (poruka.includes('DAN_POPUNJEN')) {
      return greska('dan_popunjen', 'Taj dan se upravo popunio, odaberite drugi.', 409)
    }
    if (poruka.includes('DAN_NIJE_DOSTUPAN')) {
      return greska('dan', 'Odabrani dan više nije dostupan. Odaberite drugi.', 409)
    }
    if (poruka.includes('KLASA_NEDOSTUPNA')) {
      return greska(
        'cjenik',
        'Cjenik se u međuvremenu promijenio. Provjerite materijale i pošaljite ponovno.',
        409,
      )
    }
    if (poruka.includes('IZVAN_PODRUCJA')) {
      return greska('podrucje', 'Trenutno ne dolazimo na vaše područje.', 409)
    }
    if (poruka.includes('NEISPRAVNI_PODACI')) {
      return greska('podaci', 'Neki podaci nisu ispravni. Provjerite narudžbu.', 400)
    }
    console.error('Narudžba nije spremljena:', error)
    return greska('server', 'Slanje trenutno ne radi. Pokušajte ponovno za minutu.', 500)
  }

  return Response.json({ broj } satisfies NarudzbaOdgovor)
}

function greska(kod: KodGreskeNarudzbe, poruka: string, status: number) {
  return Response.json({ greska: poruka, kod } satisfies NarudzbaOdgovor, { status })
}
