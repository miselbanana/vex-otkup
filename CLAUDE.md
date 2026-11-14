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
npx supabase db query --remote --file supabase/postavke.sql --yes        # postavke kalendara (nakon naselja.sql)
npx supabase db advisors --remote                                         # sigurnosna provjera baze
node scripts/ikone-admina.mts                                             # ponovno izradi ikone admin aplikacije (public/ikone/)
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
- **Termin ima kapacitet.** Dan vrijedi 4 boda. Narudžba troši 1, 2 ili 4 boda prema zračnoj udaljenosti od Vedranovog polazišta (Reka kod Koprivnice). Dan zauzimaju narudžbe sa statusom `nova` i `potvrdjena`. Nedjelje, blagdani i dani koje Vedran zatvori nisu dostupni. Detalji su u planu, korak 1.5.
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
- [x] 0.7 Dizajn sistem i okviri stranica
- [x] 0.8 Objava na Vercelu

**Faza 1 — MVP**
- [x] 1.1 Javni cjenik i kalkulator
- [x] 1.2 Početna stranica
- [x] 1.3 Narudžba — okvir i materijali
- [x] 1.4 Narudžba — fotografije
- [x] 1.5 Narudžba — lokacija i termin
- [x] 1.6 Narudžba — kontakt i slanje
- [ ] 1.7 Email obavijest Vedranu
- [x] 1.8 Admin — popis narudžbi
- [x] 1.9 Admin — detalji narudžbe i statusi
- [x] 1.10 Admin — realizacija narudžbe
- [x] 1.11 Admin — uređivanje cjenika
- [x] 1.12 Instalacija admina na mobitel
- [x] 1.13 Politika privatnosti i kolačići
- [ ] 1.13a Jezično usklađivanje teksta (dodano na Mišelov zahtjev)
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
- 0.7: naziv tvrtke je **Čelik**. Logotip je `src/components/logo.tsx`: SVG I-nosač na bakrenoj pločici + naziv kao tekst.
- 0.7: naziv, telefon i područje su na jednom mjestu, u `src/lib/kontakt.ts`. **Telefon je PRIVREMEN (`091 000 0000`)**. Zamijeniti Vedranovim brojem prije 1.15.
- 0.7: shadcn `form` za `base-nova` ne postoji (prazan zapis u registryju). Umjesto njega je dodan **`field`**, koji je donio i `separator`. React Hook Form i Zod dodaju se u 1.3.
- 0.7: `sonner` je instaliran **bez `next-themes`** (komponenta je prilagođena na stalno svijetli izgled). Tamni način (`.dark`) je uklonjen iz `globals.css`.
- 0.7: zadane veličine shadcn komponenti su povećane.
  - Gumb je visok 48 px, a ikona-gumb je 48×48.
  - Polje i select su visoki 48 px, s bijelom pozadinom i uvijek 16 px teksta (inače iPhone zumira).
  - Kartica: rub i `shadow-kartica`.
  - Dijalog i sheet: `shadow-panel`.
- 0.7: boje statusa su klase `bg-status-nova`, `text-status-potvrdjena` itd. Hover primarnog gumba je `primary-tamna`.
- 0.7: početna je premještena u `src/app/(javno)/page.tsx`.
  - `/admin` preusmjerava na `/admin/narudzbe`.
  - Prazne admin stranice („Uskoro”): `narudzbe`, `cjenik`, `analitika`, `postavke`.
  - „Više” u donjoj navigaciji otvara donji panel s Postavkama i Odjavom.
