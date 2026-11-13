-- Dopuna koraka 1.5 (dogovoreno s Mišelom u 1.6)
-- Kalendar kupcu pokazuje i dane koji već imaju neku narudžbu, a još imaju mjesta
-- (žuti dani). Kupac vidi samo DA ili NE: nikad koliko narudžbi, čije ni odakle.

-- Dani između p_od i p_do (uključivo) koji imaju barem jednu narudžbu
-- sa statusom nova ili potvrdjena. Najviše godinu dana odjednom.
create function public.dani_s_narudzbama(p_od date, p_do date)
returns setof date
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct n.datum_odvoza
  from public.narudzbe n
  where n.datum_odvoza between p_od and least(p_do, p_od + 366)
    and n.status in ('nova', 'potvrdjena')
  order by 1;
$$;

-- Anonimni ne smiju pozivati funkciju (javni sajt ide preko servera).
revoke execute on function public.dani_s_narudzbama(date, date) from public, anon;
