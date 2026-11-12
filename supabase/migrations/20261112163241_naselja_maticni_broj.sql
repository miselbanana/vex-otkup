-- Korak 0.5 — Službeni matični broj naselja
-- Matični broj (Državna geodetska uprava / DZS) jednoznačno označava naselje.
-- Služi kao ključ pri uvozu, pa se uvoz naselja može ponoviti bez dupliciranja.
-- Tablica naselja je u trenutku ove migracije prazna, pa je "not null" siguran.

alter table public.naselja
  add column maticni_broj integer not null unique;
