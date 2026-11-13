-- Korak 1.11 — Uređivanje cjenika
-- Stupac klase.azurirano prikazuje se u adminu kao "Cijena promijenjena: …".
-- Zato se mijenja samo kad se promijeni cijena, a ne i kad Vedran uredi opis
-- ili uključi/isključi klasu.

drop trigger klase_postavi_azurirano on public.klase;

create trigger klase_postavi_azurirano
before update on public.klase
for each row
when (old.cijena_po_kg is distinct from new.cijena_po_kg)
execute function public.postavi_azurirano();
