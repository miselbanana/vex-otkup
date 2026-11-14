'use client'

import { showPreferences } from 'vanilla-cookieconsent'

// Gumb u podnožju koji otvara prozor s postavkama kolačića.
export function GumbPostavkiKolacica() {
  return (
    <button
      type="button"
      onClick={() => showPreferences()}
      className="inline-flex min-h-12 items-center underline-offset-4 hover:text-primary hover:underline"
    >
      Postavke kolačića
    </button>
  )
}