- 0.7: u podnožju nema godine, jer uz `cacheComponents` `new Date()` ruši prerender. Gumb „Postavke kolačića” još ne radi ništa (spaja se u 1.13).
- 0.8: adresa je **`otkup-rho.vercel.app`**, a ne `otkup.vercel.app`, jer je ime `otkup` bilo zauzeto. Vercel je na Hobby planu do 1.15.
- 0.8: u Vercelu su zasad samo 3 Supabase varijable. Ostale se dodaju u koraku u kojem zatrebaju, a nakon svake treba Redeploy.
- 0.8: tajni ključ projekta `otkup-dev` pojavio se u razgovoru s Claudeom i nije zamijenjen (Mišelova odluka). Produkcija (`otkup-prod`, 1.15) dobiva nove ključeve.- 1.1: cjenik se čita u `src/lib/cjenik.ts` (`dohvatiCjenik()`) tajnim ključem, jer RLS anonimnima ne dopušta čitanje. Vraća samo javne stupce. Keširan je s `'use cache'`, `cacheLife('hours')` i `cacheTag('cjenik')`, pa je `/cjenik` statična stranica koja se sama osvježi najkasnije za 1 h.
- 1.1: kalkulator je `src/components/javno/kalkulator.tsx` (malim slovima, kao ostale komponente), a ne `Kalkulator.tsx`. Smješten je na `/cjenik`, ispod kartica.
- 1.1: link na narudžbu je `/naruci?s=klasaId:kg,klasaId:kg` (npr. `s=3:12.5,7:40`), a gradi ga `stavkeUUrl()` iz `izracun.ts`. Čitanje tog formata radi se u 1.3. Do tada gumb vodi na stranicu koja ne postoji.
- 1.1: `izracunajProcjenu()` računa u centima i zaokružuje tek na kraju. Najviše 100.000 kg po retku (`NAJVISE_KG`).
- 1.1: `formatEur()` je napisan ručno (ne `Intl`), da server i preglednik ispišu isto.
- 1.1: na `/cjenik` zasad ne vodi nijedan link (ni u zaglavlju ni u podnožju). Dodaje se u 1.2.
- 1.1: `parseBroj()` sam prepoznaje razdjelnik tisuća. Ako u broju ima i točke i zareza, zadnji znak je decimalni (`1.237,59` → 1237,59). Jedan znak s točno 3 znamenke iza je razdjelnik tisuća (`1.500` → 1500), osim kad je ispred nula (`0,500` → 0,5). Kalkulator nakon upisa prepiše broj u jasan oblik (`formatBrojUnos()`, npr. „1500”).
- 1.1: u `next.config.ts` je dodano `allowedDevOrigins: ['192.168.*.*']` (vrijedi samo za razvoj). Bez toga Next.js blokira skripte kad se lokalni sajt otvori s mobitela u kućnoj mreži.
- 1.2: početna je **bez fotografije** (Mišelova odluka, zbog brzine). Ima samo tekst, gumbe i ikone. Fotografija se može dodati kasnije preko `next/image`.
- 1.2: sažetak cijena prikazuje prva 4 materijala iz cjenika u obliku „do X €/kg”, tj. najvišu cijenu klase.
- 1.2: pokrivene županije čita `dohvatiPokriveneZupanije()` u `src/lib/zupanije.ts`. Keširano je na dan (`cacheTag('zupanije')`).
- 1.2: slika za dijeljenje linka je `src/app/opengraph-image.tsx` (generira se pri buildu i vrijedi za sve stranice). Font je `src/assets/fonte/BarlowSemiCondensed-Bold.ttf` (OFL), jer zadani font slike nema sigurno sva hrvatska slova.
- 1.2: **stranice ne smiju postavljati vlastiti `openGraph` u `metadata`.** Next.js ga ne spaja s onim iz korijenskog layouta, nego ga zamijeni u cijelosti, pa nestane slika. Zajednička polja (`type`, `locale`, `siteName`) su u `src/app/layout.tsx`, a naslov i opis za dijeljenje Next.js preuzima iz `title`/`description`.
- 1.2: `metadataBase` u `layout.tsx` uzima redom `NEXT_PUBLIC_SITE_URL`, zatim `VERCEL_PROJECT_PRODUCTION_URL` (Vercel ga postavlja sam), zatim `localhost:3000`. `NEXT_PUBLIC_SITE_URL` treba dodati u Vercel kad dođe vlastita domena.
- 1.2: link „Cjenik” dodan je u zaglavlje (samo od širine `sm`, na uskom mobitelu nema mjesta) i u podnožje. Gumb s `buttonVariants` sakriva se klasom `max-sm:hidden`, a ne s `hidden`, jer bi gumbov `inline-flex` pobijedio.
- 1.3: instalirani su `react-hook-form` 7.92, `zod` 4.6 i `@hookform/resolvers` 7.0 (resolver se uvozi iz `@hookform/resolvers/zod`).
- 1.3: Zod sheme su u `src/lib/validacija/narudzba.ts`. **Zasad sadrže samo materijale.** Koraci 1.4–1.6 proširuju `narudzbaFormeShema` svojim poljima. `stavkaShema` (brojevi) je za server, a `stavkaFormeShema` (tekst kako ga kupac upisuje) za formu.
  - Forma ima dva tipa: `NarudzbaForme` (dok se ispunjava, odabir smije biti `null`) i `NarudzbaFormeProvjerena` (nakon provjere). Zato je `useForm<NarudzbaForme, unknown, NarudzbaFormeProvjerena>`.
