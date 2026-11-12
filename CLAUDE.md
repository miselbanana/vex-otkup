# CLAUDE.md — Servis za narudžbu otkupa sekundarnih sirovina

## Projekt

Web servis za klijenta **Vedrana**, registriranog otkupljivača sekundarnih sirovina (bakar, čelik, aluminij, mesing…). Pokriva područje od Rijeke do većeg dijela Slavonije.

- **Javni sajt:** cjenik, kalkulator i narudžba odvoza u 4 koraka s obaveznom fotografijom.
- **Admin:** samo za Mišela i Vedrana, instalira se na Android kao web aplikacija. Sadrži narudžbe, statuse, realizaciju sa stvarnim vrijednostima, cjenik i analitiku.
- Kupci dolaze preko Meta oglasa, a kasnije i preko Google pretrage.

**Cijeli plan:** `docs/plan-implementacije.md`. To je izvor istine za korake, rute, dizajn i zamke.
- Prije rada na koraku pročitaj **samo sekciju tog koraka** u planu.
- Ne učitavaj cijeli plan bez potrebe.

## Način rada s Mišelom

- **Uvijek odgovaraj na hrvatskom.** Objašnjavaj jednostavno i bez žargona. Ako stručni pojam ne možeš izbjeći, objasni ga u jednoj rečenici.
- Mišel je **početnik**. Radimo **jedan korak plana po sesiji** (npr. 1.4), osim ako izričito ne kaže drukčije.
- **Ne preskači korake i ne radi unaprijed.** Ne gradi ništa iz kasnijih koraka "jer će trebati".
- Na početku sesije:
  1. Pogledaj sekciju *Status* niže i reci koji je sljedeći korak.
  2. U 3–5 točaka objasni što ćeš napraviti.
  3. Tek onda kreni s kodom.
- Ako je zadatak u suprotnosti s planom ili s pravilima ispod, **reci to i predloži alternativu** prije nego što išta promijeniš.
- Nove npm pakete izvan dogovorenog stacka **ne instaliraj bez pitanja**.
- Kad Mišel mora nešto napraviti ručno (račun, DNS zapis, klik u Supabase ili Vercel sučelju), daj mu numerirane korake i pričekaj da potvrdi.
- Na kraju koraka:
  1. Provjeri sve stavke iz *Rezultata* tog koraka u planu.
  2. Pokreni `npm run lint` i `npm run build`.
  3. Ažuriraj *Status* u ovoj datoteci.
  4. Predloži commit poruku.

## Stack (fiksno, ne mijenjati bez dogovora)

- **Framework:** Next.js 16 (App Router) + TypeScript, mapa `src/`.
  - Zaštita ruta je u `src/proxy.ts` (u Next.js 16 zamjenjuje `middleware.ts`).
  - Prije pisanja Next.js koda pročitaj `AGENTS.md`. On upućuje na dokumentaciju točno instalirane verzije u `node_modules/next/dist/docs/`.
- **Baza i pozadina:** Supabase, regija Frankfurt:
  - PostgreSQL i Auth
  - Storage, bucket `fotografije` (privatan)
  - paket `@supabase/ssr`
- **Izgled:** Tailwind CSS 4 + shadcn/ui + lucide-react.
- **Forme:** React Hook Form + Zod.
- **Grafikoni:** Recharts.
- **Karta:** react-leaflet + OpenStreetMap.
- **Email:** Resend + React Email.
- **Zaštita od botova:** Cloudflare Turnstile.
- **Kolačići:** vanilla-cookieconsent.
- **Mjerenje oglasa:** Meta Pixel + Conversions API.
- **Datumi:** date-fns + @date-fns/tz, zona `Europe/Zagreb`.
- **Fotografije:** browser-image-compression.
- **Hosting:** Vercel. Greške: Sentry (EU regija, Faza 2).
- **PWA:** samo `public/admin.webmanifest` i (u Fazi 2) ručni `public/sw.js` za push.
  - **Bez** Serwista i next-pwa.
  - **Bez** WordPressa i WooCommercea.

## Naredbe

