'use server'

import { refresh } from 'next/cache'
import { z } from 'zod'
import { poredajDan } from '@/lib/admin/raspored'
import { provjeriDan } from '@/lib/admin/termin'
import { jeDatum, trenutakUZagrebu } from '@/lib/datum'
import { zahtijevajKorisnika } from '@/lib/supabase/provjera'
import { Constants } from '@/lib/supabase/tipovi'

// `upozorenja` = ništa nije spremljeno, jer je dan nedjelja, blagdan, zatvoren ili pun.
// Dijalog ih pokaže, a "Ipak spremi" ponovi poziv s prekoraci = true.
export type OdgovorAkcije = { greska?: string; upozorenja?: string[] }

const { dio_dana: DIJELOVI_DANA, razlog_otkaza: RAZLOZI_OTKAZA } = Constants.public.Enums

export type DioDana = (typeof DIJELOVI_DANA)[number]
export type RazlogOtkaza = (typeof RAZLOZI_OTKAZA)[number]

// Termin iz dijaloga. Vrijeme je neobavezno ("09:30"); bez njega se dogovoreni sat briše.
export type TerminUnos = { datum: string; dioDana?: DioDana; vrijeme?: string }

const GRESKA_SPREMANJA = 'Spremanje nije uspjelo. Pokušajte ponovno.'
const PROMIJENJENA = 'Narudžba je u međuvremenu promijenjena. Osvježite stranicu.'
const NAJVISE_ZNAKOVA_INTERNE = 1000

const terminShema = z.object({
  id: z.uuid(),
  datum: z.string().refine(jeDatum),
  dioDana: z.enum(DIJELOVI_DANA).optional(),
  vrijeme: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  prekoraci: z.boolean(),
})

const pomakniShema = z.object({
  id: z.uuid(),
  smjer: z.enum(['gore', 'dolje']),
})

const otkaziShema = z.object({
  id: z.uuid(),
  razlog: z.enum(RAZLOZI_OTKAZA),
})

const napomenaShema = z.object({
  id: z.uuid(),
  tekst: z.string().max(NAJVISE_ZNAKOVA_INTERNE),
})

// Nova narudžba → potvrđena, s danom, dijelom dana i (neobavezno) točnim vremenom.
export async function potvrdi(
  id: string,
  termin: TerminUnos,
  prekoraci = false,
): Promise<OdgovorAkcije> {
  const { supabase } = await zahtijevajKorisnika()

  const provjera = terminShema.safeParse({ id, ...termin, prekoraci })
  if (!provjera.success) return { greska: 'Neispravan dan ili vrijeme.' }
  const unos = provjera.data

  const { data: narudzba, error } = await supabase
    .from('narudzbe')
    .select('status, bodovi, dio_dana')
    .eq('id', id)
    .maybeSingle()
  if (error) return { greska: GRESKA_SPREMANJA }
  if (!narudzba || narudzba.status !== 'nova') return promijenjena()

  const dan = await provjeriDan(supabase, { id, datum: unos.datum, bodovi: narudzba.bodovi })
  if ('greska' in dan) return { greska: dan.greska }
  if (dan.upozorenja.length > 0 && !unos.prekoraci) return { upozorenja: dan.upozorenja }

  // Uvjet na status: ako je narudžbu u međuvremenu netko otkazao, ne mijenja se ništa.
  const { data: spremljeno, error: greskaSpremanja } = await supabase
    .from('narudzbe')
    .update({
      status: 'potvrdjena',
      potvrdjena_at: new Date().toISOString(),
      datum_odvoza: unos.datum,
      dio_dana: unos.dioDana ?? narudzba.dio_dana,
      dogovoreni_termin: unos.vrijeme ? trenutakUZagrebu(unos.datum, unos.vrijeme) : null,
      redoslijed: null,
    })
    .eq('id', id)
    .eq('status', 'nova')
    .select('id')
  if (greskaSpremanja) return { greska: GRESKA_SPREMANJA }
  if (spremljeno.length === 0) return promijenjena()

  refresh()
  return {}
}

