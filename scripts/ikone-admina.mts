// Jednokratna skripta: izrađuje PNG ikone admin aplikacije (manifest, korak 1.12).
// Pokretanje: node scripts/ikone-admina.mts
// Crtež je isti kao ZnakLogotipa (src/components/logo.tsx): bijeli I-nosač na bakrenoj pločici.
// Paket sharp dolazi s Next.js-om, pa ga ne treba posebno instalirati.
import { mkdir } from 'node:fs/promises'
import sharp from 'sharp'

const BAKAR = '#b4531f'
const NOSAC = 'M7 7h18v4.5h-6.5v9H25V25H7v-4.5h6.5v-9H7z'
const MAPA = 'public/ikone'

// Obična ikona: zaobljena pločica na prozirnoj pozadini.
const obicna = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="${BAKAR}"/>
  <path d="${NOSAC}" fill="#fff"/>
</svg>`

// Maskable ikona: boja preko cijelog kvadrata, a nosač je manji i u sredini.
// Android ikonu sam izreže (krug, kvadrat…), pa sve važno mora biti u središnjih 80 %.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="${BAKAR}"/>
  <g transform="translate(16 16) scale(0.72) translate(-16 -16)">
    <path d="${NOSAC}" fill="#fff"/>
  </g>
</svg>`

async function spremi(svg: string, velicina: number, naziv: string) {
  await sharp(Buffer.from(svg), { density: (72 * velicina) / 32 })
    .resize(velicina, velicina)
    .png()
    .toFile(`${MAPA}/${naziv}`)
  console.log(`${MAPA}/${naziv}`)
}

await mkdir(MAPA, { recursive: true })
await spremi(obicna, 192, 'admin-192.png')
await spremi(obicna, 512, 'admin-512.png')
await spremi(maskable, 192, 'admin-maskable-192.png')
await spremi(maskable, 512, 'admin-maskable-512.png')