```bash
npm run dev                              # lokalni razvoj (localhost:3000)
npm run build                            # provjera builda prije commita
npm run lint
npx supabase migration new <naziv>       # nova migracija u supabase/migrations/
npx supabase db push --remote            # primijeni migracije na povezani projekt (bez --remote CLI traži lokalni Docker)
npx supabase migration list --remote     # usporedi lokalne i primijenjene migracije
npx supabase gen types typescript --remote > src/lib/supabase/tipovi.ts   # pokreni u Bashu, ne u PowerShellu (kodiranje)
npx supabase db query --remote --file supabase/seed.sql --yes            # upiši početne podatke (županije, cjenik)
node scripts/uvoz-naselja.mts                                             # ponovno generiraj supabase/naselja.sql iz OSM-a
npx supabase db query --remote --file supabase/naselja.sql --yes         # upiši naselja (nakon seed.sql)
npx supabase db advisors --remote                                         # sigurnosna provjera baze
```

## Struktura

```
src/app/(javno)/            javne stranice (/, /cjenik, /naruci, /politika-privatnosti)
src/app/(admin)/admin/      admin (narudzbe, cjenik, analitika, postavke)
src/app/prijava/            prijava
src/app/api/                route handleri (naselja, narudzbe, upload, izvoz, cron)
src/components/ui/          shadcn
src/components/javno/       komponente javnog sajta (narudzba/ = koraci forme)
src/components/admin/       komponente admina
src/lib/supabase/           server.ts, client.ts, admin.ts (service role), tipovi.ts
src/lib/validacija/         Zod sheme (dijele ih preglednik i server)
src/lib/izracun.ts          izračun procjene
src/lib/format.ts           formatEur, parseBroj, normalizacija mobitela
src/emails/                 React Email predlošci
supabase/migrations/        SVE promjene baze
supabase/seed.sql           materijali, klase, cijene
scripts/                    jednokratne skripte (uvoz naselja)
docs/plan-implementacije.md plan
```

## Pravila domene

**Statusi narudžbe:**
- `nova` → `potvrdjena` (Vedran nazvao i dogovorio termin) → `realizirana` (izvagano, isplaćeno, upisane stvarne vrijednosti).
- `nova` ili `potvrdjena` → `otkazana`, uvijek s razlogom. Mogući razlozi:
  - lažna narudžba
  - kupac odustao
  - ne javlja se
  - premala količina
  - izvan područja
  - ostalo

**Ostala pravila:**
- **Jedna narudžba može imati više stavki** (materijal + klasa + kg). Svaka stavka ima prijavljene i stvarne vrijednosti.
- **Cijena po kg je fiksna, ukupni iznos je procjena.** Konačni iznos određuje vaganje.
  - U stavku se uvijek sprema `cijena_kg_prijavljena` iz trenutka narudžbe.
  - Pri realizaciji je zadana **današnja** cijena iz cjenika, a Vedran je može ručno promijeniti.
- **Procjene i stvarne vrijednosti nikad se ne zbrajaju zajedno.** Stvarne postoje samo za realizirane narudžbe.
- **Narudžba je dopuštena samo iz pokrivenih županija** (`zupanije.pokrivena`). Ostali kupci vide Vedranov telefon.
- **Lokacija je naselje s popisa iz baze** (+ ulica, + opcionalni GPS). Nikad slobodan tekst za mjesto.
- **Osobni podaci kupca:** samo ime i prezime, mobitel, lokacija i fotografije.
  - Nema korisničkih računa za kupce.
  - Nema online plaćanja (isplata je gotovinom na licu mjesta).
  - Nema funkcija za proviziju.
- **Rok čuvanja je 24 mjeseca.** Nakon toga se narudžba **anonimizira**: brišu se ime, mobitel, ulica, GPS i fotografije. Naselje, materijali i iznosi ostaju za analitiku.
- **Admin koriste samo dva korisnika.** Registracija je isključena u Supabaseu.

## Pravila koda

