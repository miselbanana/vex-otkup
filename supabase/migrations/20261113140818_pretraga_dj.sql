-- Korak 1.5 — dopuna pretrage naselja
-- Na tipkovnici bez hrvatskih slova ljudi "đ" često pišu kao "dj" ("Djurdjevac").
-- unaccent pretvara "đ" u "d", pa se ovdje i "dj" svodi na "d", i to u upitu
-- i u nazivu naselja. Tako "djurdjevac", "durdevac" i "Đurđevac" daju isti pogodak.

-- Oblik teksta za usporedbu: bez kvačica, malim slovima, "dj" → "d",
-- a svaki znak osim slova i brojke postaje razmak.
create function public.oblik_za_pretragu(tekst text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select trim(regexp_replace(replace(public.bez_kvacica(coalesce(tekst, '')), 'dj', 'd'), '[^a-z0-9]+', ' ', 'g'));
$$;

revoke execute on function public.oblik_za_pretragu(text) from public, anon;

create or replace function public.trazi_naselja(upit text)
returns table (id integer, naziv text, opcina text, zupanija text, pokrivena boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  with u as (
    select public.oblik_za_pretragu(upit) as q
  ),
  kandidati as (
    select
      n.id,
      n.naziv,
      n.opcina,
      z.naziv as zupanija,
      z.pokrivena,
      public.oblik_za_pretragu(n.naziv) as cisto
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
