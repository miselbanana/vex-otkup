Plan implementacije
Servis za narudžbu otkupa sekundarnih sirovina
Izrađivač: Mišel · Klijent: Vedran · Verzija: 1 (studeni 2026.)
Ukratko
Javni sajt: cjenik, kalkulator i narudžba odvoza s obaveznom fotografijom.
Admin: za Mišela i Vedrana, instalira se na Android. Sadrži narudžbe, statuse, realizaciju sa stvarnim vrijednostima, cjenik i analitiku.
Bez korisničkih računa za kupce, bez online plaćanja (isplata je gotovinom na licu mjesta).
Tehnologije
Područje	Alat
Framework	Next.js 16 (App Router) + TypeScript
Baza, prijava, fotografije	Supabase (PostgreSQL, Auth, Storage), regija Frankfurt
Izgled	Tailwind CSS 4 + shadcn/ui + lucide-react ikone
Forme	React Hook Form + Zod
Grafikoni / karta	Recharts / Leaflet + OpenStreetMap
Email	Resend + React Email
Zaštita od botova	Cloudflare Turnstile
Mjerenje oglasa	Meta Pixel + Conversions API
Kolačići	vanilla-cookieconsent
Datumi	date-fns + @date-fns/tz (zona Europe/Zagreb)
Hosting	Vercel Pro + GitHub
Greške	Sentry (EU regija)
Statusi narudžbe
`nova` → `potvrđena` (Vedran nazvao i dogovorio termin) → `realizirana` (izvagano, isplaćeno, upisane stvarne vrijednosti)
`nova` ili `potvrđena` → `otkazana` (uvijek s razlogom)
<div style="page-break-after: always;"></div>
Faza 0 — Postavka
0.1 Računi i radno okruženje
Opis: Otvaramo sve račune i instaliramo alate prije prve linije koda. Tako kasnije ne staješ usred lekcije zbog registracije.
Zadaci:
Instaliraj Node.js (LTS), Git i VS Code.
Ekstenzije za VS Code: ESLint, Prettier, Tailwind CSS IntelliSense.
Otvori račune: GitHub, Vercel, Supabase, Resend, Cloudflare (za Turnstile).
Provjeri pristup Vedranovom Meta Business računu i Pixelu (ili ih napravi za njega).
Dogovori s Vedranom domenu (.hr) i tko ima pristup DNS postavkama kod registrara.
Sve lozinke i ključeve spremaj u upravitelj lozinki (npr. Bitwarden), ne u bilježnicu.
Rezultat: Svi računi su otvoreni, a `node -v` i `git --version` rade u terminalu.
Napomena: Plaćene planove (Vercel Pro, Supabase Pro) ne uključuj sada, nego u koraku 1.15. Odmah dogovori da se troškovi naplaćuju s Vedranove kartice, inače ćeš svaki mjesec refakturirati.
0.2 Kostur projekta
Opis: Stvaramo prazan Next.js projekt s dogovorenom strukturom mapa i stavljamo ga na GitHub.
Zadaci:
Pokreni `npx create-next-app@latest otkup` i odaberi: TypeScript, ESLint, Tailwind, App Router, mapa `src/`.
Pokreni `npx shadcn@latest init`.
Napravi ovu strukturu mapa:
```
src/
  app/
    (javno)/            javne stranice
    (admin)/admin/      admin
    prijava/
    api/
  components/
    ui/                 shadcn komponente
    javno/  admin/
  lib/
    supabase/  validacija/  izracun.ts  format.ts
  emails/
supabase/
  migrations/  seed.sql
scripts/
```
Napravi prvi commit i push u privatni GitHub repozitorij.
Rezultat: `npm run dev` otvara stranicu na `localhost:3000`, a kod je na GitHubu.
Napomena: Provjeri da je `.env.local` u `.gitignore`. Ključ koji jednom završi na GitHubu smatraj procurjelim i odmah ga zamijeni novim.
0.3 Supabase projekt i migracije
Opis: Spajamo projekt na bazu tako da svaka promjena baze bude zapisana kao datoteka. Tako razvojna i produkcijska baza uvijek imaju isto stanje.
Zadaci:
Napravi projekt `otkup-dev` (besplatni plan, regija Frankfurt).
Instaliraj Supabase CLI, pa pokreni `supabase init` i `supabase link`.
U `.env.local` upiši tri vrijednosti:
`NEXT\_PUBLIC\_SUPABASE\_URL`
`NEXT\_PUBLIC\_SUPABASE\_ANON\_KEY` (javni ključ)
`SUPABASE\_SERVICE\_ROLE\_KEY` (tajni ključ)
Napravi tri datoteke s paketom `@supabase/ssr`:
`src/lib/supabase/server.ts`
`src/lib/supabase/client.ts`
`src/lib/supabase/admin.ts` (sadrži `import 'server-only'`)
Rezultat: Projekt se spaja na bazu, a `supabase db push` prolazi bez greške.
Napomena: Tablice ne mijenjaj klikanjem u Supabase sučelju, nego isključivo kroz `supabase/migrations/\*.sql`. Inače produkcijska baza za mjesec dana neće odgovarati razvojnoj.
Tajni ključ nikad ne smije imati prefiks `NEXT\_PUBLIC\_`. Taj ključ zaobilazi svu zaštitu baze.
0.4 Shema baze
Opis: Postavljamo tablice za cjenik, narudžbe, stavke, fotografije i naselja. Moraju biti dobro postavljene od početka, jer cijela analitika ovisi o njima.
Zadaci:
Napravi migraciju `0001\_shema.sql` s ovim tablicama:
`zupanije` (naziv, pokrivena)
`naselja` (naziv, opcina, zupanija_id, postanski_broj, lat, lng)
`materijali` (naziv, slug, redoslijed, aktivan)
`klase` (materijal_id, naziv, opis, cijena_po_kg `numeric(10,2)`, aktivna, azurirano)
`narudzbe`, s ovim stupcima:
`id` uuid i `broj` (redni broj, npr. 2026-0042)
`status`
kontakt: `ime\_prezime`, `mobitel`
lokacija: `naselje\_id`, `ulica`, `lat`, `lng`
termin: `zeljeni\_datum` (tip `date`), `dio\_dana`, `dogovoreni\_termin`
napomene: `napomena\_kupca`, `napomena\_interna`, `razlog\_otkaza`
iznosi: `procjena\_ukupno`, `stvarno\_ukupno`
izvor i privola: `privola\_at`, `utm\_source`, `utm\_campaign`, `fbclid`
vremena: `created\_at`, `potvrdjena\_at`, `realizirana\_at`
`stavke`, s ovim stupcima:
`narudzba\_id`
prijavljeno: `klasa\_id`, `kg\_prijavljeno`, `cijena\_kg\_prijavljena`
stvarno: `klasa\_stvarna\_id`, `kg\_stvarno`, `cijena\_kg\_stvarna`, `iznos\_stvarni`
`fotografije` (narudzba_id, putanja)
Dodaj enume:
`status\_narudzbe`: nova, potvrdjena, realizirana, otkazana
`dio\_dana`: jutro, popodne, svejedno
Uključi RLS na svim tablicama. Prijavljeni korisnici smiju sve, anonimni ništa.
Pokreni `supabase gen types typescript` i spremi rezultat u `src/lib/supabase/tipovi.ts`.
Rezultat: Tablice postoje u bazi, a TypeScript zna njihove stupce.
Napomena: Cijenu spremaj u stavku u trenutku narudžbe (`cijena\_kg\_prijavljena`). Ako stavka samo pokazuje na cjenik, sutrašnja promjena cijene tiho mijenja stare narudžbe i analitika laže.
Novac je uvijek `numeric(10,2)`, nikad `float`.
0.5 Početni podaci
Opis: Punimo bazu materijalima, klasama, cijenama i popisom naselja. Bez toga forma i kalkulator nemaju s čime raditi.
Zadaci:
Od Vedrana uzmi popis materijala, klasa i cijena. Uz svaku klasu treba kratki opis po kojem je kupac prepoznaje. Sve upiši u `supabase/seed.sql`.
Pripremi popis naselja RH s općinom i županijom (DZS) i koordinatama (OpenStreetMap).
Skriptom `scripts/uvoz-naselja.ts` upiši naselja u tablicu `naselja`.
Označi županije koje Vedran pokriva (`pokrivena = true`).
Rezultat: Tablica `naselja` ima oko 6.700 redaka, a cjenik sadrži sve Vedranove klase s cijenama.
Napomena: Opisi klasa su najvažniji tekst na sajtu. Kupac sam procjenjuje klasu, a krivo procijenjena klasa znači svađu na terenu.
Neka ih Vedran napiše svojim riječima i s primjerima, npr. "kabel bez izolacije" ili "cijevi bez lema".
0.6 Prijava i zaštita admina
Opis: U admin ulazite samo ti i Vedran. Sve ispod `/admin` je zaključano.
Zadaci:
U Supabase Auth isključi registraciju i ručno dodaj dva korisnika.
Napravi stranicu `src/app/prijava/page.tsx` (email + lozinka).
Napravi `src/proxy.ts` (u starijim verzijama Next.js zove se `middleware.ts`). On osvježava sesiju i neprijavljene s `/admin/\*` šalje na `/prijava`.
U `src/app/(admin)/admin/layout.tsx` dodaj još jednu provjeru korisnika na serveru.
Dodaj gumb "Odjava".
Rezultat: Neprijavljeni posjetitelj ne može otvoriti nijednu `/admin` stranicu, a ti i Vedran se normalno prijavljujete.
Napomena: Provjera u `proxy.ts` nije dovoljna. Svaka serverska akcija koja mijenja podatke mora ponovno provjeriti korisnika.
Na serveru koristi `supabase.auth.getUser()`, a ne `getSession()`, jer `getSession()` vjeruje kolačiću bez provjere.
Zaboravljenu lozinku resetiraš ti u Supabase sučelju, pa posebna stranica za to nije potrebna.
0.7 Dizajn sistem i okviri stranica
Opis: Postavljamo boje, fontove i dva okvira stranica (javni i admin). Tako svaka sljedeća stranica odmah izgleda gotovo.
Zadaci:
Upiši boje i razmake u `src/app/globals.css` (vidi sekciju Dizajn sistem).
Učitaj fontove preko `next/font/google` u `src/app/layout.tsx`.
Napravi `src/app/(javno)/layout.tsx`:
zaglavlje: logo, telefon, gumb "Naruči odvoz"
podnožje: kontakt, Politika privatnosti, Postavke kolačića
Napravi `src/app/(admin)/admin/layout.tsx` s donjom navigacijom: Narudžbe · Cjenik · Analitika · Više.
Dodaj shadcn komponente: button, input, select, card, badge, dialog, sheet, tabs, form, sonner.
Rezultat: Prazne javne i admin stranice na mobitelu imaju zaglavlje, navigaciju i ispravne boje i fontove.
Napomena: Fontu obavezno dodaj `subsets: \['latin', 'latin-ext']`. Bez `latin-ext` slova č, ć, đ, š i ž prikazuju se drugim fontom.
0.8 Objava na Vercelu
Opis: Sajt ide na internet već prvi tjedan i svaki push se automatski objavljuje. Tako stalno testiraš na pravom mobitelu.
Zadaci:
U Vercelu napravi Import projekta s GitHuba.
Unesi varijable okruženja (iste kao u `.env.local`).
Otvori sajt na svom Android mobitelu preko mobilnih podataka.
Rezultat: Sajt radi na adresi `otkup.vercel.app`, a svaki push na `main` ga ažurira.
Napomena: Promjena varijable u Vercelu vrijedi tek nakon novog deploya (Redeploy). Varijable s `NEXT\_PUBLIC\_` ugrađuju se u kod pri buildu.
Vedranova domena spaja se tek u koraku 1.15.
<div style="page-break-after: always;"></div>
Faza 1 — MVP
1.1 Javni cjenik i kalkulator
Opis: Prva prava funkcija: kupac vidi cijene po kilogramu i računa okvirni iznos.
Zadaci:
`src/lib/izracun.ts`: funkcija `izracunajProcjenu(stavke, cjenik)`. Istu funkciju koriste preglednik i server.
`src/lib/format.ts`, dvije funkcije:
`formatEur()` ispisuje iznos kao "1.234,56 €"
`parseBroj()` prihvaća i "12,5" i "12.5"
`src/app/(javno)/cjenik/page.tsx`: kartica po materijalu, a u njoj klase s opisom i cijenom po kg.
`components/javno/Kalkulator.tsx`:
kupac bira materijal, pa klasu, pa upisuje kg
može dodati više redaka
okvirni iznos računa se uživo
gumb "Naruči odvoz" prenosi stavke u formu kroz URL (`/naruci?s=...`)
Ispod kalkulatora ide tekst: "Cijena po kg je fiksna. Ukupni iznos je procjena, a konačni iznos određuje se vaganjem i pregledom klase na licu mjesta."
Rezultat: `/cjenik` prikazuje cijene iz baze, a kalkulator točno računa s decimalnom tipkovnicom na mobitelu.
Napomena: Kupci u Hrvatskoj upisuju decimalni zarez, a polje `type="number"` ga na nekim Android tipkovnicama ne prima. Koristi `type="text" inputMode="decimal"` zajedno s `parseBroj()`.
JavaScript računa 0,1 + 0,2 = 0,30000000000000004. Zato iznose zaokružuj na dvije decimale tek na kraju izračuna.
1.2 Početna stranica
Opis: Na ovu stranicu dolazi kupac s Meta oglasa. U pet sekundi mora shvatiti što se nudi i gdje kliknuti.
Zadaci:
U `src/app/(javno)/page.tsx` složi ove dijelove:
naslov i podnaslov s područjem pokrivanja
gumb "Naruči odvoz"
"Kako radi" u tri koraka: naruči s fotografijom → nazovemo i dogovorimo termin → dolazimo, važemo i plaćamo gotovinom
sažetak cijena (najtraženiji materijali)
popis pokrivenih županija
telefon
Postavi metapodatke: `title`, `description` i Open Graph sliku (prikazuje se kad se link dijeli).
Slike prikazuj preko `next/image`.
Rezultat: Početna stranica se brzo učitava na mobitelu preko 4G, a gumb za narudžbu vidi se bez skrolanja.
Napomena: Promet s oglasa plaćaš po kliku. Težak video ili velike slike znače da dio ljudi ode prije nego što se stranica učita.
Cilj u PageSpeed Insights je 85+ za mobitel.
1.3 Narudžba — okvir i materijali
Opis: Narudžba ide u četiri kratka koraka umjesto jedne duge forme. Ovdje slažemo okvir i prvi korak.
Zadaci:
`src/lib/validacija/narudzba.ts`: Zod shema cijele narudžbe. Koriste je i preglednik i server.
Napravi `src/app/(javno)/naruci/page.tsx` i u mapi `components/javno/narudzba/` datoteke `Koraci.tsx` i `KorakMaterijali.tsx`.
Dodaj traku napretka (1/4 … 4/4) i gumbe Natrag / Dalje. React Hook Form čuva podatke kroz sve korake.
Korak 1 sadrži stavke (materijal, klasa, kg) i okvirni iznos koji se računa uživo. Ako je kupac došao iz kalkulatora, stavke su već popunjene.
Mala komponenta u javnom layoutu pri prvom dolasku sprema `utm\_\*` i `fbclid` u sessionStorage (unutar try/catch).
Rezultat: Kupac prolazi prvi korak, a podaci ostaju kad ide naprijed i natrag.
Napomena: UTM parametri postoje samo na stranici na koju je kupac stigao s oglasa. Ako ih ne spremiš odmah, do `/naruci` se izgube i kasnije ne znaš koja kampanja donosi narudžbe.
1.4 Narudžba — fotografije
Opis: Fotografija materijala je obavezna. Ona je glavna zaštita od lažnih narudžbi i omogućuje provjeru klase prije polaska.
Zadaci:
`KorakFotografije.tsx`:
kupac dodaje od 1 do 5 fotografija
`accept="image/\*"` nudi kameru ili galeriju
prikazuju se sličice s mogućnošću brisanja
Prije slanja fotografije se smanjuju u pregledniku (`browser-image-compression`, najviše 1600 px i oko 0,3 MB). Time se brišu i GPS podaci iz slike.
`src/app/api/narudzbe/upload/route.ts` vraća novi `id` narudžbe i potpisane linkove za upload (`createSignedUploadUrl`). Fotografije idu na putanju `narudzbe/{id}/{n}.jpg`.
Preglednik šalje fotografije izravno u Supabase Storage.
Bucket `fotografije` mora biti privatan, s ograničenjem na 2 MB i samo `image/jpeg`.
Rezultat: Fotografija od 12 MB s mobitela završava u Storageu kao datoteka od oko 300 KB. Kupac ne može dalje bez barem jedne fotografije.
Napomena: Ne šalji fotografije kroz Next.js server. Vercel prima najviše 4,5 MB po zahtjevu, a serverske akcije zadano samo 1 MB.
1.5 Narudžba — lokacija i termin
Opis: Kupac bira mjesto s popisa, upisuje ulicu i željeni dan. Iz tih podataka Vedran slaže ture.
Zadaci:
`src/app/api/naselja/route.ts`: `GET ?q=kopr` vraća do 10 naselja s općinom i županijom.
`KorakLokacija.tsx`:
pretraga naselja
ulica i kućni broj
gumb "Koristi moju lokaciju" (GPS, nije obavezan)
napomena za vozača
Ako je naselje izvan pokrivenih županija, kupac vidi poruku "Trenutno ne dolazimo na vaše područje" i telefon, bez mogućnosti nastavka.
Kupac bira željeni datum u "živom" kalendaru (najranije sutra) i dio dana (jutro, popodne ili svejedno).
Kalendar s bodovima (dogovoreno s Mišelom 13. 11. 2026.):
Polazište je uvijek Reka kod Koprivnice (Starogradska 35, 48000 Reka). Za izračun se koriste koordinate naselja Reka iz tablice `naselja`, a ne geokodirana adresa (bez vanjskog servisa, razlika je manja od 1 km).
Udaljenost je zračna (haversine) od Reke do naselja kupca. Cestom je otprilike 1,5 puta više, pa su granice preračunate na zračnu udaljenost:
do 30 km = 1 bod (4 narudžbe u danu: Koprivnica, Križevci, Bjelovar, Đurđevac)
30–90 km = 2 boda (2 u danu: Varaždin, Čakovec, Zagreb, Virovitica, Sisak)
preko 90 km = 4 boda (cijeli dan: Požega, Karlovac, Slavonski Brod, Osijek, Vukovar, Rijeka)
Kapacitet dana je 4 boda. Granice i kapacitet su postavke u bazi koje Vedran mijenja u adminu (1.11), a ne konstante u kodu.
Dan zauzimaju narudžbe sa statusom `nova` i `potvrdjena`. Otkazivanjem se mjesto oslobađa.
Zatvoreni su nedjelje, hrvatski državni blagdani (uključivo Uskrs, Uskrsni ponedjeljak i Tijelovo, koji se računaju) i dani koje Vedran ručno zatvori.
Kalendar se prikazuje tek nakon odabira naselja, jer isti dan može biti slobodan za kupca iz blizine, a pun za kupca iz Osijeka. Kupac nikad ne vidi tuđe narudžbe ni njihov broj. Kalendar ima četiri stanja (dopuna dogovorena s Mišelom u 1.6): zeleno = slobodan dan bez narudžbi, žuto = već ima narudžbi, ali ima mjesta, prekriženo = popunjeno (i dani koje Vedran zatvori), sivo = nedjelje i blagdani. Žute dane daje funkcija `dani_s_narudzbama(od, do)`.
Migracija u ovom koraku:
tablica `postavke_kalendara` (jedan redak: `baza_naselje_id`, `kapacitet_dana`, granice u km i bodovi)
tablica `zatvoreni_dani` (`datum date` primarni ključ, `razlog`)
u `narudzbe` novi stupci: `datum_odvoza date` (dan koji zauzima kapacitet; pri narudžbi = `zeljeni_datum`, a Vedran ga može promijeniti pri potvrdi), `udaljenost_km numeric(6,1)`, `bodovi smallint` (spremaju se u trenutku narudžbe, pa kasnija promjena granica ne mijenja stare narudžbe) i `redoslijed integer` (za planer, 1.8)
Postgres funkcija `slobodni_dani(naselje_id, od, do)` vraća dane na koje stane narudžba tog kupca.
`src/app/api/kalendar/route.ts`: `GET ?naselje=ID` vraća slobodne dane za idućih 30 dana.
`src/lib/blagdani.ts`: popis blagdana za godinu (Uskrs se računa).
Rezultat: Lokacija je uvijek povezana s naseljem iz baze, a GPS se sprema kad ga kupac dopusti. Kupac ne može odabrati pun, zatvoren ili neradni dan.
Napomena: Pretraga mora ignorirati kvačice, tako da "cakovec" pronađe "Čakovec". U bazi za to uključi ekstenziju `unaccent`.
Mnoga naselja imaju isto ime, pa u rezultatima uvijek prikaži i općinu.
Datum spremaj kao tip `date`, tako ga razlika vremenskih zona ne može pomaknuti na prethodni dan. "Sutra" se računa u zoni Europe/Zagreb.
1.6 Narudžba — kontakt i slanje
Opis: Zadnji korak: kontakt, privola, provjera protiv botova i spremanje narudžbe.
Zadaci:
`KorakKontakt.tsx` sadrži:
ime i prezime
mobitel
kvačicu privole (nije unaprijed označena) s linkom na politiku privatnosti
sažetak narudžbe s okvirnim iznosom
Cloudflare Turnstile
`src/app/api/narudzbe/route.ts` (POST) radi redom:
provjerava Turnstile token
provjerava podatke Zod shemom
normalizira broj mobitela
ponovno računa procjenu na serveru
provjerava da fotografije postoje u Storageu
upisuje sve kroz Postgres funkciju `kreiraj\_narudzbu` (narudžba, stavke i fotografije u jednoj transakciji)
`kreiraj\_narudzbu` sama računa udaljenost i bodove iz naselja (ne vjeruje pregledniku) i unutar iste transakcije, uz zaključavanje tog dana (`pg\_advisory\_xact\_lock`), ponovno provjerava ima li mjesta. Ako dva kupca istovremeno uzmu zadnje mjesto, drugi dobiva poruku "Taj dan se upravo popunio, odaberite drugi" i vraća se na kalendar.
`src/app/(javno)/naruci/hvala/page.tsx` prikazuje broj narudžbe i poruku da će kupca nazvati radi dogovora termina.
Gumb za slanje je onemogućen dok slanje traje.
Rezultat: Narudžba s mobitela završava u bazi sa svim stavkama i fotografijama. Dvostruki klik ne stvara dvije narudžbe.
Napomena: Mobitel uvijek spremaj u istom obliku (`+38591…`), bez obzira kako ga kupac upiše ("091/234-5678", "+385 91…").
`id` iz koraka 1.4 je jedinstven, pa drugi isti zahtjev baza odbija. Server nikad ne vjeruje iznosu iz preglednika.
1.7 Email obavijest Vedranu
Opis: Svaka nova narudžba stiže Vedranu na email, s gumbom koji otvara narudžbu u adminu.
Zadaci:
U Resendu dodaj Vedranovu domenu, a kod registrara upiši DNS zapise (SPF i DKIM). Potvrda može potrajati.
`src/emails/NovaNarudzba.tsx` (React Email) sadrži:
broj narudžbe i mjesto
materijale s kilogramima
željeni termin i okvirni iznos
gumb "Otvori narudžbu"
Email se šalje iz `api/narudzbe/route.ts` nakon uspješnog upisa. Primatelji su upisani u varijabli `OBAVIJEST\_EMAILOVI`.
Naslov emaila izgleda ovako: Nova narudžba #2026-0042 — Koprivnica, bakar 20 kg.
Na Vedranovom mobitelu postavi poseban zvuk obavijesti za ovog pošiljatelja.
Rezultat: Vedranu na mobitel unutar minute stiže email koji otvara pravu narudžbu.
Napomena: Ako slanje emaila ne uspije, narudžba se svejedno mora spremiti. Zato slanje stavi u `try/catch` i grešku zapiši u log.
Šalji s adrese na Vedranovoj domeni (npr. `narudzbe@…hr`), nikad s Gmaila.
Broj mobitela kupca ne stavljaj u naslov emaila, jer se naslov vidi na zaključanom zaslonu.
1.8 Admin — popis narudžbi
Opis: Ovo je Vedranov glavni ekran: što je novo, kamo ide danas i što je gotovo.
Zadaci:
`src/app/(admin)/admin/narudzbe/page.tsx` ima četiri kartice:
Nove
Raspored (potvrđene, grupirane po danu, s "Danas" na vrhu)
Realizirane
Otkazane
Kartica narudžbe prikazuje:
broj i boju statusa
mjesto i županiju
materijale
ukupno kg i okvirni iznos za isplatu (procjena; dodano u 1.8)
termin i koliko je narudžba stara ("prije 2 h")
Kartica "Nove" je lista za potvrdu (dogovoreno 13. 11. 2026.). Narudžbe su poredane od najnovije (na vrhu) prema starijima (izmjena u 1.8), a svaka kartica uz gore navedeno ima:
ime kupca, materijale s količinama i male sličice fotografija
gumbe Nazovi (`tel:`), Potvrdi i Otkaži izravno na kartici, bez otvaranja detalja (dijalozi iz 1.9)
Kartica "Raspored" je planer potvrđenih kupaca:
grupirano po `datum\_odvoza`, uz svaki dan zbroj bodova (npr. "3/4")
na vrhu svakog dana sažetak (dodano u 1.8, "Raspored = planer prikupa"): broj kupaca, ukupno kg i okvirna gotovina za isplatu svima; pojedinačno ukupno kg i okvirni iznos je na svakoj narudžbi
za svakog kupca: ime, adresa (naselje + ulica), materijali s količinama, dio dana, napomena za vozača, gumbi Nazovi i Navigiraj
redoslijed unutar dana je automatski (jutro → popodne → svejedno, pa od najbližeg prema najdaljem od Reke), a Vedran ga strelicama gore/dolje mijenja. Ručni redoslijed sprema se u `narudzbe.redoslijed` (akcija `pomakni(id, smjer)`).
Status se mijenja na istoj narudžbi, pa nema nikakvog "izvoza" među listama: potvrđena narudžba sama prelazi iz "Nove" u "Raspored".
Popis uživo (dogovoreno 13. 11. 2026.):
Supabase Realtime (`postgres\_changes` na tablici `narudzbe`) u klijentskoj komponenti: na svaku promjenu poziva `router.refresh()`. Migracija dodaje tablicu `narudzbe` u publikaciju `supabase\_realtime`. Realtime poštuje RLS, pa promjene vide samo prijavljeni korisnici.
Osvježavanje kad se aplikacija vrati na ekran (`visibilitychange`), jer Android u pozadini prekida vezu.
Gumb "Osvježi" na vrhu popisa (najmanje 48 px), uz natpis "Osvježeno prije X min".
Mala oznaka stanja veze: zelena = uživo, siva = prekinuto (tada Vedran koristi gumb Osvježi).
Kad je admin zatvoren, o novim narudžbama obavještavaju email (1.7) i push (2.5).
Brojač novih narudžbi i pretraga po imenu, mobitelu ili mjestu.
Prikazuje se zadnjih 50 narudžbi, a ostale preko gumba "Učitaj još".
Rezultat: Vedran na mobitelu u dva dodira vidi današnje odvoze i nove narudžbe. Nova narudžba se u otvorenom adminu pojavi sama, u roku od nekoliko sekundi.
Napomena: Popis mora uvijek prikazivati svježe podatke. Ako ga Next.js spremi kao statičnu stranicu, Vedran vidi staro stanje. Provjeri to na Vercelu, ne samo lokalno.
1.9 Admin — detalji narudžbe i statusi
Opis: Sve što Vedranu treba za poziv i dolazak nalazi se na jednom ekranu.
Zadaci:
`src/app/(admin)/admin/narudzbe/\[id]/page.tsx` prikazuje:
ime kupca i gumb Nazovi (`tel:`)
adresu i gumb Navigiraj (Google Maps s koordinatama ili adresom)
fotografije, koje se otvaraju preko cijelog zaslona
stavke, termin i napomene
U `src/app/(admin)/admin/narudzbe/akcije.ts` napravi tri akcije:
`potvrdi(id, datum, dioDana, vrijeme?)`: dijalog je unaprijed popunjen danom koji je kupac odabrao. Vedran ga može promijeniti ako su se na telefonu drukčije dogovorili. Novi dan se provjerava prema kapacitetu (kao u 1.5), a Vedran svjesno može i prekoračiti kapacitet, uz upozorenje. Sprema `datum\_odvoza`, `dio\_dana` i, ako je upisano točno vrijeme, `dogovoreni\_termin`.
`otkazi(id, razlog)`
`spremiNapomenu(id, tekst)`
`promijeniDan(id, datum)` za već potvrđenu narudžbu (dogovoreno u 1.8: Raspored je planer prikupa, pa se narudžba u dan dodaje potvrdom, a premješta ovom akcijom). Ista provjera kapaciteta kao kod potvrde, a `redoslijed` se poništava (`null`), pa narudžba u novom danu dobiva automatsko mjesto. (Izvedeno u 1.9 kao `promijeniDan(id, { datum, dioDana?, vrijeme? })`: isti dijalog mijenja i dio dana i vrijeme, a bez vremena se `dogovoreni_termin` briše.)
Razlog otkaza bira se iz izbornika:
lažna narudžba
kupac odustao
ne javlja se
premala količina
izvan područja
ostalo
Gumbi Potvrdi i Otkaži (s istim dijalozima) dodaju se i na karticu u "Nove" (1.8 ima samo Nazovi).
Planer rute (dogovoreno s Mišelom u 1.8, "ruta = jedan dan"):
tab "Raspored" dobiva dva pogleda: "Planer rute" (zadani, odluka iz 1.9) i "Svi dani" (ovo što je napravljeno u 1.8)
Planer rute prikazuje jedan dan (zadano danas, strelice ◀ ▶ i odabir dana): sažetak dana (kupci, bodovi "3/4", ukupno kg, okvirna gotovina), narudžbe tog dana s redoslijedom (strelice iz 1.8) i ukupnim po narudžbi
gumb "Dodaj narudžbu u ovaj dan" otvara popis ostalih potvrđenih narudžbi (s njihovim danom) i premješta odabranu u taj dan preko `promijeniDan` (provjera kapaciteta, uz upozorenje može i preko)
gumb "Makni iz dana" otvara isti dijalog promjene dana (narudžba uvijek ima dan; nova se prvo potvrdi)
nema nove tablice: ruta dana = potvrđene narudžbe s tim `datum\_odvoza`
Rezultat: Vedran iz narudžbe zove kupca te potvrđuje termin ili otkazuje s razlogom. Novi status se odmah vidi u popisu. U planeru rute za odabrani dan dodaje i premješta narudžbe i odmah vidi koliko kila i gotovine treba za taj dan.
Napomena: Fotografije prikazuj preko potpisanih linkova (`createSignedUrls`, s trajanjem od jednog sata), jer je bucket privatan.
Razlog "lažna narudžba" kasnije pokazuje radi li zaštita, pa ga nemoj preskakati.
1.10 Admin — realizacija narudžbe
Opis: Nakon vaganja Vedran upisuje stvarne vrijednosti. To je temelj cijele analitike, a cilj je da traje manje od 30 sekundi.
Zadaci:
Napravi `src/app/(admin)/admin/narudzbe/\[id]/realizacija/page.tsx`.
Stavke su unaprijed popunjene prijavljenim vrijednostima, a Vedran mijenja samo ono što odstupa:
kilograme (veliko polje, decimalna tipkovnica)
stvarnu klasu
cijenu po kg (zadano je današnja cijena iz cjenika)
Gumb "Dodaj stavku" služi za materijal koji kupac nije prijavio.
Iznosi se računaju uživo. Gumb Spremi i označi realiziranom pokreće akciju `realiziraj(id, stavke)`.
Gumb "Uredi realizaciju" omogućuje ispravak nakon spremanja.
(Izvedeno u 1.10: stavka dodana pri vaganju ima `kg\_prijavljeno = 0`, a sprema se kroz Postgres funkciju `realiziraj\_narudzbu` u jednoj transakciji. Kartica u rasporedu dobila je i gumb "Realiziraj".)
Rezultat: Svaka realizirana narudžba ima prijavljene i stvarne vrijednosti za svaku stavku.
Napomena: Ovaj ekran testiraj s Vedranom na njegovom mobitelu, na terenu. Ako mu je spor, preskakat će ga i analitika postaje bezvrijedna.
Gumbi moraju biti barem 48 px visoki, a skrolanja treba biti što manje.
1.11 Admin — uređivanje cjenika
Opis: Cijena se mijenja u nekoliko sekundi, bez programera i bez novog deploya.
Zadaci:
`src/app/(admin)/admin/cjenik/page.tsx` prikazuje materijale i klase. Uz svaku cijenu su polje za unos, gumb Spremi i datum zadnje promjene.
Klase se mogu dodavati, uključivati i isključivati, a opisi uređivati.
Akcija `spremiCijenu(klasaId, cijena)` nakon spremanja poziva `revalidatePath('/cjenik')` i `revalidatePath('/')`.
Rezultat: Nova cijena odmah se vidi na javnom cjeniku i u kalkulatoru.
Napomena: Next.js javne stranice sprema kao gotove. Bez `revalidatePath` kupci satima vide staru cijenu.
Lokalno se to ne vidi, pa provjeri na Vercelu.
Dodatak (dogovoreno 13. 11. 2026.): `src/app/(admin)/admin/postavke/page.tsx` dobiva postavke kalendara iz 1.5:
kapacitet dana (bodovi) i granice udaljenosti s bodovima
zatvaranje i otvaranje pojedinih dana (godišnji, kvar kamiona) s razlogom
Akcije `spremiPostavkeKalendara` i `zatvoriDan(datum, razlog)` / `otvoriDan(datum)`.
1.12 Instalacija admina na mobitel
Opis: Admin dobiva ikonu na Androidu i otvara se kao aplikacija, bez adresne trake.
Zadaci:
Napravi `public/admin.webmanifest` s ovim postavkama:
naziv aplikacije
`start\_url: /admin/narudzbe`
`scope: /admin`
`display: standalone`
ikone od 192 i 512 px (i "maskable" verzija)
Manifest poveži samo u admin layoutu (`metadata.manifest`). Kupci ga tako nikad ne vide.
Na Vedranovom mobitelu u Chromeu otvori izbornik i odaberi Instaliraj aplikaciju.
Rezultat: Na Vedranovom početnom zaslonu je ikona koja otvara popis narudžbi, a prijava ostaje zapamćena.
Napomena: Na nekim mobitelima (npr. Samsung) zadani preglednik nije Chrome i izbornik izgleda drukčije. Instaliraj iz Chromea.
1.13 Politika privatnosti i kolačići
Opis: Zakonski minimum prije prvog oglasa: politika privatnosti i banner koji traži pristanak prije praćenja.
Zadaci:
Od Vedrana uzmi ove podatke:
naziv obrta ili tvrtke
OIB i adresu
email za upite o podacima
potvrdu roka čuvanja narudžbi: dogovoreno 24 mjeseca, nakon toga se osobni podaci brišu (anonimizacija, vidi 2.8)
Napravi `src/app/(javno)/politika-privatnosti/page.tsx`. Politika navodi:
koji se podaci prikupljaju (ime, mobitel, lokacija, fotografije), zašto i koliko dugo
s kim se dijele (Supabase, Vercel, Resend, Meta)
prava kupca i kontakt
posebno poglavlje o kolačićima
Postavi `vanilla-cookieconsent` na hrvatskom s dvije kategorije: Nužni i Marketing (Meta Pixel).
U podnožje dodaj link "Postavke kolačića".
Rezultat: Banner se pojavljuje pri prvom posjetu, a politika je dostupna iz podnožja i iz forme.
Napomena: Gumb "Odbij" mora biti jednako vidljiv kao "Prihvati".
Tekst politike neka pregleda netko tko se bavi GDPR-om. Provjeri treba li vam ugovor o obradi podataka, jer ti kao izrađivač imaš pristup podacima.
1.14 Meta Pixel i Conversions API
Opis: Meta mora znati koji oglas donosi narudžbe. Inače optimizira prema klikovima umjesto prema narudžbama.
Zadaci:
`components/javno/MetaPixel.tsx` učitava Pixel tek nakon pristanka na Marketing i šalje `PageView` pri promjeni stranice.
Na `/naruci/hvala` šalje se događaj `Lead` s `eventID` jednakim id-u narudžbe.
`src/lib/meta-capi.ts` šalje `Lead` sa servera, ali samo ako je kupac pristao. Šalje:
isti `event\_id`
SHA-256 hash mobitela
kolačiće `fbc` i `fbp`
IP adresu i user agent
Varijable okruženja: `NEXT\_PUBLIC\_META\_PIXEL\_ID` i `META\_CAPI\_TOKEN`.
Sve provjeri u Events Manageru, pod Test Events.
Rezultat: Svaka narudžba vidi se u Events Manageru jednom kao `Lead`, iz preglednika i sa servera.
Napomena: Bez istog `event\_id` Meta broji svaku narudžbu dvaput.
Mobitel prije hashiranja normaliziraj u oblik `38591…` (bez + i razmaka), inače ga Meta ne prepozna.
1.15 Testiranje i puštanje uživo
Opis: Prelazimo na plaćene planove i pravu domenu, prolazimo cijeli tok s Vedranom i tek onda palimo oglase.
Zadaci:
Supabase produkcija:
projekt `otkup-prod` na Pro planu, regija Frankfurt, s naplatom na Vedrana
`supabase db push` i početni podaci
dva korisnika, isključena registracija, privatan bucket
Vercel produkcija:
Pro plan i produkcijske varijable
spoji domenu (s `www` i bez `www`)
U Turnstile dodaj pravu domenu.
Na Android mobitelu preko 4G prođi cijeli tok:
narudžba s tri fotografije
email stiže
potvrda termina
realizacija
promjena cijene vidi se na sajtu
banner kolačića radi
`Lead` se vidi u Events Manageru
Odvoji 30 minuta s Vedranom: instalacija, prijava i jedna probna narudžba od početka do kraja.
Na kraju obriši probne narudžbe.
Rezultat: Sajt radi na Vedranovoj domeni, a Vedran sam obrađuje narudžbu od emaila do realizacije. Oglasi mogu krenuti.
Napomena: Besplatni Supabase projekt gasi se nakon 7 dana bez aktivnosti, pa produkcija mora biti na Pro planu. Provjeri da su uključene dnevne sigurnosne kopije.
<div style="page-break-after: always;"></div>
Faza 2 — Proširenja i poliranje
2.1 Analitika — izračuni u bazi
Opis: Brojke računa baza, a ne preglednik. Tako su brze i točne i kad bude tisuće narudžbi.
Zadaci:
Napravi migraciju s funkcijama:
`analitika\_sazetak(od, do)`
`analitika\_po\_materijalu`
`analitika\_po\_mjesecu`
`analitika\_po\_zupaniji`
`analitika\_otkazi`
`analitika\_po\_kampanji`
Dodaj izračun odstupanja prijavljeno/stvarno po materijalu, tj. koliko kupci precjenjuju količinu.
Rezultat: Svaka funkcija vraća točne brojke za zadano razdoblje. Provjeri to ručnim zbrajanjem na deset narudžbi.
Napomena: Pogledi (views) moraju imati `security\_invoker = true`, inače zaobilaze RLS i podaci su dostupni bilo kome.
Stvarne vrijednosti postoje samo za realizirane narudžbe, pa procjene i stvarne brojke nikad ne zbrajaj zajedno.
2.2 Analitika — nadzorna ploča
Opis: Ti i Vedran na jednom ekranu vidite stanje posla za odabrano razdoblje.
Zadaci:
Napravi `src/app/(admin)/admin/analitika/page.tsx`.
Filter razdoblja: ovaj mjesec, prošli mjesec, ova godina ili vlastito razdoblje.
Kartice s brojkama: broj narudžbi, stopa realizacije, isplaćeno ukupno i ukupno kg.
Grafikoni (Recharts):
narudžbe po mjesecu
kg po materijalu, prijavljeno i stvarno
otkazi po razlogu
narudžbe po županiji
Tablica narudžbi po kampanji.
Rezultat: Analitika radi na mobitelu za bilo koje razdoblje.
Napomena: Recharts radi samo u komponentama s `'use client'`. Podatke dohvati na serveru i proslijedi ih grafikonu.
Na uskom ekranu prikaži najviše 6 stupaca, a ostalo spoji u "Ostalo".
2.3 Analitika — karta
Opis: Narudžbe se prikazuju na karti, pa se vidi odakle stiže posao.
Zadaci:
Instaliraj `react-leaflet` i koristi OpenStreetMap pločice.
Točke dolaze iz GPS-a ili iz koordinata naselja, a boja ovisi o statusu.
Filter po razdoblju i materijalu.
Bliske točke se grupiraju (marker cluster).
Rezultat: Karta Hrvatske s narudžbama radi i na mobitelu.
Napomena: Leaflet ne radi na serveru, pa kartu učitaj s `dynamic(..., { ssr: false })`.
Obavezno uvezi Leaflet CSS i prikaži OSM atribuciju.
2.4 Izvoz u CSV
Opis: Brojke za vaš međusobni obračun izvoze se u Excel jednim klikom.
Zadaci:
Napravi `src/app/api/admin/izvoz/route.ts` (GET, `?od=\&do=`), koji izvozi realizirane narudžbe po stavkama.
Na analitiku dodaj gumb "Preuzmi CSV".
Rezultat: Datoteka se u Excelu otvara uredno, s ispravnim kvačicama i stupcima.
Napomena: Excel na hrvatskim postavkama očekuje `;` kao razdjelnik i UTF-8 s BOM-om.
Ruta mora provjeriti prijavu.
2.5 Push obavijesti
Opis: Nova narudžba stvara obavijest na Vedranovom mobitelu u nekoliko sekundi, i kad je aplikacija zatvorena.
Zadaci:
Napravi `public/sw.js`, koji prima obavijest i na klik otvara narudžbu.
Generiraj VAPID ključeve: `npx web-push generate-vapid-keys`.
Napravi tablicu `push\_pretplate` i rutu `src/app/api/push/pretplata/route.ts`.
Na stranicu `src/app/(admin)/admin/postavke/page.tsx` dodaj gumb "Uključi obavijesti".
Obavijest se šalje (`web-push`) iz `api/narudzbe`, uz email.
Rezultat: Obavijest stiže unutar nekoliko sekundi, a email ostaje kao rezerva.
Napomena: Pretplata prestaje vrijediti kad Vedran promijeni mobitel ili obriše podatke Chromea. Kad slanje vrati grešku 404 ili 410, obriši tu pretplatu.
Xiaomi i Samsung zbog štednje baterije zna kasniti s obavijestima. Isključi štednju baterije za Chrome.
2.6 SEO stranice za Google
Opis: Kupci počinju dolaziti i iz Google pretrage, ne samo s oglasa.
Zadaci:
Napravi stranice po materijalu i po županiji:
`src/app/(javno)/otkup/\[materijal]/page.tsx`
`src/app/(javno)/podrucje/\[zupanija]/page.tsx`
Napravi `src/app/sitemap.ts` i `src/app/robots.ts`, a admin i `/prijava` označi s `noindex`.
Dodaj strukturirane podatke (LocalBusiness).
Prijavi sajt u Google Search Console i neka Vedran otvori Google Business profil.
Rezultat: Stranice se pojavljuju u Google pretrazi za materijale i područja.
Napomena: Desetke stranica s istim tekstom i samo promijenjenim imenom grada Google tretira kao smeće. Svaka stranica treba stvarni sadržaj: cijene, kako prepoznati klase i što se prima.
2.7 Praćenje grešaka
Opis: Saznaješ za grešku prije nego što te Vedran nazove.
Zadaci:
Pokreni `npx @sentry/wizard -i nextjs`.
Uključi obavijest na email za nove greške.
Postavi `sendDefaultPii: false`.
Rezultat: Svaka greška na sajtu ili serveru stiže ti emailom, s mjestom u kodu.
Napomena: Pri registraciji odaberi EU regiju podataka i dodaj Sentry u politiku privatnosti.
2.8 Održavanje podataka
Opis: Napuštene fotografije i stari osobni podaci brišu se sami, a analitika ostaje.
Zadaci:
Napravi `src/app/api/cron/ciscenje/route.ts` i u `vercel.json` postavi da se pokreće svaku noć. Ruta radi dvije stvari:
briše fotografije bez narudžbe starije od 24 h
anonimizira narudžbe starije od 24 mjeseca: briše ime, mobitel, ulicu, GPS i fotografije, a zadržava naselje, materijale i iznose
Rezultat: Storage ne raste od napuštenih narudžbi, a rok čuvanja iz politike privatnosti se stvarno poštuje.
Napomena: Ruta mora provjeravati `CRON\_SECRET`, inače je može pokrenuti bilo tko.
Prvo testiraj na razvojnoj bazi, jer se brisanje ne može poništiti.
<div style="page-break-after: always;"></div>
Definicija gotovog po fazama
Faza	Gotovo kada
0	Prazan, zaštićen sajt na Vercelu ima bazu s podacima, prijavu za dvije osobe i dizajn.
1	Kupac s oglasa naruči odvoz s fotografijom, Vedran dobije email, potvrdi termin, odradi odvoz i upiše stvarne vrijednosti, a Meta vidi narudžbu.
2	Analitika, karta, CSV, push obavijesti, Google stranice i automatsko čišćenje rade bez tvoje ručne intervencije.
Mapa stranica i ruta
Javne stranice
Ruta	Sadržaj	Faza
`/`	Početna stranica	1
`/cjenik`	Cjenik i kalkulator	1
`/naruci`	Narudžba u 4 koraka	1
`/naruci/hvala`	Potvrda s brojem narudžbe	1
`/politika-privatnosti`	Privatnost i kolačići	1
`/otkup/\[materijal]`	SEO stranica materijala	2
`/podrucje/\[zupanija]`	SEO stranica područja	2
`/sitemap.xml`, `/robots.txt`	Za Google	2
Admin (samo prijavljeni)
Ruta	Sadržaj	Faza
`/prijava`	Prijava	0
`/admin/narudzbe`	Nove (lista za potvrdu) · Raspored (planer) · Realizirane · Otkazane	1
`/admin/narudzbe/\[id]`	Detalji, poziv, navigacija, statusi	1
`/admin/narudzbe/\[id]/realizacija`	Upis stvarnih vrijednosti	1
`/admin/cjenik`	Uređivanje cijena i klasa	1
`/admin/analitika`	Nadzorna ploča i karta	2
`/admin/postavke`	Postavke kalendara (1), push obavijesti (2)	1, 2
API rute
Metoda i ruta	Namjena	Faza
`GET /api/naselja?q=`	Pretraga naselja	1
`GET /api/kalendar?naselje=`	Slobodni dani za kupca iz tog naselja	1
`POST /api/narudzbe/upload`	Id narudžbe i linkovi za fotografije	1
`POST /api/narudzbe`	Spremanje narudžbe, email, Meta CAPI	1
`GET /api/admin/izvoz`	CSV izvoz	2
`POST /api/push/pretplata`	Spremanje push pretplate	2
`GET /api/cron/ciscenje`	Noćno čišćenje	2
Serverske akcije (admin): `potvrdi`, `otkazi`, `spremiNapomenu`, `pomakni`, `realiziraj`, `spremiCijenu`, `spremiKlasu`, `spremiPostavkeKalendara`, `zatvoriDan`, `otvoriDan`, `odjava`.
Dizajn sistem
Boje
Naziv	HEX	Upotreba
Bakar	`#B4531F`	Primarni gumbi, naglasci
Bakar tamni	`#8F3F15`	Hover i pritisnuti gumb
Grafit	`#1C1917`	Tekst, zaglavlje
Sivi tekst	`#57534E`	Sporedni tekst
Pozadina	`#FAFAF9`	Pozadina stranice
Površina	`#FFFFFF`	Kartice, polja
Rub	`#E7E5E4`	Rubovi, razdjelnici
Greška	`#B91C1C`	Greške u formi
Boje statusa (oznake u adminu)
Status	HEX
Nova	`#1D4ED8` (plava)
Potvrđena	`#A16207` (jantar)
Realizirana	`#15803D` (zelena)
Otkazana	`#78716C` (siva)
Tipografija
Naslovi: Barlow Semi Condensed, 600–700. Uzak i "industrijski", s podrškom za hrvatska slova.
Tekst: Inter, 400 / 500 / 600.
Veličine na mobitelu:
H1: 28 px
H2: 22 px
H3: 18 px
tijelo: 16 px
sitno: 14 px
Razmak redaka: 1,5.
Brojevi: u tablicama i iznosima `tabular-nums`, da se stupci poravnaju.
Razmaci i oblici
Mreža od 4 px.
Rubni razmak na mobitelu je 16 px.
Zaobljenja: 8 px za gumbe i polja, 12 px za kartice.
Dodirne površine u adminu su najmanje 48 px.
Primarni gumb na mobitelu ide preko cijele širine.
Sjene (samo dvije)
Kartica: `0 1px 2px rgba(0,0,0,.06)`.
Dijalog / donji panel: `0 10px 30px rgba(0,0,0,.15)`.
Animacije
Hover i otvaranje: 150–200 ms, ease-out.
Prijelaz između koraka narudžbe: fade + pomak 8 px, 200 ms.
Nema animacija pri učitavanju stranice.
Poštuje se postavka `prefers-reduced-motion`.
Česte greške i rješenja
Problem	Rješenje
Tajni Supabase ključ procurio u preglednik	Nikad `NEXT\_PUBLIC\_`; `import 'server-only'` u `lib/supabase/admin.ts`
Tablica dostupna svima s javnim ključem	RLS na svakoj tablici; provjera u Supabase Security Advisoru
Upload fotografije pada (413)	Izravno u Storage potpisanim linkom, ne kroz server
Zarez u broju ne radi	`inputMode="decimal"` + `parseBroj()`
Datum pomaknut za dan	Tip `date` za dane; prikaz u zoni Europe/Zagreb
Stara cijena nakon promjene	`revalidatePath` nakon spremanja cjenika
Kvačice drugim fontom	`subsets: \['latin', 'latin-ext']`
"cakovec" ne nalazi Čakovec	Ekstenzija `unaccent` u pretrazi
Dvije iste narudžbe	Jedinstveni `id` + onemogućen gumb tijekom slanja
Narudžba bez stavki nakon greške	Upis kroz jednu Postgres funkciju (transakcija)
Email ne stiže ili ide u spam	Vlastita domena, SPF i DKIM, provjera u Resend logu
Meta broji narudžbe dvaput	Isti `event\_id` u Pixelu i CAPI-ju
Pixel radi prije pristanka	Učitavanje tek nakon klika na Prihvati
Promijenjena varijabla ne djeluje	Redeploy na Vercelu
Sajt "mrtav" nakon tjedan dana	Produkcija na Supabase Pro (bez gašenja)
Produkcijska baza ≠ razvojna	Promjene isključivo kroz migracije
Prijava "radi", a nije sigurna	`getUser()` na serveru, provjera u svakoj akciji
Greška "hydration mismatch" s datumima	Datume formatiraj na serveru ili u istoj zoni
Leaflet: `window is not defined`	`dynamic(..., { ssr: false })`
Napomene o zavisnostima
Korak	Ovisi o
0.2	0.1
0.3	0.2
0.4	0.3
0.5	0.4
0.6	0.3
0.7	0.2
0.8	0.2, 0.3
1.1	0.5, 0.7
1.2	1.1
1.3	1.1
1.4	1.3, 0.4
1.5	1.3, 0.5
1.6	1.4, 1.5
1.7	1.6, 0.8
1.8	0.6, 1.6
1.9	1.8
1.10	1.9
1.11	0.6, 1.1
1.12	0.6, 0.8
1.13	0.7
1.14	1.6, 1.13
1.15	svi koraci Faze 1
2.1	1.10
2.2–2.4	2.1 (2.3 i 0.5)
2.5	1.7, 1.12
2.6	0.5, 1.1, 1.2
2.7	0.8
2.8	1.4, 1.13
Kritični put (svaki zastoj ovdje pomiče kraj projekta):
0.3 → 0.4 → 0.5 → 1.1 → 1.3 → 1.4 / 1.5 → 1.6 → 1.8 → 1.9 → 1.10 → 1.15
Što se može raditi paralelno:
0.6 i 0.7 bilo kojim redom.
1.11, 1.12 i 1.13 dok čekaš DNS potvrdu za email (1.7).
Podatke za 0.5 (cijene, opisi klasa) i 1.13 (podaci o obrtu) traži od Vedrana već prvi dan, jer o njima ovisi tempo.