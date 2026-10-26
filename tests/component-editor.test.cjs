const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {PGlite}=require('@electric-sql/pglite');
const auth=require('../api/_admin'),content=require('../api/site-content');const {sharedKey,validImage,normalizePage}=require('../src/published-editor/model.cjs');
test('shared component identities and safe media paths',()=>{assert.equal(normalizePage('/programs.html'),'/programs');assert.equal(sharedKey('tuition',1),sharedKey('tuition',1));assert.notEqual(sharedKey('tuition',1),sharedKey('course-basic',1));assert.equal(validImage('/assets/photo.jpg'),true);for(const v of ['//evil.test/x','javascript:alert(1)','data:image/svg+xml,x'])assert.equal(validImage(v),false);assert.equal(content.valid({'/shared':[{key:sharedKey('tuition',1),type:'text',value:'40만 원'}]}),true);});
test('unauthenticated writes and forged sessions are refused',async()=>{const old=[process.env.ADMIN_PASSWORD,process.env.ADMIN_SESSION_SECRET];try{process.env.ADMIN_PASSWORD='test';process.env.ADMIN_SESSION_SECRET='a'.repeat(32);assert.equal(await auth.authenticated({headers:{cookie:'kjt_admin_session=9999999999999.'+'a'.repeat(32)+'.fake'}}),false);const res={setHeader(){},status(n){this.code=n;return this},json(v){this.body=v;return this}};await content({method:'PUT',headers:{},body:{pages:{},revision:0}},res);assert.equal(res.code,401);}finally{for(const [i,k]of ['ADMIN_PASSWORD','ADMIN_SESSION_SECRET'].entries())if(old[i]===undefined)delete process.env[k];else process.env[k]=old[i];}});
test('CMS RPC rejects stale saves and private records are not browser-readable',async()=>{const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated,service_role;grant select,insert,update on storage.objects to anon,authenticated,service_role;`);
 await db.exec(fs.readFileSync('supabase/migrations/20261011_admin_cms.sql','utf8'));
 await db.exec('grant select,insert,update on public.academy_cms,public.academy_inquiries to anon,authenticated,service_role;');
 await db.exec(fs.readFileSync('supabase/migrations/20261012_component_editor_security.sql','utf8'));
 await db.exec("insert into public.academy_inquiries(name,phone) values ('테스트','01000000000');set role anon;");
 await assert.rejects(db.exec("select * from public.academy_inquiries"));await assert.rejects(db.exec("update public.academy_cms set value='{}'"));await assert.rejects(db.exec("select public.save_academy_content('{}',0)"));
 await assert.rejects(db.exec("insert into storage.objects(bucket_id,name) values('academy-site-media','x.png')"));
 await db.exec('reset role;set role service_role;');assert.equal((await db.query("select public.save_academy_content('{\"/\":[]}',0) as revision")).rows[0].revision,1);assert.equal((await db.query("select public.save_academy_content('{}',0) as revision")).rows[0].revision,null);assert.equal((await db.query('select revision from public.academy_cms')).rows[0].revision,1);
 }finally{await db.close();}});
test('inquiry management authenticates reads/writes and validates record changes',async()=>{
 const store=require('../api/_cms-store'),handler=require('../api/admin-inquiries');const beforeAuth=auth.requireAdmin,beforeRequest=store.request;
 const response=()=>({code:200,setHeader(){},status(n){this.code=n;return this;},json(v){this.data=v;return this;}});
 try{
  auth.requireAdmin=async(req,res)=>{res.status(401).json({error:'auth required'});return false;};store.request=async()=>{throw Error('must not reach database');};
  for(const method of ['GET','PATCH']){const res=response();await handler({method,body:{}},res);assert.equal(res.code,401);}
  auth.requireAdmin=async()=>true;
  const invalid=response();await handler({method:'PATCH',body:{id:'invalid',memo:'',status:'신규'}},invalid);assert.equal(invalid.code,400);
  const record={id:'b079d152-62a0-4396-a32a-12960bc2fb65',status:'비대면 상담 진행',memo:'연락 예정',revision:0};
  store.request=async(route,options)=>{
   if(route.includes('academy_inquiry_workflow?'))return [];
   if(options){assert.equal(options.method,'POST');assert.equal(route,'/rest/v1/rpc/save_academy_inquiry_workflow');const p=JSON.parse(options.body);assert.equal(p.p_stage,record.status);return {stage:p.p_stage,revision:1,counselor:p.p_counselor,starts_at:null,ends_at:null};}
   return [record];
  };
  const list=response();await handler({method:'GET'},list);assert.equal(list.data.records[0].status,record.status);assert.equal(list.data.records[0].counselor,'임도윤 실장');
  const patched=response();await handler({method:'PATCH',body:record},patched);assert.equal(patched.data.record.id,record.id);assert.equal(patched.data.record.revision,1);
  store.request=async()=>[];const missing=response();await handler({method:'PATCH',body:{action:'profile',id:record.id,name:'테스트',phone:'01000000000',courses:['취미반'],purposes:['취미·입문']}},missing);assert.equal(missing.code,404);
  store.request=async()=>{throw Error('unavailable');};const failed=response();await handler({method:'GET'},failed);assert.equal(failed.code,503);
 }finally{auth.requireAdmin=beforeAuth;store.request=beforeRequest;}
});
