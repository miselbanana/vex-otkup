import type { Metadata } from 'next'
import { Barlow_Semi_Condensed, Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { NAZIV, OPIS } from '@/lib/kontakt'
import './globals.css'

// 'latin-ext' je obavezan: bez njega se č, ć, đ, š i ž prikazuju drugim fontom.
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'latin-ext'],
})

const barlow = Barlow_Semi_Condensed({
  variable: '--font-barlow',
  subsets: ['latin', 'latin-ext'],
  weight: ['600', '700'],
})

// Puna adresa sajta, potrebna za linkove u metapodacima (npr. slika za dijeljenje linka).
// Redom: vlastita domena iz varijable, zatim produkcijska adresa na Vercelu, zatim lokalni razvoj.
function adresaSajta() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  return 'http://localhost:3000'
}

export const metadata: Metadata = {
  metadataBase: new URL(adresaSajta()),
  title: {
    default: `${NAZIV} — ${OPIS.toLowerCase()}`,
    template: `%s | ${NAZIV}`,
  },
  description: 'Otkup bakra, čelika, aluminija, mesinga i drugih sirovina. Dolazimo po materijal.',
  // Zajednička polja za dijeljenje linka. Stranice NE postavljaju svoj `openGraph`,
  // jer bi time izbrisale ova polja i sliku iz opengraph-image.tsx.
  openGraph: {
    type: 'website',
    locale: 'hr_HR',
    siteName: NAZIV,
  },
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="hr" className={`${inter.variable} ${barlow.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
