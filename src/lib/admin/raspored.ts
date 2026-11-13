// Redoslijed obilaska i grupiranje potvrđenih narudžbi po danu (kartica "Raspored").
// Nema ovisnosti o serveru: isto pravilo koriste prikaz i akcija pomakni().
import type { Database } from '@/lib/supabase/tipovi'

type DioDana = Database['public']['Enums']['dio_dana']

type ZaRedoslijed = {
  dio_dana: DioDana
  udaljenost_km: number
  redoslijed: number | null
  created_at: string
}

const RANG_DIJELA_DANA: Record<DioDana, number> = { jutro: 0, popodne: 1, svejedno: 2 }

// Redoslijed unutar jednog dana:
//   1) ručni redoslijed (strelice), a narudžbe bez njega idu iza
//   2) jutro → popodne → svejedno
//   3) od najbližeg prema najdaljem od polazišta (Reka)
export function poredajDan<T extends ZaRedoslijed>(narudzbe: T[]): T[] {
  return [...narudzbe].sort(
    (a, b) =>
      (a.redoslijed ?? Infinity) - (b.redoslijed ?? Infinity) ||
      RANG_DIJELA_DANA[a.dio_dana] - RANG_DIJELA_DANA[b.dio_dana] ||
      a.udaljenost_km - b.udaljenost_km ||
      a.created_at.localeCompare(b.created_at),
  )
}

export type DanRasporeda<T> = { datum: string; narudzbe: T[] }

// Link na planer rute za zadani dan (za danas bez ?dan=, da link ostane kratak).
export function linkPlanera(datum: string, danas: string): string {
  return datum === danas
    ? '/admin/narudzbe?kartica=raspored'
    : `/admin/narudzbe?kartica=raspored&dan=${datum}`
}

// Grupira narudžbe po datum_odvoza i svaki dan poreda s poredajDan().
// Danas i budući dani idu redom (danas na vrhu), a prošli dani (potvrđeno,
// a još nije realizirano) idu u zasebni popis, da ne nestanu iz vida.
export function grupirajPoDanu<T extends ZaRedoslijed & { datum_odvoza: string }>(
  narudzbe: T[],
  danas: string,
): { dolazeci: DanRasporeda<T>[]; prosli: DanRasporeda<T>[] } {
  const poDanu = new Map<string, T[]>()
  for (const n of narudzbe) {
    const dan = poDanu.get(n.datum_odvoza)
    if (dan) dan.push(n)
    else poDanu.set(n.datum_odvoza, [n])
  }

  const dani = [...poDanu.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([datum, n]) => ({ datum, narudzbe: poredajDan(n) }))

  return {
    dolazeci: dani.filter((d) => d.datum >= danas),
    prosli: dani.filter((d) => d.datum < danas),
  }
}
