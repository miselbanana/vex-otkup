'use client'

import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'

type Fotografija = { id: number; link: string }

// Sličice fotografija; dodir otvara fotografiju preko cijelog zaslona.
// Između fotografija se ide strelicama, povlačenjem prsta ili tipkama ← →.
// Linkovi su potpisani i vrijede sat vremena (bucket je privatan).
export function GalerijaFotografija({ fotografije }: { fotografije: Fotografija[] }) {
  // Indeks otvorene fotografije, ili null kad je galerija zatvorena.
  const [otvorena, setOtvorena] = useState<number | null>(null)
  const pocetakDodira = useRef<number | null>(null)

  const ukupno = fotografije.length
  const pomakni = (korak: number) =>
    setOtvorena((i) => (i === null ? null : (i + korak + ukupno) % ukupno))

  return (
    <>
      <ul className="grid grid-cols-3 gap-2" aria-label="Fotografije">
        {fotografije.map((f, i) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => setOtvorena(i)}
              className="block w-full cursor-pointer overflow-hidden rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label={`Otvori fotografiju ${i + 1} od ${ukupno}`}
            >
              {/* Obični <img>: potpisani link vrijedi sat vremena i ne ide kroz Next.js optimizaciju. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.link} alt="" loading="lazy" className="aspect-square w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={otvorena !== null} onOpenChange={(o) => !o && setOtvorena(null)}>
        <DialogContent
          showCloseButton={false}
          className="top-0 left-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-black p-0 text-white sm:max-w-none"
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') pomakni(-1)
            if (e.key === 'ArrowRight') pomakni(1)
          }}
        >
          <div className="flex items-center justify-between px-2 pt-[env(safe-area-inset-top)]">
            <DialogTitle className="px-2 text-base font-medium tabular-nums">
              Fotografija {(otvorena ?? 0) + 1} / {ukupno}
            </DialogTitle>
            <DialogClose
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/15 hover:text-white"
                />
              }
            >
              <XIcon />
              <span className="sr-only">Zatvori</span>
            </DialogClose>
          </div>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center"
            onTouchStart={(e) => {
              pocetakDodira.current = e.touches[0].clientX
            }}
            onTouchEnd={(e) => {
              if (pocetakDodira.current === null) return
              const pomak = e.changedTouches[0].clientX - pocetakDodira.current
              pocetakDodira.current = null
              if (Math.abs(pomak) > 50) pomakni(pomak < 0 ? 1 : -1)
            }}
          >
            {otvorena !== null && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fotografije[otvorena].link}
                alt={`Fotografija ${otvorena + 1} od ${ukupno}`}
                className="max-h-full max-w-full object-contain"
              />
            )}

            {ukupno > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Prethodna fotografija"
                  onClick={() => pomakni(-1)}
                  className="absolute left-2 bg-black/40 text-white hover:bg-black/60 hover:text-white"
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Sljedeća fotografija"
                  onClick={() => pomakni(1)}
                  className="absolute right-2 bg-black/40 text-white hover:bg-black/60 hover:text-white"
                >
                  <ChevronRight />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
