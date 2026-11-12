-- Početni podaci: materijali, klase i cijene (korak 0.5).
--
-- !!! PRIVREMENI PODACI — zamijeniti Vedranovim cjenikom !!!
-- Cijene su okvirna procjena prema tržišnim smjernicama za 2026. godinu,
-- a ne Vedranove stvarne otkupne cijene. Opise klasa mora potvrditi Vedran.
--
-- Datoteka se smije pokrenuti više puta: postojeći zapisi se ažuriraju, ne dupliciraju.
-- Pokretanje na povezanoj bazi:
--   npx supabase db query --remote --file supabase/seed.sql --yes

-- ---------------------------------------------------------------------
-- Materijali
-- ---------------------------------------------------------------------

insert into public.materijali (naziv, slug, redoslijed, aktivan) values
  ('Bakar',            'bakar',       10, true),
  ('Mesing',           'mesing',      20, true),
  ('Aluminij',         'aluminij',    30, true),
  ('Kabeli',           'kabeli',      40, true),
  ('Hladnjaci',        'hladnjaci',   50, true),
  ('Inox',             'inox',        60, true),
  ('Olovo',            'olovo',       70, true),
  ('Željezo i čelik',  'zeljezo',     80, true),
  ('Akumulatori',      'akumulatori', 90, true)
on conflict (slug) do update set
  naziv = excluded.naziv,
  redoslijed = excluded.redoslijed,
  aktivan = excluded.aktivan;

-- ---------------------------------------------------------------------
-- Klase i cijene (€/kg)
-- ---------------------------------------------------------------------

insert into public.klase (materijal_id, naziv, opis, cijena_po_kg, aktivna)
select m.id, k.naziv, k.opis, k.cijena_po_kg, true
from (values
  ('bakar', 'Bakar sjajni',
    'Čista bakrena žica bez izolacije, sjajna i bez oksidacije, laka ili boje.', 7.00),
  ('bakar', 'Bakar miješani',
    'Bakrene cijevi, lim i žica, smiju biti potamnjeli ili oksidirani. Bez drugih metala.', 6.20),
  ('bakar', 'Bakar s nečistoćama',
    'Bakar s lemom, bojom, kositrom ili sitnim spojnicama koje se ne mogu skinuti.', 5.20),

  ('mesing', 'Mesing čisti',
    'Žuti metal: slavine, ventili, armature i spojnice bez željeznih dijelova i plastike.', 3.80),
  ('mesing', 'Mesing s primjesama',
    'Mesing sa željeznim vijcima, plastikom ili drugim dijelovima koji se ne mogu odvojiti.', 3.00),

  ('aluminij', 'Aluminij profil',
    'Prozorski i vratni profili, bez stakla, gume, plastike i vijaka.', 1.70),
  ('aluminij', 'Aluminij lim i odljevci',
    'Lim, felge, dijelovi motora i drugi odljevci. Smiju imati boju ili sitne nečistoće.', 1.20),
  ('aluminij', 'Aluminijske limenke',
    'Prazne limenke od pića, mogu biti zgnječene.', 0.70),

  ('kabeli', 'Kabel debeli bakreni',
    'Debeli kabeli s puno bakra (npr. za struju, priključni, napojni), presjek veći od prsta.', 3.20),
  ('kabeli', 'Kabel tanki kućni',
    'Tanji kućni i elektronički kabeli, produžni kabeli, kabeli od uređaja.', 1.60),

  ('hladnjaci', 'Hladnjak Al/Cu (klima)',
    'Hladnjaci od klima uređaja: bakrene cijevi s aluminijskim lamelama, bez željeznog okvira.', 3.00),
  ('hladnjaci', 'Hladnjak auto Cu/Ms',
    'Automobilski hladnjaci od bakra i mesinga, bez plastičnih spremnika.', 2.20),

  ('inox', 'Inox',
    'Nehrđajući čelik: sudoperi, posuđe, cijevi i lim. Magnet ga slabo ili uopće ne privlači.', 0.90),

  ('olovo', 'Olovo',
    'Olovne cijevi, utezi i lim. Bez akumulatora.', 1.20),

  ('zeljezo', 'Željezo teško',
    'Debelo željezo i čelik (deblji od 5 mm): grede, cijevi, dijelovi strojeva.', 0.20),
  ('zeljezo', 'Željezo lako i miješano',
    'Tanki lim, kućanski aparati bez kompresora, ograde, bicikli i miješani željezni otpad.', 0.12),

  ('akumulatori', 'Akumulatori',
    'Olovni akumulatori od automobila, kamiona i strojeva, cijeli i bez oštećenja.', 0.40)
) as k(slug, naziv, opis, cijena_po_kg)
join public.materijali m on m.slug = k.slug
on conflict (materijal_id, naziv) do update set
  opis = excluded.opis,
  cijena_po_kg = excluded.cijena_po_kg,
  aktivna = excluded.aktivna;