- 1.3: `procitajKg()`, `greskaKolicine()`, `NAJVISE_STAVKI` (20) i `stavkeIzUrla()` su u `izracun.ts`, a ne u shemi, da Zod ne ulazi u kod stranice `/cjenik`. **Količina smije imati najviše 2 decimale** (baza je `numeric(10,2)`). To vrijedi i za kalkulator.
- 1.3: redak materijal → klasa → kg izdvojen je u `src/components/javno/redak-stavke.tsx` i koriste ga kalkulator i korak 1. Kartica „cjenik nedostupan” je `cjenik-nedostupan.tsx` (/cjenik i /naruci).
- 1.3: datoteke su `narudzba/koraci.tsx` i `narudzba/korak-materijali.tsx` (malim slovima), a ne `Koraci.tsx` i `KorakMaterijali.tsx`. Koraci 2–4 su zasad prazni („Ovaj korak uskoro dolazi”). Na zadnjem koraku nema gumba Dalje, jer slanje dolazi u 1.6.
- 1.3: „Dalje” provjerava samo polja trenutnog koraka (`trigger`), a potpuno prazne retke tiho uklanja ako postoji i popunjeni redak. Enter na tipkovnici = Dalje.
- 1.3: `/naruci` čita `searchParams` u komponenti unutar `<Suspense>` (pravilo uz `cacheComponents`). Naslov je statičan, a forma se dočita.
- 1.3: `SpremiIzvor` (`spremi-izvor.tsx`, u javnom layoutu) sprema `utm_source/medium/campaign/content/term` i `fbclid` u sessionStorage pod ključem `izvor` (`KLJUC_IZVORA`), samo pri prvom dolasku u posjetu. Baza zasad ima stupce samo za `utm_source`, `utm_campaign` i `fbclid`.
- 1.3: ako se paketi instaliraju dok radi `npm run dev`, Turbopack se može zbuniti („… is not a function”). Rješenje: ugasi i ponovno pokreni `npm run dev`. Ako ne pomogne, obriši i `.next/dev`. (Ponovilo se u 1.4 s `procitajKg is not a function`.)
- 1.4: bucket `fotografije` nastaje migracijom `bucket_fotografije` (privatan, 2 MB, samo `image/jpeg`). Nema nijednog pravila (policy) na `storage.objects`: upload ide potpisanim linkovima, a anonimni ne vide ništa (provjereno). **U 1.9 treba dodati pravilo za čitanje prijavljenima**, ako se `createSignedUrls` radi s korisnikovom sesijom, a ne tajnim ključem.
- 1.4: datoteka je `narudzba/korak-fotografije.tsx` (malim slovima). Konstante (`BUCKET_FOTOGRAFIJA`, `NAJVISE_FOTOGRAFIJA` = 5, `putanjaFotografije()`, tip `UploadOdgovor`) su u `src/lib/fotografije.ts`.
- 1.4: smanjivanje je u `src/lib/smanji-fotografiju.ts`. Paket `browser-image-compression` 2.0.2 radi s `useWebWorker: false`, jer bi inače svoj kod skidao s CDN-a (jsdelivr). Sigurnosna mreža: ako paket vrati izvornu datoteku ili ne-JPEG, slika se ponovno iscrta na platnu (canvas), pa GPS sigurno nestaje. Provjereno na pravim fotografijama: ~130–150 KB, bez EXIF-a.
- 1.4: umjesto jednog polja `accept="image/*"` postoje **dva gumba**: „Fotografiraj” (`capture="environment"`) i „Odaberi iz galerije” (`multiple`). Razlog: na nekim Androidima polje s `multiple` ne nudi kameru.
- 1.4: fotografije se šalju kad kupac na koraku 2 pritisne **Dalje** (ne u pozadini).
  - Forma dobiva `fotografije` (`kljuc`, `datoteka`, `pregled`, `putanja`) i `narudzbaId`.
  - Ako su sve već poslane, ne šalje se ništa.
  - Ako je dodana nova fotografija, sve se šalju ponovno pod novim id-om.
  - Brisanje poslane fotografije ne traži ponovno slanje, pa putanje mogu imati rupe (npr. 1 i 3).
  - Stare datoteke ostaju u Storageu bez narudžbe. Briše ih 2.8.
- 1.4: `POST /api/narudzbe/upload` je javan i bez Turnstilea (u 1.6 odlučeno da tako i ostane). Prima `{ broj: 1–5 }` i vraća `{ id, linkovi: [{ putanja, token }] }`. Token vrijedi 2 sata i može se iskoristiti samo jednom.
- 1.5: dvije migracije: `kalendar` i `pretraga_dj`.
  - Pretraga (`trazi_naselja`) uspoređuje oblik bez kvačica, malim slovima, a „dj” svodi na „d” (`oblik_za_pretragu`). Zato „djurdjevac” i „durdevac” nađu Đurđevac.
  - Pogađa naziv koji počinje upitom ili riječ u nazivu („reka” → „Donja Reka”). Pokrivene županije su prve.
- 1.5: `postavke_kalendara` ima uvijek jedan redak (`id = true`), s bodovima `bodovi_1`, `bodovi_2` i `bodovi_dalje`.
  - Početni redak upisuje `supabase/postavke.sql`, koji se pokreće **nakon** `naselja.sql`. U migraciji ili `seed.sql` ne može biti, jer tada još nema Reke. Reka se traži po matičnom broju 54763.
- 1.5: funkcije `bodovi_narudzbe(naselje)` (zračna udaljenost i bodovi, trebat će u 1.6) i `slobodni_dani(naselje, od, do)` (izbacuje nedjelje, zatvorene i pune dane).
  - **Blagdane izbacuje ruta `/api/kalendar`** preko `src/lib/blagdani.ts`, a ne baza. Spremanje u 1.6 mora provjeriti i blagdan.
  - Anonimni ne smiju pozivati te funkcije (provjereno). Zato i `db query --read-only` za njih javlja „permission denied”, pa se testiraju s `--yes`.
