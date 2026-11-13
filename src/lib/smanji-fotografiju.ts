import imageCompression from 'browser-image-compression'

// Smanjuje fotografiju u pregledniku prije slanja: najviše 1600 px po dužoj strani,
// oko 0,3 MB, uvijek JPEG. Slika se iznova iscrta, pa nestaju i skriveni podaci
// iz nje (GPS lokacija, model mobitela…).
// Koristi se samo u 'use client' komponentama.
export async function smanjiFotografiju(datoteka: File): Promise<Blob> {
  const smanjena = await imageCompression(datoteka, {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 1600,
    fileType: 'image/jpeg',
    initialQuality: 0.8,
    // Bez zasebne niti (web workera): paket bi inače svoj kod skinuo s vanjskog
    // CDN-a, a to ne želimo (privatnost kupca, ovisnost o tuđem serveru).
    useWebWorker: false,
  })

  // Sigurnosna mreža: u rubnim slučajevima paket vrati izvornu datoteku
  // (npr. kad je već mala). Ona može sadržavati GPS, pa je iscrtamo sami.
  if (smanjena === datoteka || smanjena.type !== 'image/jpeg') {
    return iscrtajKaoJpeg(smanjena)
  }
  return smanjena
}

async function iscrtajKaoJpeg(slika: Blob): Promise<Blob> {
  // imageOrientation: 'from-image' uspravi fotografiju prema zapisu iz mobitela.
  const bitmapa = await createImageBitmap(slika, { imageOrientation: 'from-image' })
  const omjer = Math.min(1, 1600 / Math.max(bitmapa.width, bitmapa.height))
  const platno = document.createElement('canvas')
  platno.width = Math.round(bitmapa.width * omjer)
  platno.height = Math.round(bitmapa.height * omjer)
  const ctx = platno.getContext('2d')
  if (!ctx) throw new Error('Platno nije dostupno')
  // Bijela pozadina, za slučaj prozirne slike (PNG), jer JPEG nema prozirnost.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, platno.width, platno.height)
  ctx.drawImage(bitmapa, 0, 0, platno.width, platno.height)
  bitmapa.close()

  return new Promise((resolve, reject) => {
    platno.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Pretvorba u JPEG nije uspjela'))),
      'image/jpeg',
      0.8,
    )
  })
}
