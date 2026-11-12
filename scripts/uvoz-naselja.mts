// Jednokratna skripta: priprema popis naselja RH za tablicu `naselja` (korak 0.5).
//
// Izvor: OpenStreetMap (Overpass API). Granice naselja, općina/gradova i županija
// u OSM-u uvezene su iz službenih podataka Državne geodetske uprave, a svako naselje
// ima službeni matični broj (oznaka `ref:hr:maticni_broj`).
//
// Kako se određuje kojoj općini i županiji naselje pripada:
//   OSM nema pouzdan popis "naselje → općina", pa skripta za svako naselje nađe
//   jednu točku koja sigurno leži unutar granice naselja i provjeri u kojem
//   poligonu općine i županije ta točka leži. Ta ista točka sprema se kao lat/lng.
//
// Skripta se NE spaja na bazu i ne treba nikakav tajni ključ. Rezultat zapisuje u
// `supabase/naselja.sql`, koji se zatim upisuje u bazu naredbom:
//   npx supabase db query --remote --file supabase/naselja.sql --yes
//
// Pokretanje (Node 26 sam izvršava TypeScript; nastavak .mts = ES modul):
//   node scripts/uvoz-naselja.mts            # koristi predmemoriju ako postoji
//   node scripts/uvoz-naselja.mts --osvjezi  # ponovno preuzima podatke s Overpassa

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const KORIJEN = join(import.meta.dirname, '..');
const PREDMEMORIJA = join(KORIJEN, 'scripts', '.cache');
const IZLAZ = join(KORIJEN, 'supabase', 'naselja.sql');
const SEED = join(KORIJEN, 'supabase', 'seed.sql');

const OVERPASS = 'https://overpass-api.de/api/interpreter';
// Područje Republike Hrvatske u Overpassu (3600000000 + id OSM relacije 214885)
const HR = 'area(id:3600214885)->.hr;';
// Grad Zagreb je istodobno grad i županija, pa u OSM-u nema razinu općine
const GRAD_ZAGREB = 'Grad Zagreb';

// ---------------------------------------------------------------------------
// Tipovi
// ---------------------------------------------------------------------------

type Tocka = { lat: number; lon: number };
type Clan = { type: 'node' | 'way' | 'relation'; ref: number; role: string; geometry?: Tocka[] };
type Relacija = { type: 'relation'; id: number; tags: Record<string, string>; members?: Clan[] };
type Odgovor = { elements: Relacija[] };

/** Dužina granice: [lon1, lat1, lon2, lat2] */
type Duzina = [number, number, number, number];
type Okvir = { minX: number; minY: number; maxX: number; maxY: number };
/** Područje = sve dužine granice (vanjske i unutarnje) + okvir za brzo odbacivanje */
type Podrucje = { id: number; naziv: string; duzine: Duzina[]; okvir: Okvir };

// ---------------------------------------------------------------------------
// Preuzimanje s ponavljanjem (javni server je često preopterećen)
// ---------------------------------------------------------------------------

const cekaj = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function overpass(naziv: string, upit: string, osvjezi: boolean): Promise<Odgovor> {
  const datoteka = join(PREDMEMORIJA, `${naziv}.json`);
  if (!osvjezi && existsSync(datoteka)) {
    console.log(`• ${naziv}: iz predmemorije`);
    return JSON.parse(readFileSync(datoteka, 'utf8')) as Odgovor;
  }

  let pauza = 5_000;
  for (let pokusaj = 1; pokusaj <= 12; pokusaj++) {
    console.log(`• ${naziv}: preuzimam (pokušaj ${pokusaj})…`);
    const odg = await fetch(OVERPASS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'vex-otkup-uvoz-naselja/1.0',
      },
      body: new URLSearchParams({ data: `[out:json][timeout:600][maxsize:1073741824];${HR}${upit}` }),
    });
    if (odg.ok) {
      const tekst = await odg.text();
      // JSON se provjeri prije spremanja, da u predmemoriju ne uđe poruka o grešci
      const podaci = JSON.parse(tekst) as Odgovor;
      mkdirSync(PREDMEMORIJA, { recursive: true });
      writeFileSync(datoteka, tekst);
      return podaci;
    }
    // 429/502/503/504 = server je zauzet, pokušaj ponovno kasnije
    if (![429, 502, 503, 504].includes(odg.status)) {
      throw new Error(`Overpass je vratio ${odg.status}: ${await odg.text()}`);
    }
    console.log(`  server zauzet (${odg.status}), čekam ${pauza / 1000} s`);
    await cekaj(pauza);
    pauza = Math.min(pauza * 2, 120_000);
  }
  throw new Error(`Overpass nije odgovorio nakon 12 pokušaja (${naziv}).`);
}

