import type { Metadata } from 'next'
import { GumbPostavkiKolacica } from '@/components/javno/gumb-postavki-kolacica'
import {
  EMAIL_PRIVATNOST,
  NAZIV,
  OBRT_ADRESA,
  OBRT_NAZIV,
  OBRT_OIB,
  POLITIKA_VRIJEDI_OD,
  TELEFON_LINK,
  TELEFON_PRIKAZ,
} from '@/lib/kontakt'

// Bez openGraph: Next.js bi ga zamijenio u cijelosti i nestala bi slika za dijeljenje (vidi 1.2).
export const metadata: Metadata = {
  title: 'Politika privatnosti',
  description: `Koje osobne podatke ${NAZIV} prikuplja pri narudžbi odvoza, zašto i koliko ih dugo čuva, koja su vaša prava i kako se koriste kolačići.`,
}

// Statična stranica: politika privatnosti i poglavlje o kolačićima.
// Podaci o obrtu dolaze iz src/lib/kontakt.ts (zasad su PRIVREMENI).
export default function PolitikaPrivatnostiStranica() {
  return (
    <article className="flex max-w-prose flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1>Politika privatnosti</h1>
        <p className="text-muted-foreground">Vrijedi od {POLITIKA_VRIJEDI_OD}</p>
        <p>
          Ovdje jednostavno objašnjavamo koje podatke prikupljamo kad naručite odvoz, zašto su nam
          potrebni, koliko ih dugo čuvamo te kako možete dobiti uvid u njih, ispraviti ih ili
          zatražiti njihovo brisanje.
        </p>
      </div>

      <Poglavlje naslov="1. Tko obrađuje vaše podatke">
        <p>Voditelj obrade osobnih podataka je:</p>
        <ul className="flex flex-col gap-1">
          <li className="font-medium">{OBRT_NAZIV}</li>
          <li>OIB: {OBRT_OIB}</li>
          <li>Adresa: {OBRT_ADRESA}</li>
          <li>
            Telefon:{' '}
            <a href={TELEFON_LINK} className={LINK}>
              {TELEFON_PRIKAZ}
            </a>
          </li>
          <li>
            E-pošta za pitanja o osobnim podacima:{' '}
            <a href={`mailto:${EMAIL_PRIVATNOST}`} className={LINK}>
              {EMAIL_PRIVATNOST}
            </a>
          </li>
        </ul>
      </Poglavlje>

      <Poglavlje naslov="2. Koje podatke prikupljamo">
        <p>Kad naručite odvoz, upisujete:</p>
        <Popis>
          <li>ime i prezime</li>
          <li>broj mobitela</li>
          <li>
            mjesto i ulicu odvoza te, ako to sami odaberete, točan položaj (GPS) s vašega
            mobitela
          </li>
          <li>
            fotografije materijala. Prije slanja smanjujemo ih na vašem uređaju, čime se brišu i
            skriveni podaci o mjestu snimanja.
          </li>
          <li>vrstu i količinu materijala, željeni dan odvoza i napomenu, ako je napišete</li>
        </Popis>
        <p>
          Uz to bilježimo i putem kojeg ste oglasa ili poveznice došli do nas (npr. oznake iz
          oglasa na Facebooku ili Instagramu). Za narudžbu ne trebate otvarati korisnički račun.
          Otkupljeni materijal isplaćujemo u gotovini na licu mjesta, pa ne prikupljamo podatke o
          karticama ni bankovnim računima.
        </p>
      </Poglavlje>

      <Poglavlje naslov="3. Zašto ih koristimo">
        <p>Podatke koristimo samo kako bismo:</p>
        <Popis>
          <li>vas nazvali i dogovorili termin odvoza</li>
          <li>došli na pravu adresu s odgovarajućim vozilom</li>
          <li>unaprijed procijenili materijal na temelju fotografija</li>
          <li>vodili evidenciju otkupa i pratili koji nam oglasi donose narudžbe</li>
        </Popis>
        <p>
          Pravna je osnova vaša privola, koju dajete označavanjem potvrdnog okvira u narudžbi, te
          poduzimanje radnji na vaš zahtjev prije dogovora o otkupu (članak 6. stavak 1. točke a)
          i b) Opće uredbe o zaštiti podataka, GDPR). Broj mobitela ne koristimo za promidžbene
          poruke. Bez tih podataka ne možemo zaprimiti narudžbu. O vama ne donosimo
          automatizirane odluke.
        </p>
      </Poglavlje>

      <Poglavlje naslov="4. Koliko dugo ih čuvamo">
        <p>
          Podatke o narudžbi čuvamo <strong>24 mjeseca</strong>. Nakon toga brišemo ime i
          prezime, broj mobitela, ulicu, položaj (GPS) i fotografije. Ostaju samo podaci po kojima
          vas nije moguće prepoznati (mjesto, vrste i količine materijala, iznosi), a njih
          koristimo isključivo za statistiku poslovanja.
        </p>
      </Poglavlje>

      <Poglavlje naslov="5. S kim ih dijelimo">
        <p>
          Podatke ne prodajemo niti ih ustupamo drugima za njihovo oglašavanje. Koristimo usluge
          sljedećih pružatelja, koji podatke obrađuju u naše ime i prema našim uputama:
        </p>
        <Popis>
          <li>
            <strong>Supabase</strong>: baza podataka i pohrana fotografija; poslužitelji su u
            Frankfurtu (EU)
          </li>
          <li>
            <strong>Vercel</strong>: poslužitelji na kojima radi ova stranica
          </li>
          <li>
            <strong>Resend</strong>: slanje obavijesti o novoj narudžbi na našu adresu e-pošte
          </li>
          <li>
            <strong>Cloudflare</strong> (Turnstile): provjera da narudžbu šalje čovjek, a ne
            robot
          </li>
          <li>
            <strong>Meta</strong> (Facebook, Instagram): samo ako prihvatite marketinške
            kolačiće. U tom slučaju javljamo Meti da je putem oglasa stigla narudžba i šaljemo joj
            broj mobitela u obliku kriptografskog sažetka (engl. hash), iz kojeg se broj ne može
            pročitati.
          </li>
          <li>osoba koja za nas izrađuje i održava ovaj sustav</li>
        </Popis>
        <p>
          Neki od tih pružatelja imaju sjedište u SAD-u. U tom se slučaju prijenos podataka
          temelji na Okviru EU-a i SAD-a za privatnost podataka (EU-U.S. Data Privacy Framework)
          ili na standardnim ugovornim klauzulama Europske komisije.
        </p>
      </Poglavlje>

      <Poglavlje naslov="6. Vaša prava">
        <p>U bilo kojem trenutku možete zatražiti:</p>
        <Popis>
          <li>pristup podacima koje o vama imamo i njihovu presliku</li>
          <li>ispravak netočnih podataka</li>
          <li>brisanje podataka</li>
          <li>ograničenje obrade ili podnijeti prigovor na obradu</li>
          <li>prijenos podataka drugom voditelju obrade</li>
          <li>
            povlačenje privole, što ne utječe na zakonitost obrade provedene prije povlačenja
          </li>
        </Popis>
        <p>
          Javite nam se na adresu{' '}
          <a href={`mailto:${EMAIL_PRIVATNOST}`} className={LINK}>
            {EMAIL_PRIVATNOST}
          </a>{' '}
          ili na broj{' '}
          <a href={TELEFON_LINK} className={LINK}>
            {TELEFON_PRIKAZ}
          </a>
          . Odgovorit ćemo vam u roku od mjesec dana. Ako smatrate da vaše podatke obrađujemo
          protivno propisima, možete podnijeti prigovor Agenciji za zaštitu osobnih podataka
          (AZOP),{' '}
          <a href="https://azop.hr" target="_blank" rel="noopener" className={LINK}>
            azop.hr
          </a>
          .
        </p>
      </Poglavlje>

      <Poglavlje naslov="7. Kolačići">
        <p>
          Kolačići su male datoteke koje stranica sprema u vaš preglednik. Pri prvom posjetu
          pitamo vas koje kolačiće smijemo koristiti. Marketinške kolačiće uključujemo tek nakon
          što kliknete „Prihvati sve“ ili ih sami uključite u postavkama.
        </p>

        <h3>Nužni kolačići</h3>
        <p>Bez njih stranica i narudžba ne mogu raditi, pa ih nije moguće isključiti.</p>
        <Kolacici
          popis={[
            {
              naziv: 'cc_cookie',
              svrha: 'pamti vaš izbor kolačića',
              trajanje: '6 mjeseci',
            },
            {
              naziv: 'izvor (spremište preglednika)',
              svrha:
                'pamti putem kojeg ste oglasa ili poveznice došli do nas, kako bismo to mogli zapisati uz narudžbu',
              trajanje: 'dok ne zatvorite karticu preglednika',
            },
            {
              naziv: 'Cloudflare Turnstile',
              svrha: 'provjerava da narudžbu šalje čovjek, a ne robot',
              trajanje: 'samo tijekom slanja narudžbe',
            },
          ]}
        />
        <p className="text-muted-foreground">
          Zaposlenici koji se prijavljuju u naš sustav za narudžbe imaju i kolačić prijave. Kupci
          ga nemaju.
        </p>

        <h3>Marketinški kolačići</h3>
        <p>Koristimo ih samo uz vaš pristanak.</p>
        <Kolacici
          popis={[
            {
              naziv: '_fbp, _fbc (Meta Pixel)',
              svrha:
                'pomažu nam saznati koji je oglas na Facebooku ili Instagramu doveo do narudžbe te prikazivati oglase ljudima kojima bi mogli biti korisni',
              trajanje: '90 dana',
            },
          ]}
        />

        <p>
          Svoj izbor možete promijeniti ili povući u bilo kojem trenutku:{' '}
          <span className="font-medium text-primary">
            <GumbPostavkiKolacica />
          </span>
          . Isti se gumb nalazi i u podnožju svake stranice.
        </p>
      </Poglavlje>

      <Poglavlje naslov="8. Izmjene">
        <p>
          Ako izmijenimo ovu politiku, novu ćemo inačicu objaviti na ovoj stranici, s novim
          datumom na vrhu.
        </p>
      </Poglavlje>
    </article>
  )
}

const LINK = 'font-medium text-primary underline underline-offset-4'

function Poglavlje({ naslov, children }: { naslov: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2>{naslov}</h2>
      {children}
    </section>
  )
}

function Popis({ children }: { children: React.ReactNode }) {
  return <ul className="flex list-disc flex-col gap-1 pl-6">{children}</ul>
}

type Kolacic = { naziv: string; svrha: string; trajanje: string }

// Popis kolačića kao kartice (umjesto tablice), da stane na uski mobitel.
function Kolacici({ popis }: { popis: Kolacic[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {popis.map((k) => (
        <li key={k.naziv} className="rounded-xl border bg-card p-4 shadow-kartica">
          <p className="font-medium wrap-break-word">{k.naziv}</p>
          <p className="text-muted-foreground">{k.svrha}</p>
          <p className="text-sm text-muted-foreground">Trajanje: {k.trajanje}</p>
        </li>
      ))}
    </ul>
  )
}
