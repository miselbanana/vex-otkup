'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChartColumn, ClipboardList, Menu, Settings, Tags } from 'lucide-react'
import { cn } from 'cn'
import { GumbOdjava } from '@/components/admin/gumb-odjava'
import { buttonVariants } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const STAVKE = [
  { href: '/admin/narudzbe', natpis: 'Narudžbe', Ikona: ClipboardList },
  { href: '/admin/cjenik', natpis: 'Cjenik', Ikona: Tags },
  { href: '/admin/analitika', natpis: 'Analitika', Ikona: ChartColumn },
] as const

// Zajednički izgled jednog gumba u donjoj navigaciji (najmanje 48 px visine).
const klaseStavke =
  'flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-150 ease-out'

// Donja navigacija admina, kao u mobilnim aplikacijama.
// Mora raditi u pregledniku (usePathname) da zna koja je stranica otvorena.
export function DonjaNavigacija({ email }: { email: string }) {
  const putanja = usePathname()
  const [viseOtvoreno, setViseOtvoreno] = useState(false)

  const aktivna = (href: string) => putanja === href || putanja.startsWith(`${href}/`)

  return (
    <nav
      aria-label="Glavna navigacija"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {STAVKE.map(({ href, natpis, Ikona }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={aktivna(href) ? 'page' : undefined}
              className={cn(
                klaseStavke,
                aktivna(href) ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Ikona className="size-6" />
              {natpis}
            </Link>
          </li>
        ))}

        <li>
          <Sheet open={viseOtvoreno} onOpenChange={setViseOtvoreno}>
            <SheetTrigger
              className={cn(
                klaseStavke,
                'w-full',
                aktivna('/admin/postavke')
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Menu className="size-6" />
              Više
            </SheetTrigger>

            <SheetContent side="bottom" className="rounded-t-xl pb-[env(safe-area-inset-bottom)]">
              <SheetHeader>
                <SheetTitle className="text-[22px] font-semibold">Više</SheetTitle>
                <SheetDescription className="truncate">Prijavljeni ste kao {email}</SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-2 px-4 pb-4">
                <Link
                  href="/admin/postavke"
                  onClick={() => setViseOtvoreno(false)}
                  className={buttonVariants({ variant: 'outline', className: 'w-full justify-start' })}
                >
                  <Settings />
                  Postavke
                </Link>
                <GumbOdjava />
              </div>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  )
}
