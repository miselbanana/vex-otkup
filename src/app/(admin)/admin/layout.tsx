import { Suspense } from 'react'
import { GumbOdjava } from '@/components/admin/gumb-odjava'
import { zahtijevajKorisnika } from '@/lib/supabase/provjera'

// Uz cacheComponents se kolačići smiju čitati samo unutar <Suspense>.
// Zato provjera korisnika živi u komponenti ispod, a ne na vrhu layouta.
export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <Suspense fallback={<p className="p-4 text-muted-foreground">Učitavanje…</p>}>
      <ZasticeniOkvir>{children}</ZasticeniOkvir>
    </Suspense>
  )
}

async function ZasticeniOkvir({ children }: { children: React.ReactNode }) {
  // Druga provjera, na serveru (prva je u proxy.ts).
  // Bez prijavljenog korisnika ovdje se preusmjerava na /prijava i children se nikad ne prikaže.
  const { user } = await zahtijevajKorisnika()

  return (
    <div className="flex flex-1 flex-col">
      {/* Privremena traka. Navigaciju i dizajn radimo u koraku 0.7. */}
      <header className="flex items-center justify-between gap-4 border-b px-4 py-2">
        <span className="truncate text-sm text-muted-foreground">{user.email}</span>
        <GumbOdjava />
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  )
}
