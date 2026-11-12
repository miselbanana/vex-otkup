import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './tipovi'

// Supabase klijent za server (Server Components, serverske akcije, route handleri).
// Prijavljenog korisnika uvijek provjeravaj sa supabase.auth.getUser(), nikad getSession().
// Novi klijent se radi za svaki zahtjev, nikad se ne dijeli između zahtjeva.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(kolacici) {
          try {
            kolacici.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Server Components ne smiju postavljati kolačiće.
            // To je u redu jer sesiju osvježava proxy.ts (korak 0.6).
          }
        },
      },
    },
  )
}