- 1.5: narudžbe imaju nove stupce `datum_odvoza`, `udaljenost_km` i `bodovi` (svi `not null`) te `redoslijed`. **Provjera kapaciteta pri spremanju je posao 1.6** (`kreiraj_narudzbu`), uz zaključavanje dana, da dvije istodobne narudžbe ne prepune dan.
- 1.5: instalirani su `date-fns` 4.4 i `@date-fns/tz` 1.5. Pomoćne funkcije za dane (`'GGGG-MM-DD'`) su u `src/lib/datum.ts`. Konstanta `DANA_U_KALENDARU` (30) i tip odgovora su u `src/lib/kalendar.ts`.
- 1.5: dodani su shadcn `combobox`, `input-group` i `textarea`. Prilagođeni su pravilima iz 0.7: visina 48 px, bijela pozadina i 16 px teksta. `button.tsx` i `input.tsx` **nisu** prepisani: shadcn je to nudio, a odgovoreno je „ne”.
- 1.5: ekran koraka 3 je u `narudzba/korak-lokacija.tsx`, a kalendar u `narudzba/kalendar-odvoza.tsx`.
  - Nakon odabira mjesta polje za pretragu nestaje i prikazuje se kartica mjesta s gumbom „Promijeni”.
  - Za nepokriveno mjesto prikazuju se samo poruka i telefon, a Dalje je onemogućen.
  - Dio dana i dani u kalendaru su gumbi s `aria-pressed`.
  - Kalendar prima fokus greške preko `data-fokus-greske` (Dalje traži taj atribut i `aria-invalid`).
- 1.5: GPS gumb na mobitelu radi samo preko https-a (Vercel), a ne na lokalnoj adresi `http://192.168…`.
- 1.5: polja forme za korak 3 su `naselje` (objekt iz pretrage), `ulica`, `lat`, `lng`, `napomena`, `zeljeniDatum` i `dioDana`. `napomena` ide u stupac `napomena_kupca` (1.6).
- 1.6: migracija `kreiraj_narudzbu`. Funkcija zaključa dan (`pg_advisory_xact_lock`) i u jednoj transakciji upisuje narudžbu, stavke i fotografije.
  - Sama računa bodove, udaljenost, cijene i procjenu. Iznos se iz preglednika uopće ne šalje.
  - Isti `id` poslan ponovno vraća broj već spremljene narudžbe. Ne javlja grešku i ne stvara drugu narudžbu.
  - Greške vraća porukama `IZVAN_PODRUCJA`, `DAN_NIJE_DOSTUPAN`, `DAN_POPUNJEN`, `KLASA_NEDOSTUPNA` i `NEISPRAVNI_PODACI`. Ruta ih pretvara u `kod` (`NarudzbaOdgovor` u `validacija/narudzba.ts`).
  - Neobavezni parametri (GPS, napomena, UTM) imaju `default null`, pa su u `tipovi.ts` neobavezni. Migracija je jednom poništena (`migration repair --status reverted`) i ponovno primijenjena, jer prva verzija to nije imala.
  - Poziva je samo `service_role` (provjereno).
- 1.6: `POST /api/narudzbe` redom provjerava Turnstile, Zod, dan (kalendar od 30 dana + blagdan), fotografije u Storageu (`list`), a zatim poziva `kreiraj_narudzbu`.
- 1.6: Turnstile je **samo pri slanju narudžbe** (Mišelova odluka). `/api/narudzbe/upload` ostaje bez njega.
  - Widget je vlastita komponenta `src/components/javno/turnstile.tsx`, bez npm paketa. Provjera na serveru je u `src/lib/turnstile.ts`.
  - Naziv radnje je `narudzba` (`TURNSTILE_AKCIJA`).
  - U `.env.local` su Cloudflareovi **testni** ključevi (`1x00…`). Pravi ključevi rade samo na `otkup-rho.vercel.app` i nalaze se samo u Vercelu (site key kao Config, secret kao Secret). Za vlastitu domenu (1.15) treba je dodati u Cloudflare widget.
- 1.6: `normalizirajMobitel()` u `format.ts` prihvaća samo hrvatske mobitele (`+3859` + 7–8 znamenki).
- 1.6: korak 4 je `narudzba/korak-kontakt.tsx`, a zahvala je `/naruci/hvala?broj=2026-0001` (noindex).
  - Privola vodi na `/politika-privatnosti`, koja do 1.13 daje 404.
  - Nakon neuspjelog slanja forma vraća kupca na pravi korak: dan → kalendar, fotografije → korak 2, cjenik → korak 1. Turnstile se svaki put postavlja ispočetka.
