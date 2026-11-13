'use server'

import { refresh, revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'
import { zahtijevajKorisnika } from '@/lib/supabase/provjera'
import {
  cijenaCjenikaShema,
  GRESKA_CIJENE,
  GRESKA_TEKSTA,
  idShema,
  tekstKlaseShema,
  type TekstKlase,
} from '@/lib/validacija/cjenik'

// Uređivanje cjenika (1.11). Svaka akcija nakon spremanja osvježava javni cjenik,
// pa kupci odmah vide novu cijenu, bez novog deploya.

export type OdgovorCjenika = { greska?: string }

const GRESKA_SPREMANJA = 'Spremanje nije uspjelo. Pokušajte ponovno.'
const NEMA_KLASE = 'Klasa više ne postoji. Osvježite stranicu.'
const ISTI_NAZIV = 'Klasa s tim nazivom već postoji u ovom materijalu.'

// Nova cijena jedne klase. Okidač u bazi bilježi trenutak promjene (klase.azurirano).
export async function spremiCijenu(klasaId: number, cijena: number): Promise<OdgovorCjenika> {
  const { supabase } = await zahtijevajKorisnika()

  const provjera = z
    .object({ klasaId: idShema, cijena: cijenaCjenikaShema })
    .safeParse({ klasaId, cijena })
  if (!provjera.success) return { greska: GRESKA_CIJENE }

  const { data, error } = await supabase
    .from('klase')
    .update({ cijena_po_kg: provjera.data.cijena })
    .eq('id', provjera.data.klasaId)
    .select('id')
  if (error) return neuspjelo('Cijena nije spremljena:', error.message)
  if (data.length === 0) return { greska: NEMA_KLASE }

  osvjeziCjenik()
  return {}
}

// Naziv i opis klase (opis kupcu pomaže da sam prepozna klasu).
export async function urediKlasu(klasaId: number, tekst: TekstKlase): Promise<OdgovorCjenika> {
  const { supabase } = await zahtijevajKorisnika()

  const provjera = z
    .object({ klasaId: idShema, tekst: tekstKlaseShema })
    .safeParse({ klasaId, tekst })
  if (!provjera.success) return { greska: GRESKA_TEKSTA }
  const { naziv, opis } = provjera.data.tekst

  const { data, error } = await supabase
    .from('klase')
    .update({ naziv, opis })
    .eq('id', provjera.data.klasaId)
    .select('id')
  if (error) {
    if (error.code === '23505') return { greska: ISTI_NAZIV }
    return neuspjelo('Klasa nije spremljena:', error.message)
  }
  if (data.length === 0) return { greska: NEMA_KLASE }

  osvjeziCjenik()
  return {}
}

// Uključuje ili isključuje klasu. Isključena nestaje s javnog cjenika i iz narudžbe,
// a stare narudžbe i realizacija je i dalje prikazuju.
export async function postaviAktivnu(klasaId: number, aktivna: boolean): Promise<OdgovorCjenika> {
  const { supabase } = await zahtijevajKorisnika()

  const provjera = z
    .object({ klasaId: idShema, aktivna: z.boolean() })
    .safeParse({ klasaId, aktivna })
  if (!provjera.success) return { greska: 'Neispravan zahtjev.' }

  const { data, error } = await supabase
    .from('klase')
    .update({ aktivna: provjera.data.aktivna })
    .eq('id', provjera.data.klasaId)
    .select('id')
  if (error) return neuspjelo('Uključenost klase nije spremljena:', error.message)
  if (data.length === 0) return { greska: NEMA_KLASE }

  osvjeziCjenik()
  return {}
}

// Nova klasa u postojećem materijalu. Odmah je uključena i vidljiva kupcima.
export async function dodajKlasu(
  materijalId: number,
  unos: TekstKlase & { cijena: number },
): Promise<OdgovorCjenika> {
  const { supabase } = await zahtijevajKorisnika()

  const provjera = z
    .object({ materijalId: idShema, tekst: tekstKlaseShema, cijena: cijenaCjenikaShema })
    .safeParse({ materijalId, tekst: { naziv: unos.naziv, opis: unos.opis }, cijena: unos.cijena })
  if (!provjera.success) return { greska: `${GRESKA_TEKSTA} ${GRESKA_CIJENE}` }
  const { naziv, opis } = provjera.data.tekst

  const { error } = await supabase.from('klase').insert({
    materijal_id: provjera.data.materijalId,
    naziv,
    opis,
    cijena_po_kg: provjera.data.cijena,
    aktivna: true,
  })
  if (error) {
    if (error.code === '23505') return { greska: ISTI_NAZIV }
    if (error.code === '23503') return { greska: 'Materijal više ne postoji. Osvježite stranicu.' }
    return neuspjelo('Klasa nije dodana:', error.message)
  }

  osvjeziCjenik()
  return {}
}

// Javni cjenik je keširan (dohvatiCjenik, oznaka 'cjenik') i koriste ga /, /cjenik i /naruci.
// updateTag ga odmah poništava, pa sljedeći kupac čeka svježe podatke umjesto da vidi stare.
// revalidatePath još osvježava gotove stranice, a refresh() ovaj admin ekran.
function osvjeziCjenik() {
  updateTag('cjenik')
  revalidatePath('/cjenik')
  revalidatePath('/')
  refresh()
}

function neuspjelo(poruka: string, detalj: string): OdgovorCjenika {
  console.error(poruka, detalj)
  return { greska: GRESKA_SPREMANJA }
}
