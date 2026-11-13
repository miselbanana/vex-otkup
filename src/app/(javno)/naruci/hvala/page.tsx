import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CircleCheck, Phone } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TELEFON_LINK, TELEFON_PRIKAZ } from '@/lib/kontakt'

export const metadata: Metadata = {
  title: 'Narudžba je zaprimljena',
  // Stranica nakon narudžbe nema smisla u Googleu.
  robots: { index: false },
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>

// Broj narudžbe u obliku 2026-0042.
const OBLIK_BROJA = /^\d{4}-\d{4,}$/

// Zahvala nakon poslane narudžbe. Broj narudžbe stiže u linku (?broj=2026-0042),
// a čita se unutar <Suspense> (pravilo uz cacheComponents).
export default function HvalaStranica({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-5">
        <CircleCheck className="size-12 text-status-realizirana" aria-hidden="true" />
        <div className="flex flex-col gap-2">
          <h1>Narudžba je zaprimljena</h1>
          <Suspense fallback={null}>
            <BrojNarudzbe searchParams={searchParams} />
          </Suspense>
        </div>

        <p className="max-w-prose text-lg">
          Hvala! Nazvat ćemo vas u najkraćem roku da dogovorimo točan termin odvoza. Ako se
          želite javiti prije, nazovite nas.
        </p>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <a href={TELEFON_LINK} className={buttonVariants({ variant: 'outline' })}>
            <Phone />
            {TELEFON_PRIKAZ}
          </a>
          <Link href="/" className={buttonVariants()}>
            Na početnu
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

async function BrojNarudzbe({ searchParams }: { searchParams: SearchParams }) {
  const { broj } = await searchParams
  if (typeof broj !== 'string' || !OBLIK_BROJA.test(broj)) return null

  return (
    <p className="text-lg text-muted-foreground">
      Broj narudžbe:{' '}
      <strong className="font-heading text-2xl font-bold text-foreground tabular-nums">
        {broj}
      </strong>
    </p>
  )
}
