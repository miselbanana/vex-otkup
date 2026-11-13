'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

// Drži popis narudžbi svježim:
//   - Supabase Realtime javlja svaku promjenu u tablici narudzbe (nova, potvrda…)
//   - povratak aplikacije na ekran (Android u pozadini prekida vezu)
//   - gumb "Osvježi"
// Svaki put se poziva router.refresh(): server ponovno složi popis, a ovo što je
// na ekranu (otvorena kartica, pretraga) ostaje, jer je zapisano u linku.
// `osvjezeno` je trenutak (ms) kad je server zadnji put složio popis.
export function PopisUzivo({ osvjezeno }: { osvjezeno: number }) {
  const router = useRouter()
  const [osvjezava, zapocni] = useTransition()
  const [uzivo, setUzivo] = useState(false)
  const [sada, setSada] = useState(() => Date.now())
  const odgoda = useRef<ReturnType<typeof setTimeout>>(undefined)

  const osvjezi = useCallback(() => {
    zapocni(() => router.refresh())
  }, [router])

  // Realtime: više promjena zaredom (npr. pomak u rasporedu mijenja dvije narudžbe)
  // spaja se u jedno osvježavanje.
  useEffect(() => {
    const supabase = createClient()
    const kanal = supabase
      .channel('admin-narudzbe')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'narudzbe' }, () => {
        clearTimeout(odgoda.current)
        odgoda.current = setTimeout(osvjezi, 300)
      })
      .subscribe((stanje) => setUzivo(stanje === 'SUBSCRIBED'))

    return () => {
      clearTimeout(odgoda.current)
      void supabase.removeChannel(kanal)
    }
  }, [osvjezi])

  // Aplikacija se vratila na ekran: možda je u međuvremenu stiglo nešto novo.
  useEffect(() => {
    function naPromjenuVidljivosti() {
      if (document.visibilityState === 'visible') osvjezi()
    }
    document.addEventListener('visibilitychange', naPromjenuVidljivosti)
    return () => document.removeEventListener('visibilitychange', naPromjenuVidljivosti)
  }, [osvjezi])

  // "Osvježeno prije X min" se sam ažurira.
  useEffect(() => {
    const sat = setInterval(() => setSada(Date.now()), 30_000)
    return () => clearInterval(sat)
  }, [])

  const minuta = Math.max(0, Math.floor((sada - osvjezeno) / 60_000))

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col text-sm">
        <span className="flex items-center gap-2 font-medium">
          <span
            aria-hidden="true"
            className={cn('size-2.5 rounded-full', uzivo ? 'bg-status-realizirana' : 'bg-muted-foreground/50')}
          />
          {uzivo ? 'Uživo' : 'Nije uživo'}
        </span>
        <span className="text-muted-foreground" suppressHydrationWarning>
          {minuta === 0 ? 'Osvježeno upravo' : `Osvježeno prije ${minuta} min`}
        </span>
      </div>

      <Button variant="outline" onClick={osvjezi} disabled={osvjezava}>
        <RefreshCw className={cn(osvjezava && 'animate-spin')} />
        Osvježi
      </Button>
    </div>
  )
}
