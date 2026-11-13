-- Bucket za fotografije materijala iz narudžbi (korak 1.4).
-- Privatan je: nitko ne može otvoriti fotografiju bez potpisanog linka.
-- Najviše 2 MB po datoteci i samo JPEG (preglednik ionako šalje oko 0,3 MB).
-- Upload ide potpisanim linkovima koje izdaje server, pa ne treba nikakvo
-- pravilo (policy) za anonimne korisnike na storage.objects.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotografije', 'fotografije', false, 2097152, array['image/jpeg']);
