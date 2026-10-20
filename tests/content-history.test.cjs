const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {PGlite}=require('@electric-sql/pglite');
const auth=require('../api/_admin'),store=require('../api/_cms-store'),history=require('../api/admin-content-history');
const {contentDiff}=require('../src/published-editor/history-model.cjs');
const response=()=>({code:200,setHeader(){},status(n){this.code=n;return this;},json(v){this.data=v;return this;}});
test('content comparison includes removals, shared photos and changes across pages',()=>{
 const changes=contentDiff({'/':[{key:'cms-1',type:'text',value:'new'}],'/shared':[{key:'cms-2',type:'image',value:'/assets/new.png'}]}, {'/':[{key:'cms-1',type:'text',value:'old'}],'/about':[{key:'cms-3',type:'text',value:'intro'}]});
 assert.equal(changes.length,3);assert.equal(changes.find(c=>c.page==='/shared').after,null);assert.equal(changes.find(c=>c.page==='/about').before,null);assert.deepEqual(contentDiff({},{}),[]);
});
test('database saves immutable snapshots atomically and restores as new revisions',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create table public.academy_cms(key text primary key,value jsonb not null default '{}',revision bigint not null default 0,updated_at timestamptz default now());insert into public.academy_cms(key) values('pages');grant select,insert,update on public.academy_cms to service_role;`);
 await db.exec(fs.readFileSync('supabase/migrations/20261019_content_history.sql','utf8'));
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.exec('select * from public.academy_content_history'));await assert.rejects(db.exec("select public.restore_academy_content(0,0)"));await assert.rejects(db.exec("select public.save_academy_content('{}',0)"));await db.exec('reset role');}
 await db.exec('set role service_role');
 const first={'/':[{key:'cms-1',type:'text',value:'first'}]},second={'/':[{key:'cms-1',type:'text',value:'second'}],'/shared':[{key:'cms-2',type:'image',value:'/assets/photo.jpg'},{key:'cms-3',type:'video',value:'https://media.example/academy.mp4'}]};
 const save=async(value,revision)=>(await db.query('select public.save_academy_content($1,$2) as revision',[JSON.stringify(value),revision])).rows[0].revision;
 const restore=async(target,revision)=>(await db.query('select public.restore_academy_content($1,$2) as revision',[target,revision])).rows[0].revision;
 assert.equal(await save(first,0),1);assert.equal(await save(second,1),2);
 assert.equal(await save({},1),null);assert.equal(await restore(0,1),null);assert.equal(await restore(999,2),null);
 assert.equal((await db.query('select count(*)::int as count from public.academy_content_history')).rows[0].count,3);
 assert.equal(await restore(1,2),3);assert.deepEqual((await db.query("select value from public.academy_cms where key='pages'")).rows[0].value,first);
 const record=(await db.query('select * from public.academy_content_history where revision=3')).rows[0];assert.equal(record.action,'restore');assert.equal(record.restored_from,1);
 assert.equal(await restore(2,3),4);assert.deepEqual((await db.query("select value from public.academy_cms where key='pages'")).rows[0].value,second);
 await assert.rejects(db.exec('delete from public.academy_content_history'));await assert.rejects(db.exec("update public.academy_content_history set value='{}'"));
 // A snapshot write failure must roll back the live CMS update in the same transaction.
 await db.exec("insert into public.academy_content_history(revision,value,action) values(5,'{}','save')");await assert.rejects(save({},4));assert.equal((await db.query("select revision from public.academy_cms where key='pages'")).rows[0].revision,4);
 }finally{await db.close();}
});
test('history API authenticates all operations and refuses invalid or stale restore requests',async()=>{
 const oldAuth=auth.requireAdmin,oldRequest=store.request;const call=async(method,body,url='/api/admin-content-history')=>{const res=response();await history({method,body,url},res);return res;};
 try{
 auth.requireAdmin=async(req,res)=>{res.status(401).json({error:'unauthorized'});return false;};store.request=async()=>{throw Error('must not read');};assert.equal((await call('GET')).code,401);assert.equal((await call('POST',{})).code,401);
 auth.requireAdmin=async()=>true;
 assert.equal((await call('GET',null,'/api/admin-content-history?revision=abc')).code,400);assert.equal((await call('GET',null,'/api/admin-content-history?before=-1')).code,400);assert.equal((await call('POST','{')).code,400);assert.equal((await call('POST',{revision:1,targetRevision:1})).code,400);
 store.request=async()=>[];assert.equal((await call('GET',null,'/api/admin-content-history?revision=1')).code,404);
 const snapshot={revision:0,value:{},action:'baseline'};store.request=async(route)=>route.includes('/rpc/')?null:[snapshot];assert.equal((await call('POST',{revision:1,targetRevision:0})).code,409);
 store.request=async(route,opts)=>{if(route.includes('/rpc/')){assert.deepEqual(JSON.parse(opts.body),{target_revision:0,expected_revision:1});return 2;}return [snapshot];};const restored=await call('POST',{revision:1,targetRevision:0});assert.equal(restored.code,200);assert.equal(restored.data.revision,2);assert.deepEqual(restored.data.pages,{});
 store.request=async()=>{throw Error('unavailable');};assert.equal((await call('GET')).code,503);
 }finally{auth.requireAdmin=oldAuth;store.request=oldRequest;}
});
test('local demo records snapshots and preserves later history after a restore',async()=>{
 const oldAuth=auth.requireAdmin;auth.requireAdmin=async()=>true;
 try{const demo=require('../scripts/demo-content.cjs').createDemo();const call=async(handler,method,body,url='/api/admin-content-history')=>{const res=response();await handler({method,body,url},res);return res;};
 assert.equal((await call(demo.content,'PUT',{revision:0,pages:{'/':[{key:'cms-1',type:'text',value:'first'}]}})).data.revision,1);
 assert.equal((await call(demo.content,'PUT',{revision:1,pages:{}})).data.revision,2);
 const restored=await call(demo.history,'POST',{revision:2,targetRevision:1});assert.equal(restored.data.revision,3);assert.equal(restored.data.pages['/'][0].value,'first');
 assert.equal((await call(demo.history,'GET',null)).data.records.length,4);assert.equal((await call(demo.history,'POST',{revision:2,targetRevision:0})).code,409);
 }finally{auth.requireAdmin=oldAuth;}
});
