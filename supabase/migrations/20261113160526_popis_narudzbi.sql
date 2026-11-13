-- Korak 1.8 — Admin: popis narudžbi
-- 1) popis uživo: tablica narudzbe šalje promjene kroz Supabase Realtime
-- 2) prijavljeni smiju čitati fotografije (sličice preko potpisanih linkova)
-- 3) pretraga narudžbi po imenu, mobitelu, mjestu ili broju

-- =====================================================================
-- Popis uživo
-- =====================================================================

-- Realtime poštuje RLS: promjene dobiva samo prijavljeni korisnik,
-- jer anonimni nemaju nijedno pravilo na tablici narudzbe.
alter publication supabase_realtime add table public.narudzbe;

-- =====================================================================
-- Fotografije: čitanje za prijavljene
-- =====================================================================

-- createSignedUrls radi s Vedranovom sesijom, a ne tajnim ključem, pa mu treba
-- pravo čitanja. Anonimni i dalje nemaju nikakvo pravo na bucket.
create policy "Prijavljeni čitaju fotografije" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotografije');

-- =====================================================================
-- Pretraga narudžbi
-- =====================================================================

-- Narudžbe (svih statusa) koje odgovaraju upitu, od najnovije:
--   tekst se uspoređuje bez kvačica s imenom kupca, naseljem i općinom
--     ("durdevac" pronađe Đurđevac, "horvat" pronađe Ivana Horvata);
--   znamenke se uspoređuju s mobitelom, bez pozivnog broja i vodeće nule
--     ("091 234" pronađe +38591234…, a i zadnje znamenke "5678" rade);
--   upit se uspoređuje i s brojem narudžbe ("2026-0042").
-- Vraća cijele retke tablice narudzbe, pa se iz rezultata mogu ugnijezditi
-- stavke, naselje i fotografije kao iz obične tablice.
create function public.trazi_narudzbe(upit text)
returns setof public.narudzbe
language sql
stable
security invoker
set search_path = ''
as $$
  with u as (
    select
      trim(regexp_replace(public.bez_kvacica(coalesce(upit, '')), '[^a-z0-9]+', ' ', 'g')) as q,
      regexp_replace(
        regexp_replace(regexp_replace(coalesce(upit, ''), '[^0-9]', '', 'g'), '^(00)?385', ''),
        '^0', ''
      ) as tel
  )
  select n.*
  from public.narudzbe n
  join public.naselja s on s.id = n.naselje_id
  cross join u
  where length(u.q) >= 2
    and (
      trim(regexp_replace(
        public.bez_kvacica(n.ime_prezime || ' ' || s.naziv || ' ' || s.opcina),
        '[^a-z0-9]+', ' ', 'g'
      )) like '%' || u.q || '%'
      or (length(u.tel) >= 4 and n.mobitel like '%' || u.tel || '%')
      or n.broj like '%' || trim(upit) || '%'
    )
  order by n.created_at desc;
$$;

-- Anonimni ne smiju pozivati funkciju (prijavljeni smiju, kao i sve ostalo).
revoke execute on function public.trazi_narudzbe(text) from public, anon;
grant execute on function public.trazi_narudzbe(text) to authenticated;