**Jezik i imenovanje**
- Kod, tablice, stupci, funkcije i rute pišu se na hrvatskom **bez dijakritika** (`narudzbe`, `kreiraj_narudzbu`, `/naruci`).
- Tekst koji korisnik vidi piše se na hrvatskom **s dijakriticima**.
- Komentari su na hrvatskom.

**Sigurnost**
- `SUPABASE_SERVICE_ROLE_KEY` koristi se samo u `src/lib/supabase/admin.ts`, uz `import 'server-only'`. Nikad s prefiksom `NEXT_PUBLIC_`.
- RLS je uključen na **svakoj** tablici. Prijavljeni korisnici smiju sve, anonimni ništa. Javni upis narudžbe ide isključivo preko servera.
- Na serveru se koristi `supabase.auth.getUser()`, nikad `getSession()`.
- **Svaka** serverska akcija i admin API ruta ponovno provjerava korisnika. Provjera u `proxy.ts` nije dovoljna.
- Pogledi (views) imaju `security_invoker = true`.
- Cron rute provjeravaju `CRON_SECRET`.

**Baza**
- Promjene sheme idu **isključivo kroz migracije**, nikad klikanjem u Supabase sučelju. Nakon svake migracije regeneriraj `tipovi.ts`.
- Novac je `numeric(10,2)`, nikad `float`. Iznos se zaokružuje na 2 decimale tek na kraju izračuna.
- Dan je tip `date` (npr. `zeljeni_datum`), a trenutak `timestamptz`. Prikaz je uvijek u zoni `Europe/Zagreb`.
- Narudžba, stavke i fotografije upisuju se **u jednoj transakciji** kroz Postgres funkciju `kreiraj_narudzbu` (RPC).

**Forme i unos**
- Brojevi se unose kroz `type="text" inputMode="decimal"` i `parseBroj()`, koji prihvaća decimalni zarez.
- Mobitel se uvijek sprema u obliku `+3859…`, preko normalizacije iz `format.ts`.
- Server **nikad ne vjeruje** iznosu iz preglednika i sam ponovno računa procjenu.
- Dvostruko slanje sprječavaju dvije stvari:
  - `id` narudžbe iz koraka uploada je jedinstveni ključ
  - gumb je onemogućen dok slanje traje

**Fotografije**
- Prije uploada se smanjuju u pregledniku (najviše 1600 px, oko 0,3 MB, JPEG). Time se brišu i GPS podaci.
- Upload ide **izravno u Supabase Storage** potpisanim linkom, nikad kroz Next.js server.
- U adminu se prikazuju preko potpisanih linkova (`createSignedUrls`).

**Keširanje**
- Nakon promjene cjenika pozovi `revalidatePath('/cjenik')` i `revalidatePath('/')`.
- Admin popisi uvijek prikazuju svježe podatke.

**Email**
- Ako slanje emaila ne uspije, narudžba se **ipak sprema**. Koristi `try/catch` i zapiši grešku u log.
- Broj mobitela kupca ne stavljaj u naslov emaila.

**Meta**
- Pixel se učitava **tek nakon pristanka** na kategoriju Marketing.
- CAPI se šalje samo ako je kupac pristao.
- Pixel i CAPI koriste isti `event_id` (= id narudžbe).
- Mobitel se prije hashiranja normalizira u oblik `3859…`.

**Izgled**
- Mobitel je prvi. Dodirne površine u adminu su najmanje 48 px.
- Fontovi (Barlow Semi Condensed za naslove, Inter za tekst) učitavaju se sa `subsets: ['latin', 'latin-ext']`.
- Boje i ostala pravila dizajna su u planu, sekcija *Dizajn sistem*.

**Ostalo**
- Recharts je samo u `'use client'` komponentama.
- Leaflet se učitava s `dynamic(..., { ssr: false })`.
- CSV izvoz koristi razdjelnik `;` i UTF-8 s BOM-om.

## Varijable okruženja