- 1.6 (dopuna 1.5 na Mišelov zahtjev, **odstupanje od plana**): kalendar ima 4 stanja, a ispod je legenda.
  - Zeleno: slobodan dan bez narudžbi.
  - Žuto: već ima narudžbi, ali ima mjesta. Kupac tako sazna da taj dan postoji neka narudžba, ali ne i koliko ih je ni čije su. Mišel je to svjesno prihvatio.
  - Prekriženo: popunjeno. Tako izgleda i dan koji Vedran ručno zatvori.
  - Sivo: nedjelje i blagdani.
  - Nova migracija `kalendar_djelomicni` dodaje funkciju `dani_s_narudzbama(od, do)`. `/api/kalendar` vraća i `djelomicni`.
  - Svaki dan ima punu boju pozadine, bez obruba: zelena, žuta, svijetlocrvena + prekriženo, siva. Na Mišelov zahtjev su pune boje, a ne blijede nijanse.
  - Boje su tokeni `dan-slobodan`, `dan-djelomicno`, `dan-popunjeno` (+ `-tekst`) i `dan-neradni` u `globals.css`.
- 1.8 rađen **prije 1.7** (1.7 čeka DNS; plan to dopušta, 1.8 ovisi samo o 0.6 i 1.6).
- 1.8: migracija `popis_narudzbi`:
  - `narudzbe` je u publikaciji `supabase_realtime` (popis uživo). Anonimni ne dobivaju ništa (RLS).
  - pravilo na `storage.objects`: prijavljeni smiju **čitati** bucket `fotografije`. Zato `createSignedUrls` radi s Vedranovom sesijom, bez tajnog ključa (bilješka iz 1.4 je riješena).
  - funkcija `trazi_narudzbe(upit)` vraća `setof narudzbe` (pa radi ugnježđivanje veza): ime, naselje i općina bez kvačica, mobitel po znamenkama (bez `0`/`385`, i zadnje znamenke), broj narudžbe. Anonimni je ne smiju zvati (provjereno).
- 1.8: dohvat je u `src/lib/admin/narudzbe.ts` (`dohvatiNarudzbe`, `brojNovih`, `zauzetostDana`, `linkoviFotografija`), oznake i `linkNavigacije()` u `src/lib/admin/oznake.ts`, redoslijed dana u `src/lib/admin/raspored.ts` (`poredajDan`, isti za prikaz i akciju). `danasUZagrebu()` je u `datum.ts`, `prikaziMobitel()` u `format.ts`.
  - Stanje popisa je u linku: `?kartica=raspored|realizirane|otkazane`, `?q=` (pretraga preko **svih** statusa, kartice se tada skrivaju), `?broj=100` (Učitaj još).
  - Stavka ima dvije veze na `klase`, pa se u upitu piše `klase!klasa_id`.
  - Komponente: `kartice-narudzbi`, `kartica-narudzbe`, `raspored`, `strelice-redoslijeda`, `pretraga-narudzbi` (Next.js `<Form>`, bez klijentskog koda), `popis-uzivo` u `src/components/admin/`.
  - `popis-uzivo`: Realtime → `router.refresh()` (više promjena zaredom spaja se u jedno, 300 ms), `visibilitychange`, gumb Osvježi, „Osvježeno prije X min” (vrijeme dolazi sa servera) i točkica uživo/nije uživo.
  - Akcija `pomakni(id, smjer)` u `narudzbe/akcije.ts` upiše `redoslijed` 1…n za cijeli dan i pozove `refresh()` iz `next/cache`. **Pri promjeni dana (1.9) `redoslijed` treba vratiti na `null`.**
  - `Date.now()` u serverskoj stranici traži `eslint-disable-next-line react-hooks/purity` (namjerno, jednom po zahtjevu).
- 1.8 (izmjene na Mišelov zahtjev, **odstupanje od plana**, plan je ažuriran):
  - „Nove” su poredane od **najnovije** (na vrhu), a ne od najstarije.
  - svaka narudžba ima redak „Ukupno” (kg) i „Okvirno za isplatu” (`procjena_ukupno`). **U 1.10 realizirane trebaju pokazati stvarni iznos** („Isplaćeno”), nikad zbrojen s procjenom.
  - Raspored je planer prikupa: na vrhu svakog dana je sažetak (broj kupaca, ukupno kg, okvirna gotovina). Raspored se ne reže na 50, da zbroj dana ne bude nepotpun.
  - Na kartici u „Nove” je zasad samo **Nazovi**. Kartica još ne vodi na detalje. Potvrdi, Otkaži, Promijeni dan i **Planer rute** („ruta = jedan dan”, dodavanje narudžbe u dan) dogovoreni su za 1.9 i upisani u plan.
