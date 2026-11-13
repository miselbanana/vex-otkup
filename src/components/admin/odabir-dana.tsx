'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { linkPlanera } from '@/lib/admin/raspored'
import { dodajDane, jeDatum } from '@/lib/datum'

// Odabir dana u planeru: ◀ prethodni dan, mobitelov kalendar, ▶ sljedeći dan, i "Danas".
export function OdabirDana({ datum, danas }: { datum: string; danas: string }) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Link
          href={linkPlanera(dodajDane(datum, -1), danas)}
          aria-label="Prethodni dan"
          className={buttonVariants({ variant: 'outline', size: 'icon' })}
        >
          <ChevronLeft />
        </Link>
        <Input
          type="date"
          aria-label="Odaberi dan"
          value={datum}
          onChange={(e) => {
            if (jeDatum(e.target.value)) router.push(linkPlanera(e.target.value, danas))
          }}
          className="flex-1 text-center"
        />
        <Link
          href={linkPlanera(dodajDane(datum, 1), danas)}
          aria-label="Sljedeći dan"
          className={buttonVariants({ variant: 'outline', size: 'icon' })}
        >
          <ChevronRight />
        </Link>
      </div>
      {datum !== danas && (
        <Link
          href={linkPlanera(danas, danas)}
          className={buttonVariants({ variant: 'ghost', className: 'w-full' })}
        >
          Natrag na danas
        </Link>
      )}
    </div>
  )
}