// Potvrđena narudžba dobiva drugi dan (i po želji dio dana i vrijeme).
// U novom danu redoslijed kreće ispočetka (automatsko mjesto), a provjera dana
// je ista kao kod potvrde. Ako dan ostaje isti, mijenja se samo dio dana i vrijeme.
export async function promijeniDan(
  id: string,
  termin: TerminUnos,
  prekoraci = false,
): Promise<OdgovorAkcije> {
  const { supabase } = await zahtijevajKorisnika()

  const provjera = terminShema.safeParse({ id, ...termin, prekoraci })
  if (!provjera.success) return { greska: 'Neispravan dan ili vrijeme.' }
  const unos = provjera.data

  const { data: narudzba, error } = await supabase
    .from('narudzbe')
    .select('status, bodovi, datum_odvoza')
    .eq('id', id)
    .maybeSingle()
  if (error) return { greska: GRESKA_SPREMANJA }
  if (!narudzba || narudzba.status !== 'potvrdjena') return promijenjena()

  const noviDan = unos.datum !== narudzba.datum_odvoza
  if (noviDan) {
    const dan = await provjeriDan(supabase, { id, datum: unos.datum, bodovi: narudzba.bodovi })
    if ('greska' in dan) return { greska: dan.greska }
    if (dan.upozorenja.length > 0 && !unos.prekoraci) return { upozorenja: dan.upozorenja }
  }

  const { data: spremljeno, error: greskaSpremanja } = await supabase
    .from('narudzbe')
    .update({
      datum_odvoza: unos.datum,
      ...(unos.dioDana && { dio_dana: unos.dioDana }),
      dogovoreni_termin: unos.vrijeme ? trenutakUZagrebu(unos.datum, unos.vrijeme) : null,
      ...(noviDan && { redoslijed: null }),
    })
    .eq('id', id)
    .eq('status', 'potvrdjena')
    .select('id')
  if (greskaSpremanja) return { greska: GRESKA_SPREMANJA }
  if (spremljeno.length === 0) return promijenjena()

  refresh()
  return {}
}

// Nova ili potvrđena narudžba → otkazana, uvijek s razlogom.
export async function otkazi(id: string, razlog: RazlogOtkaza): Promise<OdgovorAkcije> {
  const { supabase } = await zahtijevajKorisnika()

  const provjera = otkaziShema.safeParse({ id, razlog })
  if (!provjera.success) return { greska: 'Odaberite razlog otkaza.' }

  const { data: spremljeno, error } = await supabase
    .from('narudzbe')
    .update({ status: 'otkazana', razlog_otkaza: provjera.data.razlog, redoslijed: null })
    .eq('id', id)
    .in('status', ['nova', 'potvrdjena'])
    .select('id')
  if (error) return { greska: GRESKA_SPREMANJA }
  if (spremljeno.length === 0) return promijenjena()

  refresh()
  return {}
}

// Interna napomena (vidi je samo admin). Prazan tekst briše napomenu.
export async function spremiNapomenu(id: string, tekst: string): Promise<OdgovorAkcije> {
  const { supabase } = await zahtijevajKorisnika()

  const provjera = napomenaShema.safeParse({ id, tekst })
  if (!provjera.success) {
    return { greska: `Napomena može imati najviše ${NAJVISE_ZNAKOVA_INTERNE} znakova.` }
  }
  const napomena = provjera.data.tekst.trim() || null

  const { data: spremljeno, error } = await supabase
    .from('narudzbe')
    .update({ napomena_interna: napomena })
    .eq('id', id)
    .select('id')
  if (error) return { greska: GRESKA_SPREMANJA }
  if (spremljeno.length === 0) return promijenjena()

  refresh()
  return {}
}

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
  if (greskaNarudzbe) return { greska: GRESKA_SPREMANJA }
  if (!narudzba || narudzba.status !== 'potvrdjena') {
    return { greska: 'Narudžba više nije u rasporedu. Osvježite popis.' }
  }

  const { data: dan, error: greskaDana } = await supabase
    .from('narudzbe')
    .select('id, dio_dana, udaljenost_km, redoslijed, created_at')
    .eq('status', 'potvrdjena')
    .eq('datum_odvoza', narudzba.datum_odvoza)
  if (greskaDana) return { greska: GRESKA_SPREMANJA }

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
    return { greska: GRESKA_SPREMANJA }
  }

  refresh()
  return {}
}

// Netko je u međuvremenu promijenio narudžbu (npr. drugi korisnik ju je otkazao).
// Osvježi ekran, da Vedran vidi pravo stanje.
function promijenjena(): OdgovorAkcije {
  refresh()
  return { greska: PROMIJENJENA }
}
