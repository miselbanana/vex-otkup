import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './tipovi'

// Supabase klijent s tajnim (service role) ključem.
// PAZI: ovaj ključ zaobilazi SVA RLS pravila. Koristi ga samo na serveru,
// i to samo ondje gdje je nužno (npr. javni upis narudžbe, potpisani linkovi za upload).
// Ova datoteka je jedino mjesto u kodu koje čita SUPABASE_SERVICE_ROLE_KEY.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )
}
