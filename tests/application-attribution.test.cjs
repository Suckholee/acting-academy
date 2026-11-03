const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {classifyEntry,entrySource,normalizeSource}=require('../src/analytics/attribution.cjs');
const {createHandler}=require('../api/admin-application-sources');
const response=()=>({code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(data){this.data=data;return this;}});
test('first platform survives internal navigation, expires and stores only an enum and expiry',()=>{
 const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
 assert.equal(entrySource({href:'https://www.kactstar.com/?phone=private',referrer:'https://l.facebook.com/private?secret=x',storage,now:1000}),'facebook');
 assert.equal(entrySource({href:'https://www.kactstar.com/apply',referrer:'https://www.kactstar.com/',storage,now:2000}),'facebook');
 assert.equal(entrySource({href:'https://www.kactstar.com/events/kim-jung-tae-20261107',referrer:'https://www.kactstar.com/',storage,now:3000}),'facebook');
 assert.equal(memory.size,1);assert.deepEqual(Object.keys(JSON.parse([...memory.values()][0])),['source','expiresAt']);assert.doesNotMatch([...memory.values()][0],/phone|private|facebook.com|secret/);
 assert.equal(entrySource({href:'https://www.kactstar.com/apply',referrer:'https://www.kactstar.com/',storage,now:2000000}),'unknown');
 assert.equal(classifyEntry('https://www.kactstar.com/?utm_source=ig',''),'instagram');
 assert.equal(classifyEntry('https://www.kactstar.com/','https://facebook.com.evil.test/'),'other');assert.equal(classifyEntry('https://www.kactstar.com/',''),'direct');
 assert.equal(normalizeSource('<script>'),'unknown');
 assert.equal(entrySource({href:'https://www.kactstar.com/apply',referrer:'https://www.kactstar.com/',storage:{getItem(){throw Error();},setItem(){throw Error();}}}),'unknown');
});
test('private conversion API only requests aggregate counts and authenticates cached reads',async()=>{
 let allowed=true,calls=0;const handler=createHandler({authorize:async(req,res)=>{if(allowed)return true;res.status(401).json({error:'login'});return false;},now:()=>new Date('2026-10-29T07:00:00Z'),database:{request:async(route,options)=>{calls++;assert.equal(route,'/rest/v1/rpc/academy_application_sources');assert.deepEqual(JSON.parse(options.body),{p_since:'2026-10-28T15:00:00.000Z',p_until:'2026-10-29T07:00:00.000Z'});return[{source:'uncollected',consultations:3,events:2}];}}});
 const req={method:'GET',url:'/api/admin-application-sources?period=today'},first=response();await handler(req,first);assert.equal(first.code,200);assert.deepEqual(first.data.sources,[{source:'uncollected',consultations:3,events:2}]);assert.equal(first.headers['Cache-Control'],'private, no-store');
 await handler(req,response());assert.equal(calls,1);allowed=false;const denied=response();await handler(req,denied);assert.equal(denied.code,401);assert.equal(calls,1);
});
test('SQL preserves historical unknowns, separates application types and grants no public access',async()=>{
 const {PGlite}=require('@electric-sql/pglite'),db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role;create table academy_inquiries(id int,purposes jsonb,courses jsonb,created_at timestamptz);insert into academy_inquiries values(1,'["수강 신청"]','[]','2026-10-29T01:00:00Z');`);
  await db.exec(fs.readFileSync('supabase/migrations/20261029_application_attribution.sql','utf8'));await db.exec(fs.readFileSync('supabase/migrations/20261029_application_attribution.sql','utf8'));
  await db.exec(`insert into academy_inquiries values(2,'["수강 신청"]','[]','2026-10-29T02:00:00Z','facebook'),(3,'["무료특강 신청"]','["11/7 김정태 무료특강"]','2026-10-29T03:00:00Z','facebook'),(4,'["무료특강 신청"]','["다른 행사"]','2026-10-29T03:00:00Z','facebook'),(5,'["수강 신청","무료특강 신청"]','["11/7 김정태 무료특강"]','2026-10-29T03:00:00Z','instagram');`);
  const {rows}=await db.query("select * from academy_application_sources('2026-10-28T15:00:00Z','2026-10-29T15:00:00Z') order by source");
  assert.deepEqual(rows.map(r=>({...r,consultations:Number(r.consultations),events:Number(r.events)})),[{source:'facebook',consultations:1,events:1},{source:'instagram',consultations:0,events:1},{source:'uncollected',consultations:1,events:0}]);
  const permissions=await db.query("select has_function_privilege('anon','academy_application_sources(timestamptz,timestamptz)','execute') as anon,has_function_privilege('authenticated','academy_application_sources(timestamptz,timestamptz)','execute') as authenticated");assert.deepEqual(permissions.rows,[{anon:false,authenticated:false}]);
 }finally{await db.close();}
});
test('conversion report names uncollected historical sources honestly and keeps type counts separate',async()=>{
 const {document}=require('linkedom').parseHTML('<html><body></body></html>'),vm=require('node:vm');
 const context={module:{exports:{}},require,document,fetch:()=>{},AbortSignal,Date,Number,setTimeout:()=>1,clearTimeout(){}};
 const code=fs.readFileSync('src/analytics/conversion-panel.cjs','utf8');context.require=p=>require('../src/analytics/'+p.replace('./',''));vm.runInNewContext(code,context);
 let calls=0;const widget=context.module.exports.createConversionPanel({fetcher:async()=>{calls++;return{ok:true,json:async()=>({period:'today',from:'2026-10-29',through:'2026-10-29',updatedAt:'2026-10-29T07:00:00Z',sources:[{source:'facebook',consultations:1,events:2},{source:'uncollected',consultations:3,events:2}]})};}});
 assert.equal(calls,0);widget.setActive(true);await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,1);
 assert.match(widget.element.textContent,/기존 신청 · 출처 미수집3건2건/);assert.match(widget.element.textContent,/페이스북1건2건/);widget.setActive(false);assert.equal(widget.element.querySelectorAll('tbody tr').length,0);
});
