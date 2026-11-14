// Podaci o tvrtki koji se prikazuju na sajtu. Mijenjaju se samo ovdje.

export const NAZIV = 'Čelik'
export const OPIS = 'Otkup sekundarnih sirovina'
export const PODRUCJE = 'Od Rijeke do Slavonije'

// PRIVREMENI broj. Zamijeniti Vedranovim prije puštanja uživo (korak 1.15).
export const TELEFON_PRIKAZ = '091 000 0000'
// Isti broj u međunarodnom obliku, za link koji na mobitelu pokreće poziv.
export const TELEFON_LINK = 'tel:+385910000000'

// Podaci o obrtu za politiku privatnosti (voditelj obrade osobnih podataka).
// PRIVREMENO — zamijeniti Vedranovim podacima prije puštanja uživo (korak 1.15).
export const OBRT_NAZIV = 'Čelik, obrt za otkup sekundarnih sirovina, vl. Ime Prezime'
export const OBRT_OIB = '00000000000'
export const OBRT_ADRESA = 'Ulica bb, 48000 Koprivnica'
export const EMAIL_PRIVATNOST = 'privatnost@example.com'

// Datum od kojeg vrijedi politika privatnosti. Namjerno je tekst, a ne new Date():
// uz cacheComponents new Date() ne smije biti u statičnom dijelu stranice.
export const POLITIKA_VRIJEDI_OD = '13. 11. 2026.'