- 1.8: u razvojnoj bazi je 9 testnih narudžbi (2026-0001 … 0009) s testnim fotografijama, poslanih kroz javni API. Statusi su postavljeni SQL-om. Ostaju za testiranje 1.9 i 1.10.
- 1.8: s mobitela u kućnoj mreži admin radi na `http://<IP računala>:3000/admin/narudzbe` (IP je bio `192.168.1.101`, može se promijeniti).
- 1.9: **bez migracije i bez novih paketa** (svi stupci su postojali od 0.4/1.5).
- 1.9: akcije u `narudzbe/akcije.ts`: `potvrdi`, `promijeniDan`, `otkazi`, `spremiNapomenu` (uz `pomakni` iz 1.8).
  - Svaka radi **uvjetni update** (`.eq('status', …)` + `.select('id')`). Ako je narudžbu u međuvremenu netko promijenio, ne sprema ništa i javlja „u međuvremenu promijenjena”.
  - Odgovor je `{ greska?, upozorenja? }`. Provjera dana je u `src/lib/admin/termin.ts` (`provjeriDan`): dan u prošlosti je greška; nedjelja, blagdan, zatvoren dan i pun dan (bodovi ostalih novih i potvrđenih + ova > kapacitet) samo **upozorenje**. Dijalog tada nudi „Ipak spremi” (`prekoraci = true`).
  - **Odstupanje od potpisa u planu:** `promijeniDan(id, { datum, dioDana?, vrijeme? }, prekoraci)`. Isti dijalog mijenja i dio dana i vrijeme. Bez vremena se `dogovoreni_termin` briše. Nov dan → `redoslijed = null`. Ako dan ostaje isti, kapacitet se ne provjerava.
  - Otkaz također postavlja `redoslijed = null`. Vraćanje otkazane narudžbe ne postoji.
- 1.9: `dogovoreni_termin` gradi `trenutakUZagrebu(datum, 'HH:MM')`, a ispisuje `formatTrenutak()` (oboje u `datum.ts`). Provjereno za zimsko i ljetno vrijeme.
- 1.9: detalji su `/admin/narudzbe/[id]` (statičan okvir + `<Suspense>`, neispravan id → 404). Dohvat je `dohvatiNarudzbu()`. `STUPCI` sada imaju i `dogovoreni_termin`, `potvrdjena_at` i `cijena_kg_prijavljena`.
  - „Natrag” vodi na popis u kojem narudžba jest (nova → Nove, potvrđena → planer njezina dana…).
  - Fotografije: `galerija-fotografija.tsx`, dijalog preko cijelog zaslona (strelice, povlačenje prstom, tipke ← →).
- 1.9: zaglavlje svake kartice (`ZaglavljeNarudzbe`) je link na detalje. U „Nove” (i u pretrazi za nove) kartica ima Potvrdi i Otkaži. Kartica u rasporedu ima „Promijeni dan” (to je planovo „Makni iz dana”).
  - Dijalozi: `dijalog-termina.tsx` (potvrdi / promijeni; dan je `<input type="date">` mobitela, Mišelova odluka), `dijalog-otkaza.tsx`, `dijalog-dodaj-u-dan.tsx`, `interna-napomena.tsx`. Male forme koriste `useState` + Zod na serveru, bez React Hook Forma.
- 1.9: Raspored ima dva pogleda (`planer-rute.tsx`): **Planer rute je zadan** (Mišelova odluka), „Svi dani” je `&pogled=svi`. Dan planera je u linku `&dan=GGGG-MM-DD` (danas bez njega, `linkPlanera()` u `lib/admin/raspored.ts`). U prošli dan se ne može dodavati.
  - Planer pokaže i koliko novih (nepotvrđenih) narudžbi zauzima dan (`zauzetostDana` vraća i `nove`) te upozori za nedjelju, blagdan ili zatvoren dan (`zatvorenDan()`).
- 1.9: dodano `ukupnoKg()` u `oznake.ts`.
- 1.10: migracija `realizacija`:
  - `stavke.kg_prijavljeno` smije biti **0**. To znači da je stavku Vedran dodao pri vaganju, jer je kupac nije prijavio. Javne narudžbe i dalje imaju > 0 (provjerava `kreiraj_narudzbu`). `klasa_id` ostaje `not null`, a `cijena_kg_prijavljena` dodane stavke je današnja cijena iz cjenika.
  - funkcija `realiziraj_narudzbu(p_id, p_stavke)` (`security invoker`, smiju je zvati samo prijavljeni, provjereno) sprema sve u jednoj transakciji. Radi za `potvrdjena` (realizacija) i `realizirana` (ispravak). Sama računa `iznos_stvarni` i `stvarno_ukupno` (zaokruženo tek na kraju, pa zbroj redaka može odstupiti za 1 cent).
  - Svaka prijavljena stavka mora dobiti stvarne vrijednosti (0 kg = „nije bilo”). Dodane stavke koje Vedran pri ispravku makne se brišu. Ukupno mora biti > 0 kg (inače je to otkaz).
  - `realizirana_at` se postavlja samo pri prvoj realizaciji, a ispravak ga ne mijenja.
  - Greške: `NIJE_DOSTUPNA`, `NEISPRAVNI_PODACI`.
