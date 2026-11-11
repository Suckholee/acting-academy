begin;
-- Preserve the private bucket and existing document types. Add only raster photo types.
update storage.buckets set allowed_mime_types=(select array_agg(distinct mime) from unnest(coalesce(allowed_mime_types,array[]::text[]) || array['image/jpeg','image/png','image/webp']) as mime) where id='academy-casting-private';
commit;
