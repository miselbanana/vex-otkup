'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type StanjePrijave = { greska: string | null }

// Dopuštamo povratak samo na admin stranice, da nitko ne može podmetnuti vanjski link.
function sigurnaPutanja(vrijednost: FormDataEntryValue | null) {
  if (typeof vrijednost !== 'string') return '/admin'
  if (vrijednost === '/admin' || vrijednost.startsWith('/admin/')) return vrijednost
  return '/admin'
}

export async function prijava(
  _prethodno: StanjePrijave,
  formData: FormData,
): Promise<StanjePrijave> {
  const email = formData.get('email')
  const lozinka = formData.get('lozinka')

  if (typeof email !== 'string' || typeof lozinka !== 'string' || !email || !lozinka) {
    return { greska: 'Upiši email i lozinku.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: lozinka,
  })

  if (error) {
    return { greska: 'Pogrešan email ili lozinka.' }
  }

  redirect(sigurnaPutanja(formData.get('sljedeca')))
}

export async function odjava() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/prijava')
}
