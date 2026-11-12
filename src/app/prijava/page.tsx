import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Logo } from '@/components/logo'
import { createClient } from '@/lib/supabase/server'
import { FormaPrijave } from './forma-prijave'

export const metadata: Metadata = {
  title: 'Prijava',
  robots: { index: false, follow: false },
}

export default function StranicaPrijave({ searchParams }: PageProps<'/prijava'>) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <Logo className="mb-8" />
      <h1 className="mb-6">Prijava</h1>
      {/* Kolačići i parametri adrese čitaju se unutar <Suspense> (pravilo cacheComponents). */}
      <Suspense>
        <SadrzajPrijave searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function SadrzajPrijave({
  searchParams,
}: {
  searchParams: PageProps<'/prijava'>['searchParams']
}) {
  // Već prijavljeni korisnik nema što raditi ovdje.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/admin')

  const { sljedeca } = await searchParams

  return <FormaPrijave sljedeca={typeof sljedeca === 'string' ? sljedeca : '/admin'} />
}
