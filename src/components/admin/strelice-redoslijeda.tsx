'use client'

import { useTransition } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { toast } from 'sonner'
import { pomakni } from '@/app/(admin)/admin/narudzbe/akcije'
import { Button } from '@/components/ui/button'

// Strelice gore/dolje za ručni redoslijed obilaska unutar dana.
export function StreliceRedoslijeda({
  id,
  prva,
  zadnja,
}: {
  id: string
  prva: boolean
  zadnja: boolean
}) {
  const [radi, zapocni] = useTransition()

  function pomakniNarudzbu(smjer: 'gore' | 'dolje') {
    zapocni(async () => {
      const { greska } = await pomakni(id, smjer)
      if (greska) toast.error(greska)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        size="icon"
        aria-label="Pomakni ranije"
        disabled={prva || radi}
        onClick={() => pomakniNarudzbu('gore')}
      >
        <ArrowUp />
      </Button>
      <Button
        variant="outline"
        size="icon"
        aria-label="Pomakni kasnije"
        disabled={zadnja || radi}
        onClick={() => pomakniNarudzbu('dolje')}
      >
        <ArrowDown />
      </Button>
    </div>
  )
}
