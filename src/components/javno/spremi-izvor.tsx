'use client'

import { useEffect } from 'react'

// Ključ u sessionStorageu. Čita ga slanje narudžbe (korak 1.6).
export const KLJUC_IZVORA = 'izvor'

const PARAMETRI = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
] as const

// Pri prvom dolasku na sajt sprema odakle je kupac došao (UTM oznake oglasa i fbclid).
// Te oznake postoje samo na stranici na koju je kupac stigao s oglasa, pa se bez
// ovoga izgube do /naruci. Ništa ne prikazuje.
export function SpremiIzvor() {
  useEffect(() => {
    // sessionStorage može biti nedostupan (privatni način, blokirani podaci).
    try {
      // Pamti se samo prvi izvor u posjetu.
      if (sessionStorage.getItem(KLJUC_IZVORA)) return
      const url = new URLSearchParams(window.location.search)
      const izvor: Partial<Record<(typeof PARAMETRI)[number], string>> = {}
      for (const p of PARAMETRI) {
        const v = url.get(p)
        if (v) izvor[p] = v.slice(0, 500)
      }
      if (Object.keys(izvor).length > 0) {
        sessionStorage.setItem(KLJUC_IZVORA, JSON.stringify(izvor))
      }
    } catch {
      // Bez izvora narudžba svejedno radi.
    }
  }, [])

  return null
}