`.env.local` se nikad ne commita.

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
OBAVIJEST_EMAILOVI              # Vedran, Mišel (zarezom odvojeno)
NEXT_PUBLIC_TURNSTILE_SITE_KEY
TURNSTILE_SECRET_KEY
NEXT_PUBLIC_META_PIXEL_ID
META_CAPI_TOKEN
NEXT_PUBLIC_SITE_URL
CRON_SECRET                     # Faza 2
VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY   # Faza 2
```

Promjena varijable u Vercelu vrijedi tek nakon novog deploya.

## Status

Ažuriraj nakon svakog završenog koraka: `[x]` = gotovo, `[~]` = u tijeku. Zapiši i kratku bilješku ako je nešto odstupilo od plana.

**Faza 0 — Postavka**
- [x] 0.1 Računi i radno okruženje
- [x] 0.2 Kostur projekta
- [x] 0.3 Supabase projekt i migracije
- [x] 0.4 Shema baze
- [~] 0.5 Početni podaci (materijali, klase, cijene, naselja)
- [x] 0.6 Prijava i zaštita admina
- [ ] 0.7 Dizajn sistem i okviri stranica
- [ ] 0.8 Objava na Vercelu

**Faza 1 — MVP**
- [ ] 1.1 Javni cjenik i kalkulator
- [ ] 1.2 Početna stranica
- [ ] 1.3 Narudžba — okvir i materijali
- [ ] 1.4 Narudžba — fotografije
- [ ] 1.5 Narudžba — lokacija i termin
- [ ] 1.6 Narudžba — kontakt i slanje
- [ ] 1.7 Email obavijest Vedranu
- [ ] 1.8 Admin — popis narudžbi
- [ ] 1.9 Admin — detalji narudžbe i statusi
- [ ] 1.10 Admin — realizacija narudžbe
- [ ] 1.11 Admin — uređivanje cjenika
- [ ] 1.12 Instalacija admina na mobitel
- [ ] 1.13 Politika privatnosti i kolačići
- [ ] 1.14 Meta Pixel i Conversions API
- [ ] 1.15 Testiranje i puštanje uživo

**Faza 2 — Proširenja**
- [ ] 2.1 Analitika — izračuni u bazi
- [ ] 2.2 Analitika — nadzorna ploča
- [ ] 2.3 Analitika — karta
- [ ] 2.4 Izvoz u CSV
- [ ] 2.5 Push obavijesti
- [ ] 2.6 SEO stranice za Google
- [ ] 2.7 Praćenje grešaka
- [ ] 2.8 Održavanje podataka

**Bilješke / odstupanja od plana:**
- 0.1: Node.js v26 LTS (instaliran u sesiji 0.2) i Git rade. Svi računi (Supabase, Vercel, Resend, Cloudflare, Meta) su otvoreni.
- 0.2: projekt je u `C:\Projekti\vex-otkup` (izvan OneDrivea, jer OneDrive zaključava `node_modules` i `.next`). Mapa se zove `vex-otkup` umjesto `otkup`.
- 0.2: plan je premješten u `docs/plan-implementacije.md`.
- 0.2: create-next-app je dodao `AGENTS.md` (upućuje na dokumentaciju instalirane verzije Next.js), zadržan je.
- 0.2: shadcn 4.x koristi predložak `base-nova` (komponente na Base UI umjesto Radixa) i paket `cn` umjesto `clsx` + `tailwind-merge`.
- 0.2: GitHub repozitorij je privatni `miselbanana/vex-otkup`, grana `main`.
- 0.3: Supabase projekt `otkup-dev` (ref `zohzhxerpuxvlnavdruh`, Frankfurt) je povezan.
- 0.3: Supabase CLI 3.x je instaliran kao npm razvojni paket (`npx supabase`), a ne preko Scoopa. Naredbe za bazu trebaju `--remote`, jer CLI inače traži lokalnu bazu u Dockeru, koji ne koristimo. `supabase link` nije tražio lozinku baze, jer koristi prijavu iz `supabase login`.
- 0.3: u `.env.local` su novi ključevi (publishable / secret), ali pod starim nazivima varijabli `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`.
- 0.3: paket `server-only` nije instaliran, jer ga Next.js 16 podržava sam.
- 0.3: terminal koji je otvoren prije instalacije Node.js-a ne vidi `npm`. Rješenje je ponovno pokrenuti VS Code.
- 0.4: migracija se zove `20261112160651_shema.sql` (CLI imenuje po vremenu), a ne `0001_shema.sql`.
- 0.4: dodan enum `razlog_otkaza` (razlozi iz pravila domene) i provjera da otkazana narudžba uvijek ima razlog.
- 0.4: `broj` narudžbe (`2026-0001`) dodjeljuje okidač `dodijeli_broj_narudzbe` preko pomoćne tablice `brojaci_narudzbi`. Brojanje kreće ispočetka svake godine (zona Europe/Zagreb).
- 0.4: `ime_prezime`, `mobitel` i `ulica` su `not null`. Za anonimizaciju u 2.8 trebat će nova migracija.
- 0.4: tipovi se generiraju s `--remote` (`--linked` je zastario u CLI 3.x), u Bashu.
- 0.5 (djelomično, na Mišelov zahtjev): u `seed.sql` je **PRIVREMENI** cjenik (9 materijala, 17 klasa, procijenjene cijene). Upisan je u bazu. Zamijeniti Vedranovim cijenama i opisima. **Županije i naselja su gotovi, 0.5 ostaje `[~]` samo zbog cjenika.**
- 0.5: županije (21) su u `seed.sql`. 15 je pokriveno: Rijeka–Slavonija + Varaždinska, Krapinsko-zagorska i Međimurska. Nepokrivene su Istarska, Ličko-senjska i 4 dalmatinske.
- 0.5: naselja nisu iz DZS tablice. Izvor je OpenStreetMap (Overpass), čije su granice preuzete od DGU. Wikidata je odbačena jer joj nedostaju naselja u Slavoniji.
  - Općinu i županiju skripta određuje točkom unutar granice naselja, jer OSM nema potpun popis „naselje → općina”. Ta ista točka spremljena je kao `lat`/`lng`.
  - Upisano je 6.754 naselja, a službeni broj je 6.757. Grad Zagreb ima 68 naselja umjesto 70, jer OSM-u nedostaju 2 naselja.
  - `postanski_broj` je prazan, jer ga OSM nema.
  - Općina je zapisana s prefiksom („Grad Vukovar”, „Općina Tovarnik”). Za naselja Grada Zagreba općina je „Grad Zagreb”.
- 0.5: nova migracija `naselja_maticni_broj` dodaje stupac `maticni_broj` (unique). On je ključ za ponovljivi uvoz.
- 0.5: skripta je `scripts/uvoz-naselja.mts`, a ne `.ts`. Nastavak `.mts` znači ES modul, pa Node ne ispisuje upozorenje.
  - Pokreće se s `node scripts/uvoz-naselja.mts`. Ne treba novi paket ni tajni ključ.
  - Zapisuje `supabase/naselja.sql`, koji se upisuje s `npx supabase db query --remote --file supabase/naselja.sql --yes`, i to **nakon** `seed.sql`.
  - Sirovi podaci (~150 MB) su u `scripts/.cache/`, koji je u `.gitignore`.
- 0.6: registracija je isključena u Supabaseu. Za sada postoji samo Mišelov korisnik. **Vedranov korisnik se dodaje kasnije** (Authentication → Users → Add user, uključi Auto Confirm User). Mora postojati prije puštanja uživo (1.15).
- 0.6: `proxy.ts` radi samo na `/admin/:path*`, jer javni sajt ne treba prijavu. Admin API rute (npr. `/api/izvoz`) treba dodati u `matcher` kad nastanu.
- 0.6: projekt ima uključen `cacheComponents`. Kolačići (prijava) smiju se čitati samo unutar `<Suspense>`, a `export const dynamic` nije dopušten. Zato je provjera korisnika u admin layoutu u komponenti `ZasticeniOkvir` unutar `<Suspense>`, a ne na vrhu layouta.
- 0.6: zajednička provjera je `zahtijevajKorisnika()` u `src/lib/supabase/provjera.ts`. Koristi je svaka admin serverska akcija i API ruta.
- 0.6: shadcn `input` i `label` dodani su već u 0.6 (trebali su za prijavu). U 0.7 ih ne treba ponovno dodavati.