- 1.10: akcija `realiziraj(id, stavke)` u `narudzbe/akcije.ts`. Iznos se iz preglednika ne šalje.
- 1.10: stranica `/admin/narudzbe/[id]/realizacija` + `components/admin/forma-realizacije.tsx` (`useState`, bez React Hook Forma).
  - Stavke su unaprijed popunjene: stvarne vrijednosti (ako je ispravak), inače prijavljena klasa i kg te **današnja** cijena.
  - Klasa je izbornik grupiran po materijalu: aktivne klase + trenutna klasa stavke ako je ugašena. Promjena klase postavi njezinu današnju cijenu.
  - Na dnu je traka zalijepljena iznad donje navigacije: „Za isplatu” + gumb za spremanje.
- 1.10: cjenik za admin čita `dohvatiCjenikAdmin()` u `src/lib/admin/cjenik.ts`. Čita se svježe, sesijom korisnika i bez keša, a vraća i ugašene klase (`aktivna`).
- 1.10: `izracun.ts`: `procitajKg`/`greskaKolicine` imaju opciju `{ dopustiNulu }`. Dodani su `procitajCijenu()`, `izracunajIsplatu()` i `NAJVISE_CIJENA_KG` (100 €/kg, ista granica je u bazi). U `format.ts` je dodan `formatCijenaUnos()` („7,20”), a u `oznake.ts` `ukupnoKgStvarno()`.
- 1.10: realizirana narudžba sa `stvarno_ukupno` u kartici i detaljima prikazuje **samo stvarno**: „Izvagano” i „Isplaćeno”, a retke s 0 kg kao „nije bilo”. Detalji pokazuju i što je kupac prijavio. Testna 2026-0008 (realizirana SQL-om, bez stvarnih vrijednosti) i dalje pokazuje procjenu, dok je netko ne ispravi preko „Uredi realizaciju”.
- 1.10: **uz `cacheComponents` Next.js stranicu pri odlasku ne briše, nego je sakrije (React `<Activity>`) i zapamti joj stanje.** Forma koja nakon spremanja radi `router.push` mora se sama vratiti u početno stanje. Inače je pri povratku i dalje „Spremam…”. Rješenje je `useLayoutEffect` s čišćenjem (cleanup) koje se izvodi samo nakon uspješnog spremanja i `key` na formi složen od podataka iz baze. Vidi `forma-realizacije.tsx` i `node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`. Isto vrijedi za forme u 1.11.
- 1.10: kartica narudžbe u popisu (Nove, Realizirane, Otkazane, pretraga) **uvijek** prikazuje ime i prezime kupca (Mišelov zahtjev). Gumb Nazovi ostaje samo u „Nove” i pretrazi.
- 1.10 (**dodatak izvan plana**, Mišel odobrio): kartica u rasporedu (Planer rute i Svi dani) ima gumb „Realiziraj” uz „Promijeni dan”.
- 1.11: migracija `cjenik_azurirano`: okidač `klase_postavi_azurirano` mijenja `azurirano` **samo kad se promijeni cijena** (`when old.cijena_po_kg is distinct from new.cijena_po_kg`). Admin to prikazuje kao „Cijena promijenjena: …”. Provjereno u bazi.
- 1.11: akcije cjenika su u `cjenik/akcije.ts`: `spremiCijenu`, `urediKlasu` (naziv + opis), `postaviAktivnu` i `dodajKlasu`.
  - Nakon spremanja svaka akcija poziva `updateTag('cjenik')` + `revalidatePath('/cjenik')` + `revalidatePath('/')` + `refresh()`.
  - `updateTag` je potreban jer je `dohvatiCjenik()` keširan oznakom `cjenik`, a koriste ga i `/naruci` i kalkulator.
  - Cijena mora biti 0,01–100 €/kg. Isti naziv klase u istom materijalu javlja grešku (`23505`).
  - Materijali se u adminu ne dodaju i ne gase (nije u planu).
- 1.11: datoteka s `'use server'` smije izvoziti samo async funkcije (i tipove). Zato su sheme i granice u `src/lib/validacija/cjenik.ts` i `validacija/postavke.ts`, a ne u akcijama.
- 1.11: admin cjenik čita `dohvatiCjenikUredivanje()` u `lib/admin/cjenik.ts`. Komponente su `redak-klase.tsx` (`key` = id-cijena-azurirano-aktivna) i `dijalog-klase.tsx` (dodaj / uredi).
- 1.11: postavke kalendara su na `/admin/postavke`.
  - Akcije su u `postavke/akcije.ts`: `spremiPostavkeKalendara`, `zatvoriDan(datum, razlog, ipak)` i `otvoriDan`.
  - Zatvaranje dana koji već ima novih ili potvrđenih narudžbi vraća upozorenje i traži „Ipak zatvori”. Te narudžbe ostaju na tom danu, a popis zatvorenih dana ih prikazuje crveno.
  - Dohvat je u `lib/admin/postavke.ts`. Komponente su `forma-postavki-kalendara.tsx` i `zatvoreni-dani.tsx`.
  - Keš se ne osvježava, jer `/api/kalendar` nije keširan.
  - Polazište (Reka) se samo prikazuje i ne može se mijenjati.
