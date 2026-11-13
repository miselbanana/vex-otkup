'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { spremiNapomenu } from '@/app/(admin)/admin/narudzbe/akcije'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

// Interna napomena: vide je samo Vedran i Mišel (npr. "zvati poslije 16 h", "pas u dvorištu").
export function InternaNapomena({ id, napomena }: { id: string; napomena: string | null }) {
  const [tekst, setTekst] = useState(napomena ?? '')
  const [radi, zapocni] = useTransition()
  const promijenjeno = tekst.trim() !== (napomena ?? '')

  function spremi() {
    zapocni(async () => {
      try {
        const { greska } = await spremiNapomenu(id, tekst)
        if (greska) toast.error(greska)
        else toast.success('Napomena je spremljena.')
      } catch {
        toast.error('Veza ne radi. Pokušajte ponovno.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`napomena-${id}`} className="font-medium">
        Interna napomena
      </label>
      <Textarea
        id={`napomena-${id}`}
        value={tekst}
        maxLength={1000}
        placeholder="Vidite je samo vi, kupac je ne vidi."
        onChange={(e) => setTekst(e.target.value)}
      />
      <Button variant="outline" disabled={!promijenjeno || radi} onClick={spremi}>
        {radi ? 'Spremam…' : 'Spremi napomenu'}
      </Button>
    </div>
  )
}
