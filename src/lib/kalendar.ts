// Zajedničko za API rutu /api/kalendar i kalendar u koraku 3 narudžbe.

// Koliko dana unaprijed kupac može birati (od sutra).
export const DANA_U_KALENDARU = 30

// Odgovor rute GET /api/kalendar?naselje=ID.
// Kupac vidi koji su dani slobodni i ima li slobodan dan već neku narudžbu,
// ali nikad tuđe narudžbe, njihov broj ni bodove.
export type KalendarOdgovor =
  | { pokriveno: false }
  | {
      pokriveno: true
      // prvi i zadnji dan kalendara (GGGG-MM-DD)
      od: string
      do: string
      // dani na koje stane narudžba iz tog naselja (bez nedjelja, blagdana, zatvorenih i punih dana)
      slobodni: string[]
      // slobodni dani koji već imaju barem jednu narudžbu (žuti u kalendaru)
      djelomicni: string[]
    }