// ---------------------------------------------------------------------------
// Geometrija
// ---------------------------------------------------------------------------

function podrucje(r: Relacija): Podrucje {
  const duzine: Duzina[] = [];
  const okvir: Okvir = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const c of r.members ?? []) {
    // granicu čine samo putevi (ways) s ulogom outer/inner; podrelacije i točke se preskaču
    if (c.type !== 'way' || !c.geometry || !['outer', 'inner', ''].includes(c.role)) continue;
    for (let i = 1; i < c.geometry.length; i++) {
      const a = c.geometry[i - 1];
      const b = c.geometry[i];
      duzine.push([a.lon, a.lat, b.lon, b.lat]);
      okvir.minX = Math.min(okvir.minX, a.lon, b.lon);
      okvir.maxX = Math.max(okvir.maxX, a.lon, b.lon);
      okvir.minY = Math.min(okvir.minY, a.lat, b.lat);
      okvir.maxY = Math.max(okvir.maxY, a.lat, b.lat);
    }
  }
  return { id: r.id, naziv: r.tags.name, duzine, okvir };
}

/**
 * Leži li točka unutar područja? Pravilo parnosti: zraka od točke prema istoku
 * siječe granicu neparan broj puta ako je točka unutra. Radi i s rupama (inner)
 * i s više dijelova (otoci), bez slaganja puteva u prstenove.
 */
function sadrzi(p: Podrucje, x: number, y: number): boolean {
  const o = p.okvir;
  if (x < o.minX || x > o.maxX || y < o.minY || y > o.maxY) return false;
  let unutra = false;
  for (const [x1, y1, x2, y2] of p.duzine) {
    if (y1 > y !== y2 > y && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) unutra = !unutra;
  }
  return unutra;
}

/**
 * Točka koja sigurno leži unutar područja naselja: na nekoliko vodoravnih
 * linija kroz okvir nađe najduži komad koji je unutar granice i uzme njegovu sredinu.
 */
function unutarnjaTocka(p: Podrucje): { x: number; y: number } | null {
  const o = p.okvir;
  let najbolja: { x: number; y: number; sirina: number } | null = null;
  for (const udio of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9]) {
    const y = o.minY + (o.maxY - o.minY) * udio;
    const presjeci: number[] = [];
    for (const [x1, y1, x2, y2] of p.duzine) {
      if (y1 > y !== y2 > y) presjeci.push(((x2 - x1) * (y - y1)) / (y2 - y1) + x1);
    }
    presjeci.sort((a, b) => a - b);
    for (let i = 0; i + 1 < presjeci.length; i += 2) {
      const sirina = presjeci[i + 1] - presjeci[i];
      if (!najbolja || sirina > najbolja.sirina) {
        najbolja = { x: (presjeci[i] + presjeci[i + 1]) / 2, y, sirina };
      }
    }
    // središnje linije su najbolje za prikaz na karti; dalje se traži samo ako je komad uzak
    if (najbolja && najbolja.sirina > (o.maxX - o.minX) * 0.3) break;
  }
  return najbolja;
}

// ---------------------------------------------------------------------------
// Pomoćne funkcije
// ---------------------------------------------------------------------------

