import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Proxy (u starijim verzijama Next.js: middleware) radi prije svake stranice pod /admin.
// 1. Osvježava Supabase sesiju (istekli pristupni token zamijeni novim i spremi u kolačić).
// 2. Neprijavljene šalje na /prijava.
// Ovo je samo prva brana: admin layout i svaka serverska akcija opet provjeravaju korisnika.
export async function proxy(request: NextRequest) {
  let odgovor = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(kolacici) {
          // Novi kolačići moraju ići i u zahtjev (da ih stranica vidi) i u odgovor (da ih vidi preglednik).
          kolacici.forEach(({ name, value }) => request.cookies.set(name, value))
          odgovor = NextResponse.next({ request })
          kolacici.forEach(({ name, value, options }) =>
            odgovor.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Između createServerClient i getUser() ne smije biti drugog koda.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/prijava'
    url.search = ''
    url.searchParams.set('sljedeca', request.nextUrl.pathname)

    // Preusmjeravanje mora ponijeti kolačiće koje je Supabase upravo postavio (npr. brisanje stare sesije).
    const preusmjeri = NextResponse.redirect(url)
    odgovor.cookies.getAll().forEach((kolacic) => preusmjeri.cookies.set(kolacic))
    return preusmjeri
  }

  return odgovor
}

export const config = {
  // Samo admin. Javni sajt ne treba prijavu, pa ga proxy ne usporava.
  // Admin API rute (npr. /api/izvoz) dodat ćemo ovdje kad ih budemo radili.
  matcher: ['/admin/:path*'],
}
