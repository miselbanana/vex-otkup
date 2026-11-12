import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { odjava } from '@/app/prijava/akcije'

export function GumbOdjava() {
  return (
    <form action={odjava}>
      <Button type="submit" variant="outline" className="w-full justify-start">
        <LogOut />
        Odjava
      </Button>
    </form>
  )
}
