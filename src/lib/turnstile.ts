import 'server-only'
import { TURNSTILE_AKCIJA } from '@/lib/validacija/narudzba'

// Provjera Cloudflare Turnstile tokena (zaštita od botova) na serveru.
// Widget u pregledniku daje token, a ovdje Cloudflare potvrđuje da je pravi.
// Svaki token vrijedi jednom i najviše 5 minuta.

const ADRESA_PROVJERE = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

type OdgovorProvjere = {
  success: boolean
  action?: string
  'error-codes'?: string[]
}

// Vraća true samo ako je Cloudflare potvrdio token. Ako tajni ključ nije postavljen
// ili Cloudflare ne odgovara, vraća false: bolje odbiti narudžbu nego pustiti bota.
export async function provjeriTurnstile(token: string, ip: string | null): Promise<boolean> {
  const tajna = process.env.TURNSTILE_SECRET_KEY
  if (!tajna) {
    console.error('TURNSTILE_SECRET_KEY nije postavljen, narudžba je odbijena.')
    return false
  }

  const tijelo = new URLSearchParams({ secret: tajna, response: token })
  if (ip) tijelo.set('remoteip', ip)

  try {
    const odgovor = await fetch(ADRESA_PROVJERE, {
      method: 'POST',
      body: tijelo,
      signal: AbortSignal.timeout(10_000),
    })
    const rezultat = (await odgovor.json()) as OdgovorProvjere
    if (!rezultat.success) {
      console.warn('Turnstile je odbio token:', rezultat['error-codes'])
      return false
    }
    // Token mora biti izdan za narudžbu. Testni ključevi (lokalni razvoj) ne vraćaju naziv radnje.
    if (rezultat.action && rezultat.action !== TURNSTILE_AKCIJA) {
      console.warn('Turnstile token je za drugu radnju:', rezultat.action)
      return false
    }
    return true
  } catch (greska) {
    console.error('Provjera Turnstilea nije uspjela:', greska)
    return false
  }
}
