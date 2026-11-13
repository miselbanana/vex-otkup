import Link from 'next/link'
import { Phone } from 'lucide-react'
import { Logo } from '@/components/logo'
import { buttonVariants } from '@/components/ui/button'
import { TELEFON_LINK, TELEFON_PRIKAZ } from '@/lib/kontakt'

// Zaglavlje javnog sajta. Lijepi se za vrh ekrana dok se stranica pomiče.
export function Zaglavlje() {
  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" aria-label="Početna stranica" className="rounded-lg">
          {/* Na uskom mobitelu bez podnaslova, da sve stane u jedan red. */}
          <Logo bezOpisa className="sm:hidden" />
          <Logo className="hidden sm:flex" />
        </Link>

        <div className="flex items-center gap-2">
          {/* Na uskom mobitelu nema mjesta za link, tamo do cjenika vodi početna stranica. */}
          <Link
            href="/cjenik"
            // max-sm:hidden, a ne hidden: gumb već ima inline-flex, koji bi pobijedio običan hidden.
            className={buttonVariants({ variant: 'ghost', className: 'max-sm:hidden' })}
          >
            Cjenik
          </Link>
          {/* Na mobitelu samo ikona slušalice, a broj se prikazuje kad ima mjesta. */}
          <a
            href={TELEFON_LINK}
            aria-label={`Nazovite nas: ${TELEFON_PRIKAZ}`}
            className={buttonVariants({
              variant: 'outline',
              className: 'w-12 px-0 md:w-auto md:px-4',
            })}
          >
            <Phone />
            <span className="hidden tabular-nums md:inline">{TELEFON_PRIKAZ}</span>
          </a>
          <Link href="/naruci" className={buttonVariants()}>
            Naruči odvoz
          </Link>
        </div>
      </div>
    </header>
  )
}
