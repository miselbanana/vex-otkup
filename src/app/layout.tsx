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

export const metadata: Metadata = {
  title: {
    default: `${NAZIV} — ${OPIS.toLowerCase()}`,
    template: `%s | ${NAZIV}`,
  },
  description: 'Otkup bakra, čelika, aluminija, mesinga i drugih sirovina. Dolazimo po materijal.',
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
