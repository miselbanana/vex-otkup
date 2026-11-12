import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './tipovi'

// Supabase klijent za preglednik (koristi se u 'use client' komponentama).
// Koristi samo javni (anon) ključ, pa vrijede sva RLS pravila.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
