import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { odjava } from '@/app/prijava/akcije'

export function GumbOdjava() {
  return (
    <form action={odjava}>
      <Button type="submit" variant="outline" className="h-12 px-4 text-base">
        <LogOut />
        Odjava
      </Button>
    </form>
  )
}
