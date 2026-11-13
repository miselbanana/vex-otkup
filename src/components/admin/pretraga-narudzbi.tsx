import Form from 'next/form'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Pretraga po imenu, mobitelu, mjestu ili broju narudžbe.
// Next.js <Form> upis pretvara u link /admin/narudzbe?q=…, bez ponovnog učitavanja stranice.
export function PretragaNarudzbi({ upit }: { upit: string }) {
  return (
    <Form action="/admin/narudzbe" role="search" className="flex gap-2">
      <Input
        // Novi upit (ili brisanje) postavlja polje ispočetka.
        key={upit}
        name="q"
        type="search"
        defaultValue={upit}
        placeholder="Ime, mobitel ili mjesto"
        aria-label="Pretraži narudžbe"
        enterKeyHint="search"
        className="flex-1"
      />
      {upit ? (
        <Link
          href="/admin/narudzbe"
          aria-label="Očisti pretragu"
          className={buttonVariants({ variant: 'outline', size: 'icon' })}
        >
          <X />
        </Link>
      ) : null}
      <Button type="submit" variant="outline" size="icon" aria-label="Traži">
        <Search />
      </Button>
    </Form>
  )
}
