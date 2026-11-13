import Link from 'next/link'
import { cn } from 'cn'
import type { Kartica } from '@/lib/admin/narudzbe'

const NAZIVI: Record<Kartica, string> = {
  nove: 'Nove',
  raspored: 'Raspored',
  realizirane: 'Realizirane',
  otkazane: 'Otkazane',
}

// Četiri kartice popisa. Otvorena kartica je zapisana u linku (?kartica=…),
// pa ostaje otvorena i nakon osvježavanja.
export function KarticeNarudzbi({ aktivna, brojNovih }: { aktivna: Kartica; brojNovih: number }) {
  return (
    <nav aria-label="Vrste narudžbi" className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
      {(Object.keys(NAZIVI) as Kartica[]).map((k) => (
        <Link
          key={k}
          href={k === 'nove' ? '/admin/narudzbe' : `/admin/narudzbe?kartica=${k}`}
          aria-current={k === aktivna ? 'page' : undefined}
          className={cn(
            'flex min-h-12 items-center justify-center gap-1 rounded-lg px-1 text-sm font-medium transition-colors duration-150 ease-out',
            k === aktivna
              ? 'bg-card text-foreground shadow-kartica'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {NAZIVI[k]}
          {k === 'nove' && brojNovih > 0 && (
            <span
              className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-status-nova px-1.5 text-xs text-white tabular-nums"
              aria-label={`${brojNovih} novih`}
            >
              {brojNovih}
            </span>
          )}
        </Link>
      ))}
    </nav>
  )
}
