import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { NAZIV, OPIS, PODRUCJE } from '@/lib/kontakt'

// Slika koja se prikazuje kad se link na sajt podijeli (Facebook, WhatsApp, Viber…).
// Generira se jednom, pri buildu. Vrijedi za sve stranice koje nemaju svoju.

export const alt = `${NAZIV} — otkup bakra, čelika i aluminija`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Boje iz dizajn sistema (plan, sekcija Dizajn sistem).
const BAKAR = '#B4531F'
const GRAFIT = '#1C1917'
const SIVI_TEKST = '#57534E'
const POZADINA = '#FAFAF9'

// Vlastiti font, jer zadani font slike nema sigurno sva hrvatska slova (č, ć, đ, š, ž).
const barlow = readFile(join(process.cwd(), 'src/assets/fonte/BarlowSemiCondensed-Bold.ttf'))

export default async function Slika() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background: POZADINA,
          borderBottom: `24px solid ${BAKAR}`,
          fontFamily: 'Barlow',
        }}
      >
        {/* Logotip: I-nosač na bakrenoj pločici + naziv (isti znak kao u src/components/logo.tsx). */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <svg width="112" height="112" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="7" fill={BAKAR} />
            <path d="M7 7h18v4.5h-6.5v9H25V25H7v-4.5h6.5v-9H7z" fill="#fff" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 84, lineHeight: 1, color: GRAFIT }}>{NAZIV}</span>
            <span style={{ fontSize: 30, color: SIVI_TEKST, textTransform: 'uppercase', letterSpacing: 2 }}>
              {OPIS}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span style={{ fontSize: 88, lineHeight: 1.05, color: GRAFIT }}>
            Otkup bakra, čelika i aluminija
          </span>
          <span style={{ fontSize: 44, color: BAKAR }}>
            {PODRUCJE} · Dolazimo po materijal
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Barlow', data: await barlow, style: 'normal', weight: 700 }],
    },
  )
}
