import { Suspense } from 'react'
import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { DonjaNavigacija } from '@/components/admin/donja-navigacija'
import { Logo } from '@/components/logo'
import { zahtijevajKorisnika } from '@/lib/supabase/provjera'

// Manifest je povezan samo ovdje, pa ga javne stranice nikad ne dobiju.
// Kupcima Chrome tako ne nudi instalaciju, a Vedranu nudi „Čelik admin” (public/admin.webmanifest).
export const metadata: Metadata = {
  manifest: '/admin.webmanifest',
}

// Boja trake na vrhu mobitela = boja admin zaglavlja (bg-card).
export const viewport: Viewport = {
  themeColor: '#ffffff',
}

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
      <header className="sticky top-0 z-30 border-b bg-card">
        <div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between px-4">
          <Link href="/admin/narudzbe" aria-label="Narudžbe" className="rounded-lg">
            <Logo bezOpisa />
          </Link>
          <span className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Admin
          </span>
        </div>
      </header>

      {/* Donji razmak da sadržaj ne ode ispod donje navigacije. */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-4 pb-28">{children}</main>

      <DonjaNavigacija email={user.email ?? ''} />
    </div>
  )
}
