import { Podnozje } from '@/components/javno/podnozje'
import { Zaglavlje } from '@/components/javno/zaglavlje'

// Okvir svih javnih stranica: zaglavlje, sadržaj, podnožje.
export default function JavniLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Zaglavlje />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">{children}</main>
      <Podnozje />
    </>
  )
}
