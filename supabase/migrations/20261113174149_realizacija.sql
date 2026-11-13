-- Korak 1.10 — Realizacija narudžbe
-- Nakon vaganja Vedran upisuje stvarnu klasu, kilograme i cijenu za svaku stavku.
--
-- 1) Stavka smije imati prijavljeno 0 kg. To znači da ju je Vedran dodao pri vaganju
--    (kupac taj materijal nije prijavio). Javne narudžbe i dalje uvijek imaju više od 0,
--    jer to provjerava kreiraj_narudzbu.
-- 2) Funkcija realiziraj_narudzbu sprema sve u JEDNOJ transakciji: stvarne vrijednosti
--    stavki, dodane i obrisane stavke te status i ukupni iznos narudžbe.
--
-- Greške koje akcija prepoznaje po poruci:
--   NIJE_DOSTUPNA      narudžba ne postoji ili nije potvrđena/realizirana
--   NEISPRAVNI_PODACI  stavke nisu u dobrom obliku

alter table public.stavke drop constraint stavke_kg_prijavljeno_check;
alter table public.stavke add constraint stavke_kg_prijavljeno_check check (kg_prijavljeno >= 0);

create function public.realiziraj_narudzbu(
  p_id uuid,
  -- [{"id": 12, "klasa_id": 3, "kg": 12.4, "cijena_kg": 7.2}, …]
  -- id je null za stavku koju Vedran dodaje pri vaganju
  p_stavke jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status public.status_narudzbe;
  v_broj_stavki integer;
  v_ukupno_kg numeric;
begin
  -- 1) Zaključaj narudžbu do kraja transakcije (dva istodobna spremanja čekaju jedno drugo).
  --    Realizirati se smije potvrđena, a urediti već realizirana narudžba.
  select n.status into v_status
  from public.narudzbe n
  where n.id = p_id
  for update;
  if v_status is null or v_status not in ('potvrdjena', 'realizirana') then
    raise exception 'NIJE_DOSTUPNA';
  end if;

  -- 2) Oblik: 1–20 stavki; kg 0–100.000 i cijena 0–100 €/kg, obje s najviše 2 decimale.
  --    Prijavljena stavka smije imati 0 kg (materijala nije bilo), a dodana ne.
  if jsonb_typeof(p_stavke) is distinct from 'array' then
    raise exception 'NEISPRAVNI_PODACI';
  end if;
  select count(*), coalesce(sum(s.kg), 0) into v_broj_stavki, v_ukupno_kg
  from jsonb_to_recordset(p_stavke) as s (id bigint, klasa_id integer, kg numeric, cijena_kg numeric);
  if v_broj_stavki not between 1 and 20
    or v_ukupno_kg <= 0
    or exists (
      select 1
      from jsonb_to_recordset(p_stavke) as s (id bigint, klasa_id integer, kg numeric, cijena_kg numeric)
      where s.klasa_id is null or s.kg is null or s.cijena_kg is null
        or s.kg < 0 or s.kg > 100000 or s.kg <> round(s.kg, 2)
        or s.cijena_kg < 0 or s.cijena_kg > 100 or s.cijena_kg <> round(s.cijena_kg, 2)
        or (s.id is null and s.kg = 0)
    )
  then
    raise exception 'NEISPRAVNI_PODACI';
  end if;

  -- 3) Svaka klasa postoji (smije biti i ugašena, ako je to bila klasa stavke).
  if exists (
    select 1
    from jsonb_to_recordset(p_stavke) as s (id bigint, klasa_id integer, kg numeric, cijena_kg numeric)
    where not exists (select 1 from public.klase k where k.id = s.klasa_id)
  ) then
    raise exception 'NEISPRAVNI_PODACI';
  end if;

  -- 4) Postojeće stavke: svaki id pripada ovoj narudžbi i pojavljuje se samo jednom.
  if exists (
    select 1
    from jsonb_to_recordset(p_stavke) as s (id bigint, klasa_id integer, kg numeric, cijena_kg numeric)
    where s.id is not null
      and not exists (select 1 from public.stavke st where st.id = s.id and st.narudzba_id = p_id)
  )
  or (
    select count(s.id) <> count(distinct s.id)
    from jsonb_to_recordset(p_stavke) as s (id bigint, klasa_id integer, kg numeric, cijena_kg numeric)
  ) then
    raise exception 'NEISPRAVNI_PODACI';
  end if;

  -- 5) Svaka stavka koju je kupac prijavio mora dobiti stvarne vrijednosti.
  if exists (
    select 1
    from public.stavke st
    where st.narudzba_id = p_id
      and st.kg_prijavljeno > 0
      and not exists (
        select 1
        from jsonb_to_recordset(p_stavke) as s (id bigint, klasa_id integer, kg numeric, cijena_kg numeric)
        where s.id = st.id
      )
  ) then
    raise exception 'NEISPRAVNI_PODACI';
  end if;

  -- 6) Dodane stavke koje je Vedran pri uređivanju maknuo se brišu.
  delete from public.stavke st
  where st.narudzba_id = p_id
    and st.kg_prijavljeno = 0
    and not exists (
      select 1
      from jsonb_to_recordset(p_stavke) as s (id bigint, klasa_id integer, kg numeric, cijena_kg numeric)
      where s.id = st.id
    );

  -- 7) Stvarne vrijednosti postojećih stavki.
  update public.stavke st
  set klasa_stvarna_id = s.klasa_id,
      kg_stvarno = s.kg,
      cijena_kg_stvarna = s.cijena_kg,
      iznos_stvarni = round(s.kg * s.cijena_kg, 2)
  from jsonb_to_recordset(p_stavke) as s (id bigint, klasa_id integer, kg numeric, cijena_kg numeric)
  where st.id = s.id and st.narudzba_id = p_id;

  -- 8) Nove stavke: prijavljeno 0 kg, a "prijavljena" cijena je današnja iz cjenika.
  insert into public.stavke (
    narudzba_id, klasa_id, kg_prijavljeno, cijena_kg_prijavljena,
    klasa_stvarna_id, kg_stvarno, cijena_kg_stvarna, iznos_stvarni
  )
  select p_id, s.klasa_id, 0, k.cijena_po_kg,
         s.klasa_id, s.kg, s.cijena_kg, round(s.kg * s.cijena_kg, 2)
  from jsonb_to_recordset(p_stavke) as s (id bigint, klasa_id integer, kg numeric, cijena_kg numeric)
  join public.klase k on k.id = s.klasa_id
  where s.id is null;

  -- 9) Narudžba je realizirana. Ukupno se zaokružuje tek na kraju.
  --    Ispravak realizacije ne mijenja vrijeme prve realizacije.
  update public.narudzbe n
  set status = 'realizirana',
      stvarno_ukupno = (
        select round(sum(s.kg * s.cijena_kg), 2)
        from jsonb_to_recordset(p_stavke) as s (id bigint, klasa_id integer, kg numeric, cijena_kg numeric)
      ),
      realizirana_at = coalesce(n.realizirana_at, now()),
      redoslijed = null
  where n.id = p_id;
end;
$$;

-- Samo prijavljeni (Vedran i Mišel) smiju realizirati narudžbu.
revoke execute on function public.realiziraj_narudzbu(uuid, jsonb) from public, anon;
grant execute on function public.realiziraj_narudzbu(uuid, jsonb) to authenticated;
