'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { TURNSTILE_AKCIJA } from '@/lib/validacija/narudzba'

// Cloudflare Turnstile: provjera da kupac nije robot. Obično se riješi sama,
// a ponekad kupac klikne kvačicu. Rezultat je token koji server provjerava kod
// Cloudflarea (src/lib/turnstile.ts). Token vrijedi jednom, pa se nakon neuspjelog
// slanja widget postavlja ispočetka promjenom `key` u roditelju.

type TurnstileApi = {
  render: (element: HTMLElement, opcije: Record<string, unknown>) => string
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SKRIPTA = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

export function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const kljuc = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const mjesto = useRef<HTMLDivElement>(null)
  const [spremno, setSpremno] = useState(false)

  // Zadnja verzija povratne funkcije, da njena promjena ne crta widget ponovno.
  const onTokenRef = useRef(onToken)
  useEffect(() => {
    onTokenRef.current = onToken
  })

  useEffect(() => {
    if (!spremno || !kljuc || !mjesto.current || !window.turnstile) return
    const id = window.turnstile.render(mjesto.current, {
      sitekey: kljuc,
      action: TURNSTILE_AKCIJA,
      language: 'hr',
      theme: 'light',
      size: 'flexible',
      callback: (token: string) => onTokenRef.current(token),
      'expired-callback': () => onTokenRef.current(null),
      'error-callback': () => onTokenRef.current(null),
    })
    return () => {
      window.turnstile?.remove(id)
      onTokenRef.current(null)
    }
  }, [spremno, kljuc])

  if (!kljuc) {
    // Događa se samo ako ključ nije upisan u .env.local ili Vercel.
    return (
      <p className="text-sm text-destructive">
        Zaštita od botova nije postavljena (nedostaje NEXT_PUBLIC_TURNSTILE_SITE_KEY).
      </p>
    )
  }

  return (
    <>
      {/* onReady se zove i kad je skripta već učitana (npr. kupac se vratio na ovaj korak). */}
      <Script src={SKRIPTA} strategy="afterInteractive" onReady={() => setSpremno(true)} />
      <div ref={mjesto} className="min-h-[65px]" />
    </>
  )
}
