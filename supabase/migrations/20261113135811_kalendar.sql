-- Korak 1.5 — Lokacija i termin
-- 1) pretraga naselja koja ne mari za kvačice ("cakovec" pronađe "Čakovec")
-- 2) kalendar s bodovima: dan vrijedi kapacitet_dana bodova, a narudžba troši
--    1, 2 ili 4 boda prema zračnoj udaljenosti od Vedranovog polazišta (Reka)
-- Blagdani se NE računaju ovdje, nego u src/lib/blagdani.ts (Uskrs se računa).

-- =====================================================================
-- Pretraga naselja
-- =====================================================================

create extension if not exists unaccent with schema extensions;

-- "Čakovec" → "cakovec". Immutable je, pa se smije koristiti i u indeksu.
create function public.bez_kvacica(tekst text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, tekst));
$$;

-- Do 10 naselja čiji naziv (ili neka riječ u nazivu) počinje upitom.
-- U upitu i nazivu svaki znak osim slova i brojke postaje razmak, pa
-- "slavonski-brod" pronađe "Slavonski Brod", a % i _ ne mogu ništa pokvariti.
-- Redoslijed: točan naziv, pa naziv koji počinje upitom, pa pokrivene županije,
-- pa kraća imena.
create function public.trazi_naselja(upit text)
returns table (id integer, naziv text, opcina text, zupanija text, pokrivena boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  with u as (
    select trim(regexp_replace(public.bez_kvacica(coalesce(upit, '')), '[^a-z0-9]+', ' ', 'g')) as q
  ),
  kandidati as (
    select
      n.id,
      n.naziv,
      n.opcina,
      z.naziv as zupanija,
      z.pokrivena,
      trim(regexp_replace(public.bez_kvacica(n.naziv), '[^a-z0-9]+', ' ', 'g')) as cisto
    from public.naselja n
    join public.zupanije z on z.id = n.zupanija_id
  )
  select k.id, k.naziv, k.opcina, k.zupanija, k.pokrivena
  from kandidati k
  cross join u
  where length(u.q) >= 2
    and (k.cisto like u.q || '%' or k.cisto like '% ' || u.q || '%')
  order by
    (k.cisto = u.q) desc,
    (k.cisto like u.q || '%') desc,
    k.pokrivena desc,
    length(k.naziv),
    k.naziv,
    k.opcina
  limit 10;
$$;

-- =====================================================================
-- Postavke kalendara (uvijek točno jedan redak; Vedran ih mijenja u 1.11)
-- =====================================================================

create table public.postavke_kalendara (
  -- uvijek true: tablica ne može imati drugi redak
  id boolean primary key default true check (id),
  -- polazište (Reka kod Koprivnice); udaljenost se računa od koordinata ovog naselja
  baza_naselje_id integer not null references public.naselja (id) on delete restrict,
  kapacitet_dana smallint not null default 4 check (kapacitet_dana > 0),
  -- zračna udaljenost do granica_1_km = bodovi_1, do granica_2_km = bodovi_2, dalje = bodovi_dalje
  granica_1_km numeric(6, 1) not null default 30 check (granica_1_km > 0),
  bodovi_1 smallint not null default 1 check (bodovi_1 > 0),
  granica_2_km numeric(6, 1) not null default 90,
  bodovi_2 smallint not null default 2 check (bodovi_2 > 0),
  bodovi_dalje smallint not null default 4 check (bodovi_dalje > 0),
  constraint granice_redom check (granica_1_km < granica_2_km),
  -- narudžba mora stati u prazan dan, inače je nitko ne bi mogao naručiti
  constraint bodovi_stanu_u_dan check (
    bodovi_1 <= kapacitet_dana and bodovi_2 <= kapacitet_dana and bodovi_dalje <= kapacitet_dana
  )
);

-- Dani koje Vedran ručno zatvori (godišnji, kvar kamiona…).
create table public.zatvoreni_dani (
  datum date primary key,
  razlog text
);

-- =====================================================================
-- Narudžbe: dan odvoza i bodovi
-- =====================================================================

-- Tablica je u trenutku ove migracije prazna, pa je "not null" siguran.
alter table public.narudzbe
  -- dan koji zauzima kapacitet; pri narudžbi = zeljeni_datum, Vedran ga mijenja pri potvrdi
  add column datum_odvoza date not null,
  -- spremaju se u trenutku narudžbe, pa kasnija promjena granica ne mijenja stare narudžbe
  add column udaljenost_km numeric(6, 1) not null check (udaljenost_km >= 0),
  add column bodovi smallint not null check (bodovi > 0),
  -- redoslijed obilaska unutar dana (planer, 1.8)
  add column redoslijed integer;

-- Za zbrajanje zauzetih bodova po danu (samo narudžbe koje zauzimaju kapacitet).
create index narudzbe_datum_odvoza_idx on public.narudzbe (datum_odvoza)
  where status in ('nova', 'potvrdjena');

-- =====================================================================
-- Funkcije kalendara
-- =====================================================================

-- Zračna udaljenost (haversine, polumjer Zemlje 6371 km) od polazišta do naselja
-- i broj bodova koje takva narudžba troši. Vraća 0 redaka ako naselje ne postoji.
create function public.bodovi_narudzbe(p_naselje_id integer)
returns table (udaljenost_km numeric, bodovi smallint)
language sql
stable
security invoker
set search_path = ''
as $$
  with d as (
    select
      p.granica_1_km,
      p.bodovi_1,
      p.granica_2_km,
      p.bodovi_2,
      p.bodovi_dalje,
      round((2 * 6371 * asin(least(1, sqrt(
        power(sin(radians((n.lat - b.lat)::float8) / 2), 2)
        + cos(radians(b.lat::float8)) * cos(radians(n.lat::float8))
          * power(sin(radians((n.lng - b.lng)::float8) / 2), 2)
      ))))::numeric, 1) as km
    from public.postavke_kalendara p
    join public.naselja b on b.id = p.baza_naselje_id
    join public.naselja n on n.id = p_naselje_id
  )
  select
    d.km,
    case
      when d.km <= d.granica_1_km then d.bodovi_1
      when d.km <= d.granica_2_km then d.bodovi_2
      else d.bodovi_dalje
    end
  from d;
$$;

-- Dani između p_od i p_do (uključivo) na koje stane narudžba iz zadanog naselja:
-- nije nedjelja, nije ručno zatvoren i ima dovoljno slobodnih bodova.
-- Dan zauzimaju narudžbe sa statusom nova i potvrdjena (prema datum_odvoza).
-- Najviše godinu dana odjednom.
create function public.slobodni_dani(p_naselje_id integer, p_od date, p_do date)
returns setof date
language sql
stable
security invoker
set search_path = ''
as $$
  select p_od + i
  from public.bodovi_narudzbe(p_naselje_id) b
  cross join public.postavke_kalendara p
  cross join generate_series(0, least(p_do - p_od, 366)) as i
  where extract(isodow from p_od + i) <> 7
    and not exists (
      select 1 from public.zatvoreni_dani z where z.datum = p_od + i
    )
    and coalesce((
      select sum(n.bodovi)
      from public.narudzbe n
      where n.datum_odvoza = p_od + i
        and n.status in ('nova', 'potvrdjena')
    ), 0) + b.bodovi <= p.kapacitet_dana
  order by 1;
$$;

-- Anonimni ne smiju pozivati funkcije (javni sajt ide preko servera).
revoke execute on function public.bez_kvacica(text) from public, anon;
revoke execute on function public.trazi_naselja(text) from public, anon;
revoke execute on function public.bodovi_narudzbe(integer) from public, anon;
revoke execute on function public.slobodni_dani(integer, date, date) from public, anon;

-- =====================================================================
-- RLS: prijavljeni smiju sve, anonimni ništa
-- =====================================================================

alter table public.postavke_kalendara enable row level security;
alter table public.zatvoreni_dani enable row level security;

create policy "Prijavljeni smiju sve" on public.postavke_kalendara
  for all to authenticated using (true) with check (true);
create policy "Prijavljeni smiju sve" on public.zatvoreni_dani
  for all to authenticated using (true) with check (true);
