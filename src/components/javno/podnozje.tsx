import Link from 'next/link'
import { MapPin, Phone } from 'lucide-react'
import { Logo } from '@/components/logo'
import { NAZIV, OPIS, PODRUCJE, TELEFON_LINK, TELEFON_PRIKAZ } from '@/lib/kontakt'

// Podnožje javnog sajta.
// Godina se namjerno ne ispisuje: uz cacheComponents new Date() ne smije biti u statičnom dijelu stranice.
export function Podnozje() {
  return (
    <footer className="mt-auto border-t bg-card">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:flex-row sm:justify-between">
        <div className="flex flex-col gap-4">
          <Logo />
          <ul className="flex flex-col gap-1 text-muted-foreground">
            <li>
              <a
                href={TELEFON_LINK}
                className="inline-flex min-h-12 items-center gap-2 font-medium text-foreground hover:text-primary"
              >
                <Phone className="size-4" />
                <span className="tabular-nums">{TELEFON_PRIKAZ}</span>
              </a>
            </li>
            <li className="inline-flex items-center gap-2">
              <MapPin className="size-4" />
              {PODRUCJE}
            </li>
          </ul>
        </div>

        <nav aria-label="Poveznice" className="flex flex-col items-start sm:items-end">
          <Link
            href="/cjenik"
            className="inline-flex min-h-12 items-center underline-offset-4 hover:text-primary hover:underline"
          >
            Cjenik
          </Link>
          <Link
            href="/politika-privatnosti"
            className="inline-flex min-h-12 items-center underline-offset-4 hover:text-primary hover:underline"
          >
            Politika privatnosti
          </Link>
          {/* Otvaranje postavki kolačića spajamo s vanilla-cookieconsentom u koraku 1.13. */}
          <button
            type="button"
            className="inline-flex min-h-12 items-center underline-offset-4 hover:text-primary hover:underline"
          >
            Postavke kolačića
          </button>
        </nav>
      </div>

      <div className="border-t">
        <p className="mx-auto w-full max-w-5xl px-4 py-4 text-sm text-muted-foreground">
          © {NAZIV} · {OPIS}
        </p>
      </div>
    </footer>
  )
}
