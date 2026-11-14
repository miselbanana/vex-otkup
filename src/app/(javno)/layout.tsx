import { Podnozje } from '@/components/javno/podnozje'
import { PristanakKolacica } from '@/components/javno/pristanak-kolacica'
import { SpremiIzvor } from '@/components/javno/spremi-izvor'
import { Zaglavlje } from '@/components/javno/zaglavlje'

// Okvir svih javnih stranica: zaglavlje, sadržaj, podnožje.
// Banner kolačića je samo ovdje (admin i /prijava ga nemaju).
export default function JavniLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SpremiIzvor />
      <PristanakKolacica />
      <Zaglavlje />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">{children}</main>
      <Podnozje />
    </>
  )
}