- 1.11: `bodovaRijec(n)` („1 bod / 2 boda / 5 bodova”) je u `validacija/postavke.ts`.
- 1.12: **bez migracije i bez novih paketa.** Manifest je `public/admin.webmanifest`: „Čelik admin”, `id`/`scope` `/admin`, `start_url` `/admin/narudzbe`, `standalone`, uspravno.
  - Povezan je samo u `src/app/(admin)/admin/layout.tsx` (`metadata.manifest`), uz `viewport.themeColor` `#ffffff` (boja admin zaglavlja). Javne stranice i `/prijava` nemaju manifest (provjereno).
  - Ikone su u `public/ikone/` (`admin-192/512.png` i `admin-maskable-192/512.png`). Izrađuje ih `scripts/ikone-admina.mts` iz istog crteža kao `ZnakLogotipa`, paketom `sharp` koji dolazi s Next.js-om (nije posebno instaliran).
  - `proxy.ts` ne dira `/admin.webmanifest` ni ikone (matcher `/admin/:path*` ih ne hvata), pa se manifest učita i bez prijave (provjereno: 200, `application/manifest+json`).
  - `/prijava` je izvan `scope`. Ako se prijava izgubi, otvori se unutar aplikacije s trakom adrese, a nakon prijave aplikacija se vraća na normalan prikaz.
  - Service worker se ne radi do 2.5 (Chrome ga za instalaciju više ne traži).
  - Instalacija iz Chromea provjerena na mobitelu 13. 11. 2026.: ikona, otvaranje bez adresne trake, zapamćena prijava. Na Vedranovom mobitelu ponoviti kad dobije korisnika (vidi 0.6).
- 1.13: rađeno **s privremenim podacima obrta** (Mišelova odluka, Vedranove podatke još nemamo). U `src/lib/kontakt.ts` su `OBRT_NAZIV`, `OBRT_OIB` (`00000000000`), `OBRT_ADRESA`, `EMAIL_PRIVATNOST` (`privatnost@example.com`) i `POLITIKA_VRIJEDI_OD` (tekst, ne `new Date()`). **Zamijeniti prije 1.15**, zajedno s telefonom.
- 1.13: politika je `src/app/(javno)/politika-privatnosti/page.tsx`, statična stranica (○) s 8 poglavlja: voditelj obrade, podaci, svrha i pravna osnova, rok (24 mj. + anonimizacija), primatelji (Supabase, Vercel, Resend, Cloudflare, Meta uz pristanak, održavatelj), prava + AZOP, kolačići, izmjene. Popis kolačića je u karticama, a ne u tablici (uski mobitel). **Kad se doda nov pružatelj (npr. Sentry u 2.7), dopisati ga u poglavlje 5 i promijeniti `POLITIKA_VRIJEDI_OD`.**
- 1.13: instaliran je `vanilla-cookieconsent` 3.3. Banner je `src/components/javno/pristanak-kolacica.tsx` (`CookieConsent.run` u `useEffect`; paket sam sprječava dvostruko pokretanje, `window._ccRun`), samo u javnom layoutu. Admin i `/prijava` ga nemaju (provjereno: CSS paketa se tamo ne učitava).
  - Kategorije su `necessary` (zaključana) i `marketing` (`autoClear` briše `_fbp` i `_fbc` kad se pristanak povuče). **U 1.14 se Pixel spaja na kategoriju `marketing`.**
  - Prozor je `box`, dolje u sredini, s `equalWeightButtons` („Prihvati sve” i „Odbij” izgledaju jednako). Izbor se pamti u kolačiću `cc_cookie` (182 dana).
  - Izgled je u `globals.css` (`html #cc-main { --cc-… }`): boje projekta, gumbi 48 px i 16 px teksta, Inter i Barlow. `html` ispred `#cc-main` je potreban da pravila pobijede CSS paketa bez obzira na redoslijed učitavanja.
  - „Postavke kolačića” (podnožje i poglavlje 7 politike) je klijentska komponenta `gumb-postavki-kolacica.tsx` (`showPreferences()`).
- 1.13: tekst politike i bannera jezično je ispravljen na Mišelov zahtjev (standardni hrvatski, navodnici „…“). Ostatak sajta usklađuje se u novom koraku **1.13a**, koji je dodan u plan.
- 1.13 **otvorena pitanja** (ne rješavaju se kodom):
  - tekst politike neka pregleda netko tko se bavi GDPR-om
  - treba li ugovor o obradi podataka između Vedrana i Mišela
  - `SpremiIzvor` sprema `fbclid` i UTM u sessionStorage i prije pristanka (u politici su navedeni kao nužni). **Odlučiti najkasnije u 1.14** smije li `fbclid` ostati bez pristanka.
