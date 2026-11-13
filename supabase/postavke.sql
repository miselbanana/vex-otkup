-- Početne postavke kalendara (korak 1.5).
-- Preduvjet: naselja iz naselja.sql su već upisana (polazište je naselje Reka).
-- Reka se traži po matičnom broju (54763), a ne po id-u, jer se id razlikuje među bazama.
-- Datoteka se smije pokrenuti više puta: ako redak već postoji, ne mijenja ništa
-- (Vedran postavke mijenja u adminu, korak 1.11).
-- Pokretanje na povezanoj bazi:
--   npx supabase db query --remote --file supabase/postavke.sql --yes

insert into public.postavke_kalendara (baza_naselje_id)
select id from public.naselja where maticni_broj = 54763
on conflict (id) do nothing;
