'use server'

import { refresh } from 'next/cache'
import { z } from 'zod'
import { danasUZagrebu, dodajDane, jeDatum } from '@/lib/datum'
import { zahtijevajKorisnika } from '@/lib/supabase/provjera'
import {
  NAJVISE_ZNAKOVA_RAZLOGA,
  postavkeKalendaraShema,
  type PostavkeKalendara,
} from '@/lib/validacija/postavke'

// Postavke kalendara (1.11): kapacitet dana, granice udaljenosti i bodovi te
// zatvaranje i otvaranje dana. Javni kalendar (/api/kalendar) se ne kešira,
// pa kupci promjenu vide odmah, bez osvježavanja keša.

// `upozorenja` = ništa nije spremljeno; dijalog nudi "Ipak zatvori" (ipak = true).
export type OdgovorPostavki = { greska?: string; upozorenja?: string[] }

const GRESKA_SPREMANJA = 'Spremanje nije uspjelo. Pokušajte ponovno.'

// Koliko daleko unaprijed se dan može zatvoriti (kao kod dogovora termina).
const NAJVISE_DANA_UNAPRIJED = 365

const datumShema = z.string().refine(jeDatum)

const zatvoriShema = z.object({
  datum: datumShema,
  razlog: z.string().trim().max(NAJVISE_ZNAKOVA_RAZLOGA),
  ipak: z.boolean(),
})

// Novi kapacitet, granice i bodovi. Vrijede za nove narudžbe; postojeće zadržavaju
// bodove iz trenutka narudžbe, ali se zbrajaju prema novom kapacitetu dana.
export async function spremiPostavkeKalendara(unos: PostavkeKalendara): Promise<OdgovorPostavki> {
  const { supabase } = await zahtijevajKorisnika()

  const provjera = postavkeKalendaraShema.safeParse(unos)
  if (!provjera.success) {
    const poruka = provjera.error.issues.find((i) => i.code === 'custom')?.message
    return { greska: poruka ?? 'Provjerite brojeve: bodovi su cijeli brojevi, a km najviše 500.' }
  }
  const p = provjera.data

  const { data, error } = await supabase
    .from('postavke_kalendara')
    .update({
      kapacitet_dana: p.kapacitet,
      granica_1_km: p.granica1,
      bodovi_1: p.bodovi1,
      granica_2_km: p.granica2,
      bodovi_2: p.bodovi2,
      bodovi_dalje: p.bodoviDalje,
    })
    .eq('id', true)
    .select('id')
  if (error) {
    console.error('Postavke kalendara nisu spremljene:', error.message)
    return { greska: GRESKA_SPREMANJA }
  }
  if (data.length === 0) return { greska: 'Postavke kalendara ne postoje u bazi.' }

  refresh()
  return {}
}

// Zatvara dan (godišnji, kvar kamiona…). Kupci ga više ne mogu odabrati.
// Narudžbe koje su već na taj dan ostaju: Vedran s kupcima dogovara drugi dan.
// Ako je dan već zatvoren, samo se mijenja razlog.
export async function zatvoriDan(
  datum: string,
  razlog: string,
  ipak = false,
): Promise<OdgovorPostavki> {
  const { supabase } = await zahtijevajKorisnika()

  const provjera = zatvoriShema.safeParse({ datum, razlog, ipak })
  if (!provjera.success) {
    return { greska: `Odaberite dan. Razlog može imati najviše ${NAJVISE_ZNAKOVA_RAZLOGA} znakova.` }
  }
  const unos = provjera.data

  const danas = danasUZagrebu()
  if (unos.datum < danas) return { greska: 'Dan u prošlosti se ne može zatvoriti.' }
  if (unos.datum > dodajDane(danas, NAJVISE_DANA_UNAPRIJED)) {
    return { greska: 'Dan se može zatvoriti najviše godinu dana unaprijed.' }
  }

  if (!unos.ipak) {
    const { count, error } = await supabase
      .from('narudzbe')
      .select('id', { count: 'exact', head: true })
      .eq('datum_odvoza', unos.datum)
      .in('status', ['nova', 'potvrdjena'])
    if (error) {
      console.error('Provjera narudžbi dana nije uspjela:', error.message)
      return { greska: GRESKA_SPREMANJA }
    }
    if (count && count > 0) {
      return {
        upozorenja: [
          `Taj dan već ima ${count} ${count === 1 ? 'narudžbu' : count < 5 ? 'narudžbe' : 'narudžbi'}. ` +
            'One ostaju na tom danu, pa s kupcima dogovorite drugi dan.',
        ],
      }
    }
  }

  const { error } = await supabase
    .from('zatvoreni_dani')
    .upsert({ datum: unos.datum, razlog: unos.razlog || null })
  if (error) {
    console.error('Dan nije zatvoren:', error.message)
    return { greska: GRESKA_SPREMANJA }
  }

  refresh()
  return {}
}

// Ponovno otvara zatvoreni dan.
export async function otvoriDan(datum: string): Promise<OdgovorPostavki> {
  const { supabase } = await zahtijevajKorisnika()

  const provjera = datumShema.safeParse(datum)
  if (!provjera.success) return { greska: 'Neispravan dan.' }

  const { error } = await supabase.from('zatvoreni_dani').delete().eq('datum', provjera.data)
  if (error) {
    console.error('Dan nije otvoren:', error.message)
    return { greska: GRESKA_SPREMANJA }
  }

  refresh()
  return {}
}
