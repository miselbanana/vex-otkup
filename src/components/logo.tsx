import { cn } from 'cn'
import { NAZIV, OPIS } from '@/lib/kontakt'

// Znak: presjek čeličnog I-nosača (bijeli) na bakrenoj pločici.
export function ZnakLogotipa({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-9 shrink-0', className)}>
      <rect width="32" height="32" rx="7" className="fill-primary" />
      <path d="M7 7h18v4.5h-6.5v9H25V25H7v-4.5h6.5v-9H7z" fill="#fff" />
    </svg>
  )
}

// Logotip: znak + naziv. Naziv je tekst (ne slika), pa je uvijek oštar i koristi font za naslove.
export function Logo({ className, bezOpisa = false }: { className?: string; bezOpisa?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <ZnakLogotipa />
      <span className="flex flex-col leading-none">
        <span className="font-heading text-2xl font-bold tracking-tight text-foreground">
          {NAZIV}
        </span>
        {!bezOpisa && (
          <span className="mt-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {OPIS}
          </span>
        )}
      </span>
    </span>
  )
}
