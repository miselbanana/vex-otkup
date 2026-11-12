'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { prijava, type StanjePrijave } from './akcije'

const pocetnoStanje: StanjePrijave = { greska: null }

export function FormaPrijave({ sljedeca }: { sljedeca: string }) {
  const [stanje, posalji, saljeSe] = useActionState(prijava, pocetnoStanje)

  return (
    <form action={posalji} className="flex flex-col gap-4">
      <input type="hidden" name="sljedeca" value={sljedeca} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-12"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="lozinka">Lozinka</Label>
        <Input
          id="lozinka"
          name="lozinka"
          type="password"
          autoComplete="current-password"
          required
          className="h-12"
        />
      </div>

      {stanje.greska && (
        <p role="alert" className="text-sm text-destructive">
          {stanje.greska}
        </p>
      )}

      <Button type="submit" disabled={saljeSe} className="h-12 text-base">
        {saljeSe ? 'Prijava…' : 'Prijavi se'}
      </Button>
    </form>
  )
}
