// Zajedničko za fotografije narudžbe (preglednik i server).

// Privatni bucket u Supabase Storageu (migracija bucket_fotografije).
export const BUCKET_FOTOGRAFIJA = 'fotografije'

// Kupac dodaje od 1 do 5 fotografija.
export const NAJVISE_FOTOGRAFIJA = 5

// Putanja fotografije u bucketu: narudzbe/{id}/{n}.jpg (n kreće od 1).
export function putanjaFotografije(narudzbaId: string, n: number): string {
  return `narudzbe/${narudzbaId}/${n}.jpg`
}

// Odgovor rute POST /api/narudzbe/upload.
// `token` je jednokratna dozvola za upload točno na tu putanju (vrijedi 2 sata).
export type UploadOdgovor = {
  id: string
  linkovi: { putanja: string; token: string }[]
}
