import { Suspense } from 'react'
import type { Metadata } from 'next'
import { FormaPostavkiKalendara } from '@/components/admin/forma-postavki-kalendara'
import { ZatvoreniDani } from '@/components/admin/zatvoreni-dani'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { dohvatiPostavkeKalendara, dohvatiZatvoreneDane } from '@/lib/admin/postavke'
import { danasUZagrebu } from '@/lib/datum'
import { zahtijevajKorisnika } from '@/lib/supabase/provjera'

export const metadata: Metadata = { title: 'Postavke' }

// Postavke (1.11): kalendar odvoza (kapacitet, bodovi, zatvoreni dani).
// Naslov je statičan, a postavke se dočitaju svježe (prijava je podatak zahtjeva).
export default function StranicaPostavki() {
  return (
    <div className="flex flex-col gap-4">
      <h1>Postavke</h1>
      <Suspense fallback={<KosturPostavki />}>
        <Postavke />
      </Suspense>
    </div>
  )
}

async function Postavke() {
  const { supabase } = await zahtijevajKorisnika()
  const danas = danasUZagrebu()
  const [postavke, zatvoreni] = await Promise.all([
    dohvatiPostavkeKalendara(supabase),
    dohvatiZatvoreneDane(supabase, danas),
  ])

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl font-semibold">Kapacitet i udaljenost</CardTitle>
        </CardHeader>
        <CardContent>
          {postavke ? (
            <FormaPostavkiKalendara
              // Novi podaci iz baze (npr. nakon spremanja) = forma kreće ispočetka.
              key={JSON.stringify(postavke)}
              polaziste={postavke.polaziste}
              pocetno={{
                kapacitet: postavke.kapacitet_dana,
                granica1: postavke.granica_1_km,
                bodovi1: postavke.bodovi_1,
                granica2: postavke.granica_2_km,
                bodovi2: postavke.bodovi_2,
                bodoviDalje: postavke.bodovi_dalje,
              }}
            />
          ) : (
            <p className="text-muted-foreground">
              Postavke kalendara još nisu upisane u bazu (supabase/postavke.sql).
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl font-semibold">Zatvoreni dani</CardTitle>
          <p className="text-sm text-muted-foreground">
            Godišnji, kvar kamiona… Kupci zatvoren dan ne mogu odabrati. Nedjelje i blagdani su
            zatvoreni sami od sebe.
          </p>
        </CardHeader>
        <CardContent>
          <ZatvoreniDani dani={zatvoreni} danas={danas} />
        </CardContent>
      </Card>
    </div>
  )
}

// Privremeni prikaz dok se postavke učitavaju.
function KosturPostavki() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="h-96 animate-pulse rounded-xl bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
      <span className="sr-only">Učitavanje…</span>
    </div>
  )
}
