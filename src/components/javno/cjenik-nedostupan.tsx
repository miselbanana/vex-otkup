import { Phone } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TELEFON_LINK, TELEFON_PRIKAZ } from '@/lib/kontakt'

// Prikazuje se kad u cjeniku nema nijednog aktivnog materijala (/cjenik, /naruci).
export function CjenikNedostupan() {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-3">
        <p>Cjenik trenutno nije dostupan. Nazovite nas i rado ćemo vam reći cijene.</p>
        <a href={TELEFON_LINK} className={buttonVariants()}>
          <Phone />
          <span className="tabular-nums">{TELEFON_PRIKAZ}</span>
        </a>
      </CardContent>
    </Card>
  )
}
