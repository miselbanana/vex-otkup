// Izračun procjene narudžbe: cijena po kg × količina.
// Istu funkciju koriste preglednik (kalkulator, forma narudžbe) i server,
// koji nikad ne vjeruje iznosu iz preglednika nego sam ponovno računa.

// Ono što je kupac odabrao: klasa i količina u kg.
export type StavkaUnos = {
  klasaId: number
  kg: number
}

// Dio cjenika potreban za izračun.
export type KlasaCijena = {
  id: number
  cijena_po_kg: number
}

export type StavkaProcjene = StavkaUnos & {
  cijenaKg: number
  // iznos retka, zaokružen na 2 decimale (samo za prikaz)
  iznos: number
}

export type Procjena = {
  stavke: StavkaProcjene[]
  // ukupni iznos, zaokružen na 2 decimale tek na kraju
  ukupno: number
}

// Najveća količina po retku. Sprječava besmislene unose (npr. 1e12 kg).
export const NAJVISE_KG = 100_000

// Računa procjenu. Stavke s nepoznatom klasom ili neispravnom količinom se preskaču.
export function izracunajProcjenu(stavke: StavkaUnos[], klase: KlasaCijena[]): Procjena {
  const cijene = new Map(klase.map((k) => [k.id, k.cijena_po_kg]))

  const rezultat: StavkaProcjene[] = []
  // Zbroj u centima, NEZAOKRUŽEN. JavaScript računa 0,1 + 0,2 = 0,30000000000000004,
  // pa se na 2 decimale zaokružuje tek na samom kraju.
  let ukupnoCenti = 0

  for (const s of stavke) {
    const cijenaKg = cijene.get(s.klasaId)
    if (cijenaKg === undefined) continue
    if (!Number.isFinite(s.kg) || s.kg <= 0 || s.kg > NAJVISE_KG) continue

    // Cijena je u bazi numeric(10,2), pa je u centima uvijek cijeli broj.
    const centi = Math.round(cijenaKg * 100) * s.kg
    ukupnoCenti += centi
    rezultat.push({ ...s, cijenaKg, iznos: Math.round(centi) / 100 })
  }

  return { stavke: rezultat, ukupno: Math.round(ukupnoCenti) / 100 }
}

// Pretvara stavke u tekst za link na narudžbu: /naruci?s=3:12.5,7:40
// (klasaId:kg, retci odvojeni zarezom). Čita ga forma narudžbe u koraku 1.3.
export function stavkeUUrl(stavke: StavkaUnos[]): string {
  return stavke.map((s) => `${s.klasaId}:${s.kg}`).join(',')
}
