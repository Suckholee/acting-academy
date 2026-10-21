const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const auth=require('../api/_admin');
const {createHandler}=require('../api/admin-consultation');
const {createStore}=require('../scripts/demo-consultation-rooms.cjs');
function response(){return {code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(v){this.code=v;return this;},json(v){this.data=v;return this;},end(v){this.body=v;return this;}};}
test('student rooms persist independent assigned guides, ink and journal; stale writes cannot overwrite another counselor',async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),'kjt-rooms-')),file=path.join(folder,'rooms.json');
 const env=[process.env.ADMIN_PASSWORD,process.env.ADMIN_SESSION_SECRET];process.env.ADMIN_PASSWORD='only-test';process.env.ADMIN_SESSION_SECRET='a'.repeat(32);
 try{
  const local=auth.createAuth(require('../scripts/local-admin-store.cjs').createStore()),store=createStore(file),handler=createHandler({requireAdmin:(...a)=>local.requireAdmin(...a),roomStore:store});
  const session=response();await local.session(session);const cookie=session.headers['Set-Cookie'].split(';')[0];
  const call=async(method,data,id,logged=true)=>{const res=response();await handler({method,url:'/api/admin-consultation?resource=rooms'+(id?'&id='+id:''),body:data,headers:{host:'localhost',cookie:logged?cookie:''}},res);return res;};
  assert.equal((await call('GET',null,null,false)).code,401);assert.equal((await call('POST',{},null,false)).code,401);
  const manifest=JSON.parse(await fs.readFile('private-assets/consultation/manifest.json','utf8'));
  const input={name:'검증용 수강생 A',phone:'010-0000-0000',source:'시연',interest:'기초',counselor:'시연 상담자',special:'테스트',guide_version:manifest.version,page_ids:[1,4,6,7]};
  assert.equal((await call('POST',{...input,phone:'invalid'})).code,400);
  assert.equal((await call('POST',{...input,page_ids:[1,1]})).code,400);
  assert.equal((await call('POST',{...input,guide_version:'0'.repeat(16)})).code,409);
  const created=await call('POST',input);assert.equal(created.code,201);const a=created.data.record;
  const b=(await call('POST',{...input,name:'검증용 수강생 B'})).data.record;
  assert.equal((await call('PATCH',{revision:0,action:'progress',status:'completed',last_page:1},a.id)).code,400);
  const strokes=[{color:'#C34C3F',width:3,points:[[.1,.2],[.4,.5],[.6,.7]]}];
  assert.equal((await call('PATCH',{revision:0,action:'ink',page:2,strokes},a.id)).code,400);
  assert.equal((await call('PATCH',{revision:0,action:'ink',page:1,strokes:[{...strokes[0],points:[[2,0]]}]},a.id)).code,400);
  assert.equal((await call('PATCH',{revision:0,action:'ink',page:1,strokes},a.id)).code,200);
  assert.equal((await call('PATCH',{revision:0,action:'journal',journal:{summary:'덮어쓰기 시도'}},a.id)).code,409);
  assert.equal((await call('PATCH',{revision:1,action:'journal',journal:{summary:'기초반 상담. 다음 주 재연락.',goals:'배우 입문',followup:'다음 주 전화'}},a.id)).code,200);
  const complete=await call('PATCH',{revision:2,action:'progress',status:'completed',last_page:4},a.id);assert.equal(complete.code,200);assert.equal(complete.data.record.status,'completed');
  assert.deepEqual((await call('GET',null,b.id)).data.record.annotations,{});
  const restarted=createStore(file),saved=await restarted.get(a.id);assert.deepEqual(saved.annotations['1'],strokes);assert.equal(saved.journal.summary,'기초반 상담. 다음 주 재연락.');assert.equal(saved.guide_version,manifest.version);
  const listing=await call('GET');assert.equal(listing.data.records.length,2);assert.equal('journal' in listing.data.records[0],false);assert.equal('annotations' in listing.data.records[0],false);
  const noteSave=await call('PATCH',{revision:3,action:'journal_ink',strokes},a.id);assert.equal(noteSave.code,200);assert.deepEqual(noteSave.data.record.annotations._journal,strokes);assert.deepEqual(noteSave.data.record.annotations['1'],strokes);assert.equal(noteSave.data.record.journal.summary,'기초반 상담. 다음 주 재연락.');
  const privateVersion=response();await handler({method:'GET',url:'/api/admin-consultation?v='+manifest.version+'&page=1',headers:{host:'localhost',cookie}},privateVersion);assert.equal(privateVersion.headers['Content-Type'],'image/jpeg');
  await local.clear({headers:{cookie}},response());assert.equal((await call('GET',null,a.id)).code,401);
 }finally{for(const[i,key]of ['ADMIN_PASSWORD','ADMIN_SESSION_SECRET'].entries())env[i]===undefined?delete process.env[key]:process.env[key]=env[i];await fs.rm(folder,{recursive:true,force:true});}
});
test('room database denies anonymous and ordinary member access, and uses revision conditions for concurrent writes',async()=>{
 const db=new PGlite();try{
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');await db.exec(await fs.readFile('supabase/migrations/20261020_consultation_rooms.sql','utf8'));
  for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.exec('select * from public.academy_consultation_rooms'));await assert.rejects(db.exec("update public.academy_consultation_rooms set journal='{}'"));await db.exec('reset role');}
  await db.exec('set role service_role');const id='11111111-1111-4111-8111-111111111111';await db.query("insert into public.academy_consultation_rooms(id,name,phone,source,guide_version,page_ids,last_page)values($1,'test','01000000000','test','aaaaaaaaaaaaaaaa',array[1,4],1)",[id]);
  const one=await db.query('update public.academy_consultation_rooms set revision=revision+1 where id=$1 and revision=0 returning revision',[id]);assert.equal(one.rows.length,1);const stale=await db.query('update public.academy_consultation_rooms set revision=revision+1 where id=$1 and revision=0 returning revision',[id]);assert.equal(stale.rows.length,0);
 }finally{await db.close();}
});
