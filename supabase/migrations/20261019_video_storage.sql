begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('academy-site-videos','academy-site-videos',true,104857600,array['video/mp4','video/webm'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- Uploads use a random per-file path and an administrator-issued signed URL.
-- No anonymous upload/update/delete policies are added.
commit;
