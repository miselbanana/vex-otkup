'use server'

import { refresh } from 'next/cache'
import { z } from 'zod'
import { poredajDan } from '@/lib/admin/raspored'
import { zahtijevajKorisnika } from '@/lib/supabase/provjera'

export type OdgovorAkcije = { greska?: string }

const pomakniShema = z.object({
  id: z.uuid(),
  smjer: z.enum(['gore', 'dolje']),
})

// Pomiče potvrđenu narudžbu jedno mjesto gore ili dolje unutar njezina dana (planer).
// Nakon pomaka cijeli dan dobiva ručni redoslijed 1…n, pa ostaje kako ga je Vedran složio.
export async function pomakni(id: string, smjer: 'gore' | 'dolje'): Promise<OdgovorAkcije> {
  const { supabase } = await zahtijevajKorisnika()

  const provjera = pomakniShema.safeParse({ id, smjer })
  if (!provjera.success) return { greska: 'Neispravan zahtjev.' }

  const { data: narudzba, error: greskaNarudzbe } = await supabase
    .from('narudzbe')
    .select('datum_odvoza, status')
    .eq('id', id)
    .maybeSingle()
  if (greskaNarudzbe) return { greska: 'Spremanje nije uspjelo. Pokušajte ponovno.' }
  if (!narudzba || narudzba.status !== 'potvrdjena') {
    return { greska: 'Narudžba više nije u rasporedu. Osvježite popis.' }
  }

  const { data: dan, error: greskaDana } = await supabase
    .from('narudzbe')
    .select('id, dio_dana, udaljenost_km, redoslijed, created_at')
    .eq('status', 'potvrdjena')
    .eq('datum_odvoza', narudzba.datum_odvoza)
  if (greskaDana) return { greska: 'Spremanje nije uspjelo. Pokušajte ponovno.' }

  // Isti redoslijed kakav Vedran vidi na ekranu, pa zamjena sa susjedom.
  const redom = poredajDan(dan)
  const i = redom.findIndex((n) => n.id === id)
  const j = smjer === 'gore' ? i - 1 : i + 1
  if (i < 0 || j < 0 || j >= redom.length) {
    refresh()
    return {}
  }
  ;[redom[i], redom[j]] = [redom[j], redom[i]]

  // Zapisuje se samo ono što se promijenilo (najčešće dvije narudžbe).
  const promjene = redom
    .map((n, indeks) => ({ id: n.id, redoslijed: indeks + 1, stari: n.redoslijed }))
    .filter((n) => n.redoslijed !== n.stari)

  const rezultati = await Promise.all(
    promjene.map((n) =>
      supabase.from('narudzbe').update({ redoslijed: n.redoslijed }).eq('id', n.id),
    ),
  )
  if (rezultati.some((r) => r.error)) {
    return { greska: 'Spremanje nije uspjelo. Pokušajte ponovno.' }
  }

  refresh()
  return {}
}
