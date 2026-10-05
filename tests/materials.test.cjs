const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const handler=require('../api/materials-config');
test('config refuses missing config and secret keys; only public key is exposed',()=>{
 const before=[process.env.SUPABASE_URL,process.env.SUPABASE_PUBLISHABLE_KEY];
 function call(){const r={setHeader(){},status(n){this.code=n;return this},json(v){this.body=v;return this}};handler({method:'GET'},r);return r.body}
 try{delete process.env.SUPABASE_URL;delete process.env.SUPABASE_PUBLISHABLE_KEY;assert.deepEqual(call(),{ready:false});process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_PUBLISHABLE_KEY='sb_secret_DO_NOT_EXPOSE';assert.deepEqual(call(),{ready:false});process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_test';assert.equal(call().ready,true);}finally{for(const [i,k] of ['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY'].entries()){if(before[i]===undefined)delete process.env[k];else process.env[k]=before[i];}}
});
test('database isolation, role control, consent, file policies and draft/submit workflow',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;`);
 await db.exec(fs.readFileSync('supabase/migrations/20261005_material_collection.sql','utf8'));
 const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',admin='00000000-0000-4000-8000-000000000003';
 await db.exec(`insert into auth.users values ('${a}'),('${b}'),('${admin}');insert into public.material_members values('${a}','trainer','강사 A'),('${b}','trainer','강사 B'),('${admin}','reviewer','취합 담당자');`);
 const login=async id=>{await db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`)};
 await login(a);
 const {rows:[s]}=await db.query("insert into public.material_submissions(kind,payload) values('trainer','{}') returning *");
 await assert.rejects(db.query("insert into public.material_submissions(kind) values('operator')"));
 await assert.rejects(db.query("update public.material_members set role='reviewer'"));
 await assert.rejects(db.query("update public.material_submissions set status='submitted' where id=$1",[s.id]));
 const pathname=`${a}/${s.id}/photo.jpg`;
 await db.query("insert into storage.objects(bucket_id,name) values('academy-materials',$1)",[pathname]);
 await login(b);
 assert.equal((await db.query('select * from public.material_submissions')).rows.length,0);
 assert.equal((await db.query('select * from storage.objects')).rows.length,0);
 assert.equal((await db.query("update public.material_submissions set payload='{}' where id=$1 returning *",[s.id])).rows.length,0);
 await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('academy-materials',$1)",[pathname]));
 await login(a);
 const submitted=await db.query("update public.material_submissions set payload=$1,status='submitted' where id=$2 and version=1 returning *",[JSON.stringify({name:'강사 A',contact:'a@example.com',consent:true}),s.id]);
 assert.equal(submitted.rows[0].version,2);
 assert.equal((await db.query("update public.material_submissions set payload='{}' where id=$1 and version=1 returning *",[s.id])).rows.length,0);
 await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('academy-materials',$1)",[`${a}/${s.id}/other.jpg`]));
 await assert.rejects(db.query('update public.material_submissions set owner_id=$1 where id=$2',[b,s.id]));
 await assert.rejects(db.query("insert into public.material_reviews(submission_id,state) values($1,'complete')",[s.id]));
 await login(admin);
 assert.equal((await db.query('select * from public.material_submissions')).rows.length,1);
 assert.equal((await db.query('select * from storage.objects')).rows.length,1);
 await db.query("insert into public.material_reviews(submission_id,state,note) values($1,'needs_info','사진 추가 부탁드립니다.')",[s.id]);
 await login(a);
 assert.equal((await db.query('select * from public.material_reviews')).rows[0].state,'needs_info');
 await db.query("update public.material_submissions set status='draft' where id=$1",[s.id]);
 await db.query("insert into storage.objects(bucket_id,name) values('academy-materials',$1)",[`${a}/${s.id}/other.jpg`]);
 await db.exec(`reset role;delete from public.material_members where user_id='${a}';`);await login(a);
 assert.equal((await db.query('select * from public.material_submissions')).rows.length,0);
 assert.equal((await db.query('select * from storage.objects')).rows.length,0);
 await db.exec('reset role;set role anon;');
 await assert.rejects(db.query('select * from public.material_submissions'));
 }finally{await db.close()}
});