function greska(poruka: string): never {
  console.error(`\n✖ ${poruka}`);
  process.exit(1);
}

/** Navodnici za SQL tekst: ' → '' */
const sql = (t: string) => `'${t.replaceAll("'", "''")}'`;

/** Nazivi županija iz seed.sql (izvor istine za tablicu `zupanije`). */
function zupanijeIzSeeda(): Set<string> {
  const tekst = readFileSync(SEED, 'utf8');
  const blok = tekst.match(/insert into public\.zupanije[\s\S]*?on conflict/);
  if (!blok) greska('U seed.sql nema bloka "insert into public.zupanije".');
  return new Set([...blok[0].matchAll(/\('([^']+)',\s*(?:true|false)\)/g)].map((m) => m[1]));
}

// ---------------------------------------------------------------------------
// 1) Preuzimanje
// ---------------------------------------------------------------------------

const osvjezi = process.argv.includes('--osvjezi');

const granice = await overpass(
  'zupanije-opcine-geom',
  'rel(area.hr)[boundary=administrative][admin_level~"^(4|7)$"];out geom;',
  osvjezi,
);
const nas = await overpass(
  'naselja-geom',
  'rel(area.hr)[boundary=administrative][admin_level=8]["ref:hr:maticni_broj"];out geom;',
  osvjezi,
);

// samo hrvatske županije (oznaka HR-xx); susjedne države se odbacuju
const zupanije = granice.elements
  .filter((e) => e.tags.admin_level === '4' && e.tags['ISO3166-2']?.startsWith('HR-'))
  .map(podrucje);
const opcine = granice.elements.filter((e) => e.tags.admin_level === '7').map(podrucje);

console.log(
  `\nOSM: ${zupanije.length} županija, ${opcine.length} općina/gradova, ${nas.elements.length} naselja`,
);
if (zupanije.length !== 21) greska(`Očekivana je 21 županija, a pronađeno ih je ${zupanije.length}.`);

const uSeedu = zupanijeIzSeeda();
for (const z of zupanije) {
  if (!uSeedu.has(z.naziv)) greska(`Županija "${z.naziv}" iz OSM-a ne postoji u seed.sql.`);
}

// ---------------------------------------------------------------------------
// 2) Pridruživanje općine i županije
// ---------------------------------------------------------------------------

type Naselje = {
  maticni: number;
  naziv: string;
  opcina: string;
  zupanija: string;
  lat: number;
  lng: number;
};

const rezultat: Naselje[] = [];
const problemi: string[] = [];

for (const r of nas.elements) {
  const p = podrucje(r);
  const t = unutarnjaTocka(p);
  if (!t) {
    problemi.push(`${r.tags.name} (${r.id}): nema geometriju`);
    continue;
  }

  const zup = zupanije.filter((z) => sadrzi(z, t.x, t.y));
  // naselje izvan Hrvatske (npr. granična relacija susjedne države) se preskače
  if (zup.length === 0) continue;
  if (zup.length > 1) {
    problemi.push(`${r.tags.name}: u više županija (${zup.map((z) => z.naziv).join(', ')})`);
    continue;
  }

  const opc = opcine.filter((o) => sadrzi(o, t.x, t.y));
  let opcina: string;
  if (opc.length === 1) opcina = opc[0].naziv;
  else if (opc.length === 0 && zup[0].naziv === GRAD_ZAGREB) opcina = GRAD_ZAGREB;
  else {
    problemi.push(
      `${r.tags.name} (${zup[0].naziv}): općina nije jednoznačna (${opc.map((o) => o.naziv).join(', ') || 'nijedna'})`,
    );
    continue;
  }

  const maticni = Number(r.tags['ref:hr:maticni_broj']);
  if (!Number.isInteger(maticni)) {
    problemi.push(`${r.tags.name}: neispravan matični broj "${r.tags['ref:hr:maticni_broj']}"`);
    continue;
  }

  rezultat.push({
    maticni,
    // dvojezični nazivi (npr. "Buje / Buie") zadržavaju se cijeli
    naziv: r.tags.name.trim(),
    opcina,
    zupanija: zup[0].naziv,
    lat: Number(t.y.toFixed(6)),
    lng: Number(t.x.toFixed(6)),
  });
}

// ---------------------------------------------------------------------------
// 3) Provjere
// ---------------------------------------------------------------------------

if (problemi.length > 0) {
  greska(`Neka naselja nije moguće pridružiti (${problemi.length}):\n  ${problemi.join('\n  ')}`);
}

const vidjeni = new Set<number>();
for (const n of rezultat) {
  if (vidjeni.has(n.maticni)) greska(`Matični broj ${n.maticni} (${n.naziv}) se ponavlja.`);
  vidjeni.add(n.maticni);
}

// isto naselje u istoj općini dvaput bi zbunilo kupca u padajućem popisu
// (županija je dio ključa jer postoje istoimene općine, npr. dvije Općine Privlaka)
const kljucevi = new Map<string, number>();
for (const n of rezultat) {
  const k = `${n.naziv}|${n.opcina}|${n.zupanija}`;
  kljucevi.set(k, (kljucevi.get(k) ?? 0) + 1);
}
const dvostruka = [...kljucevi].filter(([, broj]) => broj > 1).map(([k]) => k);
if (dvostruka.length > 0) console.warn(`\n⚠ Isto ime u istoj općini: ${dvostruka.join('; ')}`);

const poZupaniji = new Map<string, number>();
for (const n of rezultat) poZupaniji.set(n.zupanija, (poZupaniji.get(n.zupanija) ?? 0) + 1);
console.log('\nNaselja po županiji:');
for (const [z, broj] of [...poZupaniji].sort((a, b) => a[0].localeCompare(b[0], 'hr'))) {
  console.log(`  ${String(broj).padStart(4)}  ${z}`);
}
console.log(`  ${String(rezultat.length).padStart(4)}  UKUPNO`);

// ---------------------------------------------------------------------------
// 4) Zapis SQL datoteke
// ---------------------------------------------------------------------------

rezultat.sort((a, b) => a.maticni - b.maticni);

const redovi = rezultat.map(
  (n) => `  (${n.maticni}, ${sql(n.naziv)}, ${sql(n.opcina)}, ${sql(n.zupanija)}, ${n.lat}, ${n.lng})`,
);

// upis u dijelovima od 1000 redaka, da nijedan upit ne bude prevelik
const dijelovi: string[] = [];
for (let i = 0; i < redovi.length; i += 1000) {
  dijelovi.push(`insert into public.naselja (maticni_broj, naziv, opcina, zupanija_id, lat, lng)
select v.maticni_broj, v.naziv, v.opcina, z.id, v.lat, v.lng
from (values
${redovi.slice(i, i + 1000).join(',\n')}
) as v(maticni_broj, naziv, opcina, zupanija, lat, lng)
join public.zupanije z on z.naziv = v.zupanija
on conflict (maticni_broj) do update set
  naziv = excluded.naziv,
  opcina = excluded.opcina,
  zupanija_id = excluded.zupanija_id,
  lat = excluded.lat,
  lng = excluded.lng;`);
}

writeFileSync(
  IZLAZ,
  `-- Naselja Republike Hrvatske (korak 0.5).
-- DATOTEKU JE GENERIRALA SKRIPTA scripts/uvoz-naselja.mts — ne uređivati ručno.
-- Izvor: © OpenStreetMap suradnici (ODbL), granice prema podacima Državne geodetske uprave.
-- Preduvjet: županije iz seed.sql su već upisane.
-- Datoteka se smije pokrenuti više puta (ključ je matični broj naselja).
-- Pokretanje na povezanoj bazi:
--   npx supabase db query --remote --file supabase/naselja.sql --yes

begin;

${dijelovi.join('\n\n')}

commit;
`,
);

console.log(`\n✔ Zapisano ${rezultat.length} naselja u supabase/naselja.sql`);
