import 'server-only'
import type { createClient } from '@/lib/supabase/server'
import { BUCKET_FOTOGRAFIJA } from '@/lib/fotografije'

// Dohvat narudžbi za admin popis (korak 1.8).
// Radi s klijentom prijavljenog korisnika (RLS), nikad s tajnim ključem.

type Klijent = Awaited<ReturnType<typeof createClient>>

export const KARTICE = ['nove', 'raspored', 'realizirane', 'otkazane'] as const
export type Kartica = (typeof KARTICE)[number]

// Koliko narudžbi se prikazuje odjednom ("Učitaj još" dodaje još toliko).
export const NARUDZBI_PO_STRANICI = 50
// Gornja granica za "Učitaj još", da se link ne može zloupotrijebiti.
const NAJVISE_NARUDZBI = 1000

// Stavka ima dvije veze na klase (prijavljena i stvarna), pa se veza imenuje stupcem.
const STUPCI = `
  id, broj, status, ime_prezime, mobitel, ulica, lat, lng,
  zeljeni_datum, datum_odvoza, dio_dana, bodovi, udaljenost_km, redoslijed,
  napomena_kupca, napomena_interna, razlog_otkaza, created_at, realizirana_at, procjena_ukupno,
  naselje:naselja ( naziv, opcina, zupanija:zupanije ( naziv ) ),
  stavke ( id, kg_prijavljeno, klasa:klase!klasa_id ( naziv, materijal:materijali ( naziv ) ) ),
  fotografije ( id, putanja )
` as const

function upitNarudzbi(supabase: Klijent) {
  return supabase.from('narudzbe').select(STUPCI)
}

export type NarudzbaPopisa = NonNullable<
  Awaited<ReturnType<typeof upitNarudzbi>>['data']
>[number]

// Broj narudžbi za prikaz iz linka (?broj=100): višekratnik od 50, najmanje 50.
export function procitajBroj(tekst: string | undefined): number {
  const broj = Number(tekst)
  if (!Number.isInteger(broj) || broj < NARUDZBI_PO_STRANICI) return NARUDZBI_PO_STRANICI
  return Math.min(NAJVISE_NARUDZBI, Math.ceil(broj / NARUDZBI_PO_STRANICI) * NARUDZBI_PO_STRANICI)
}

// Narudžbe za jednu karticu ili rezultate pretrage (pretraga gleda sve statuse).
// Dohvaća jednu više od traženog broja, da se zna treba li gumb "Učitaj još".
export async function dohvatiNarudzbe(
  supabase: Klijent,
  { kartica, upit, broj }: { kartica: Kartica; upit: string; broj: number },
): Promise<{ narudzbe: NarudzbaPopisa[]; imaJos: boolean }> {
  let upitBaze = upit
    ? // Funkcija vraća retke tablice narudzbe, pa veze rade kao i inače.
      supabase.rpc('trazi_narudzbe', { upit }).select(STUPCI)
    : upitNarudzbi(supabase)

  if (!upit) {
    switch (kartica) {
      case 'nove':
        // Lista za potvrdu: najnovija na vrhu (Mišelova odluka u 1.8).
        upitBaze = upitBaze.eq('status', 'nova').order('created_at', { ascending: false })
        break
      case 'raspored':
        upitBaze = upitBaze
          .eq('status', 'potvrdjena')
          .order('datum_odvoza', { ascending: true })
          .order('created_at', { ascending: true })
        break
      case 'realizirane':
        upitBaze = upitBaze
          .eq('status', 'realizirana')
          .order('realizirana_at', { ascending: false })
        break
      case 'otkazane':
        upitBaze = upitBaze.eq('status', 'otkazana').order('created_at', { ascending: false })
        break
    }
  }

  // Raspored se ne reže na 50: dan presječen na pola dao bi krivi zbroj kila i gotovine.
  if (!upit && kartica === 'raspored') broj = NAJVISE_NARUDZBI

  const { data, error } = await upitBaze
    .order('id', { referencedTable: 'stavke', ascending: true })
    .order('id', { referencedTable: 'fotografije', ascending: true })
    .limit(broj + 1)

  if (error) throw new Error(`Dohvat narudžbi nije uspio: ${error.message}`)

  return { narudzbe: data.slice(0, broj), imaJos: data.length > broj }
}

// Broj narudžbi koje čekaju potvrdu (brojač na kartici "Nove").
export async function brojNovih(supabase: Klijent): Promise<number> {
  const { count, error } = await supabase
    .from('narudzbe')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'nova')
  if (error) throw new Error(`Brojanje novih narudžbi nije uspjelo: ${error.message}`)
  return count ?? 0
}

// Zauzeti bodovi po danu i kapacitet dana (za "3/4" u rasporedu).
// Dan zauzimaju nove i potvrđene narudžbe, isto kao u kalendaru (1.5).
export async function zauzetostDana(
  supabase: Klijent,
  dani: string[],
): Promise<{ bodovi: Map<string, number>; kapacitet: number | null }> {
  if (dani.length === 0) return { bodovi: new Map(), kapacitet: null }

  const [narudzbe, postavke] = await Promise.all([
    supabase
      .from('narudzbe')
      .select('datum_odvoza, bodovi')
      .in('status', ['nova', 'potvrdjena'])
      .in('datum_odvoza', dani),
    supabase.from('postavke_kalendara').select('kapacitet_dana').maybeSingle(),
  ])
  if (narudzbe.error) throw new Error(`Dohvat bodova nije uspio: ${narudzbe.error.message}`)
  if (postavke.error) throw new Error(`Dohvat postavki nije uspio: ${postavke.error.message}`)

  const bodovi = new Map<string, number>()
  for (const n of narudzbe.data) {
    bodovi.set(n.datum_odvoza, (bodovi.get(n.datum_odvoza) ?? 0) + n.bodovi)
  }
  return { bodovi, kapacitet: postavke.data?.kapacitet_dana ?? null }
}

// Potpisani linkovi (1 sat) za sličice fotografija, kao mapa putanja → link.
// Bucket je privatan; čitanje prijavljenima dopušta migracija popis_narudzbi.
export async function linkoviFotografija(
  supabase: Klijent,
  putanje: string[],
): Promise<Map<string, string>> {
  const linkovi = new Map<string, string>()
  if (putanje.length === 0) return linkovi

  const { data, error } = await supabase.storage
    .from(BUCKET_FOTOGRAFIJA)
    .createSignedUrls(putanje, 60 * 60)
  if (error) {
    // Bez sličica popis i dalje radi, pa se greška samo zapiše.
    console.error('Potpisani linkovi fotografija nisu uspjeli:', error.message)
    return linkovi
  }
  for (const f of data) {
    if (f.path && f.signedUrl) linkovi.set(f.path, f.signedUrl)
  }
  return linkovi
}
