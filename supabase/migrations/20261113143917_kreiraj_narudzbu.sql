-- Korak 1.6 — Spremanje narudžbe
-- Funkcija kreiraj_narudzbu upisuje narudžbu, stavke i fotografije u JEDNOJ transakciji:
-- ili se upiše sve, ili ništa. Poziva je samo server (ruta POST /api/narudzbe) tajnim ključem.
--
-- Funkcija ne vjeruje pregledniku: sama računa udaljenost, bodove, cijene i procjenu.
-- Blagdane provjerava ruta (src/lib/blagdani.ts), jer ih baza ne zna.
--
-- Greške koje ruta prepoznaje po poruci:
--   IZVAN_PODRUCJA     naselje ne postoji ili nije u pokrivenoj županiji
--   DAN_NIJE_DOSTUPAN  dan je prošao, nedjelja je ili ga je Vedran zatvorio
--   DAN_POPUNJEN       u danu više nema dovoljno bodova
--   KLASA_NEDOSTUPNA   klasa ne postoji ili više nije aktivna
--   NEISPRAVNI_PODACI  stavke ili fotografije nisu u dobrom obliku

create function public.kreiraj_narudzbu(
  p_id uuid,
  p_ime_prezime text,
  p_mobitel text,
  p_naselje_id integer,
  p_ulica text,
  p_zeljeni_datum date,
  p_dio_dana public.dio_dana,
  -- [{"klasa_id": 3, "kg": 12.5}, …]
  p_stavke jsonb,
  -- ["narudzbe/{p_id}/1.jpg", …]
  p_fotografije text[],
  -- neobavezno (GPS, napomena, izvor oglasa)
  p_lat numeric default null,
  p_lng numeric default null,
  p_napomena text default null,
  p_utm_source text default null,
  p_utm_campaign text default null,
  p_fbclid text default null
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_broj text;
  v_udaljenost numeric;
  v_bodovi smallint;
  v_kapacitet smallint;
  v_zauzeto integer;
  v_broj_stavki integer;
  v_broj_klasa integer;
  v_procjena numeric;
begin
  -- 1) Naselje mora postojati i biti u pokrivenoj županiji.
  if not exists (
    select 1
    from public.naselja n
    join public.zupanije z on z.id = n.zupanija_id
    where n.id = p_naselje_id and z.pokrivena
  ) then
    raise exception 'IZVAN_PODRUCJA';
  end if;

  -- 2) Zaključaj taj dan do kraja transakcije. Druga narudžba za isti dan čeka
  --    ovdje dok prva ne završi, pa dvije ne mogu istodobno uzeti zadnje mjesto.
  perform pg_advisory_xact_lock(hashtext('kalendar_dan'), p_zeljeni_datum - date '2000-01-01');

  -- 3) Ista narudžba poslana dvaput (dvostruki klik, ponovni pokušaj):
  --    vrati broj već spremljene, umjesto greške ili druge narudžbe.
  select n.broj into v_broj from public.narudzbe n where n.id = p_id;
  if v_broj is not null then
    return v_broj;
  end if;

  -- 4) Dan: najranije sutra (po hrvatskom vremenu), nije nedjelja, nije zatvoren.
  if p_zeljeni_datum < (now() at time zone 'Europe/Zagreb')::date + 1
    or extract(isodow from p_zeljeni_datum) = 7
    or exists (select 1 from public.zatvoreni_dani z where z.datum = p_zeljeni_datum)
  then
    raise exception 'DAN_NIJE_DOSTUPAN';
  end if;

  -- 5) Udaljenost i bodovi računaju se iz naselja, a ne iz preglednika.
  select b.udaljenost_km, b.bodovi into v_udaljenost, v_bodovi
  from public.bodovi_narudzbe(p_naselje_id) b;
  select p.kapacitet_dana into v_kapacitet from public.postavke_kalendara p;
  if v_bodovi is null or v_kapacitet is null then
    raise exception 'Postavke kalendara ili koordinate naselja nedostaju';
  end if;

  select coalesce(sum(n.bodovi), 0) into v_zauzeto
  from public.narudzbe n
  where n.datum_odvoza = p_zeljeni_datum
    and n.status in ('nova', 'potvrdjena');
  if v_zauzeto + v_bodovi > v_kapacitet then
    raise exception 'DAN_POPUNJEN';
  end if;

  -- 6) Stavke: 1–20 redaka, količina veća od 0, najviše 100.000 kg i 2 decimale.
  if jsonb_typeof(p_stavke) is distinct from 'array' then
    raise exception 'NEISPRAVNI_PODACI';
  end if;
  select count(*) into v_broj_stavki
  from jsonb_to_recordset(p_stavke) as s (klasa_id integer, kg numeric);
  if v_broj_stavki not between 1 and 20
    or exists (
      select 1 from jsonb_to_recordset(p_stavke) as s (klasa_id integer, kg numeric)
      where s.klasa_id is null or s.kg is null
        or s.kg <= 0 or s.kg > 100000 or s.kg <> round(s.kg, 2)
    )
  then
    raise exception 'NEISPRAVNI_PODACI';
  end if;

  -- Svaka klasa mora biti aktivna i pripadati aktivnom materijalu.
  select count(*) into v_broj_klasa
  from jsonb_to_recordset(p_stavke) as s (klasa_id integer, kg numeric)
  join public.klase k on k.id = s.klasa_id and k.aktivna
  join public.materijali m on m.id = k.materijal_id and m.aktivan;
  if v_broj_klasa <> v_broj_stavki then
    raise exception 'KLASA_NEDOSTUPNA';
  end if;

  -- Procjena po današnjem cjeniku; zaokružuje se na 2 decimale tek na kraju.
  select round(sum(k.cijena_po_kg * s.kg), 2) into v_procjena
  from jsonb_to_recordset(p_stavke) as s (klasa_id integer, kg numeric)
  join public.klase k on k.id = s.klasa_id;

  -- 7) Fotografije: 1–5, sve u mapi ove narudžbe (narudzbe/{id}/n.jpg).
  if coalesce(array_length(p_fotografije, 1), 0) not between 1 and 5
    or exists (
      select 1 from unnest(p_fotografije) as f (putanja)
      where f.putanja is null or f.putanja !~ ('^narudzbe/' || p_id::text || '/[1-5]\.jpg$')
    )
  then
    raise exception 'NEISPRAVNI_PODACI';
  end if;

  -- 8) Upis. Broj narudžbe dodjeljuje okidač dodijeli_broj_narudzbe.
  insert into public.narudzbe (
    id, ime_prezime, mobitel, naselje_id, ulica, lat, lng,
    zeljeni_datum, datum_odvoza, dio_dana, napomena_kupca,
    procjena_ukupno, udaljenost_km, bodovi,
    privola_at, utm_source, utm_campaign, fbclid
  ) values (
    p_id, trim(p_ime_prezime), p_mobitel, p_naselje_id, trim(p_ulica), p_lat, p_lng,
    p_zeljeni_datum, p_zeljeni_datum, p_dio_dana, nullif(trim(p_napomena), ''),
    v_procjena, v_udaljenost, v_bodovi,
    now(), p_utm_source, p_utm_campaign, p_fbclid
  )
  returning broj into v_broj;

  -- Cijena po kg kopira se iz cjenika u trenutku narudžbe.
  insert into public.stavke (narudzba_id, klasa_id, kg_prijavljeno, cijena_kg_prijavljena)
  select p_id, s.klasa_id, s.kg, k.cijena_po_kg
  from jsonb_to_recordset(p_stavke) as s (klasa_id integer, kg numeric)
  join public.klase k on k.id = s.klasa_id;

  insert into public.fotografije (narudzba_id, putanja)
  select p_id, f.putanja
  from unnest(p_fotografije) as f (putanja);

  return v_broj;
end;
$$;

-- Samo server (tajni ključ, uloga service_role) smije spremati narudžbe.
revoke execute on function public.kreiraj_narudzbu(
  uuid, text, text, integer, text, date, public.dio_dana, jsonb, text[],
  numeric, numeric, text, text, text, text
) from public, anon, authenticated;
