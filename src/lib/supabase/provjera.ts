import { redirect } from 'next/navigation'
import { createClient } from './server'

// Ponovna provjera prijavljenog korisnika na serveru.
// Koristi je admin layout i SVAKA serverska akcija ili admin API ruta,
// jer provjera u proxy.ts sama nije dovoljna.
// getUser() pita Supabase je li prijava valjana (getSession() bi samo vjerovao kolačiću).
export async function zahtijevajKorisnika() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/prijava')
  }

  return { supabase, user }
}
