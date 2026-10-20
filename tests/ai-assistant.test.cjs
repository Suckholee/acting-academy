const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const api=require('../api/ai-assistant');
const auth=require('../api/_admin');
const res=()=>({code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(v){this.code=v;return this;},json(v){this.data=v;return this;}});
async function call(handler,body,headers={},method='POST'){const r=res();await handler({method,body,headers:{host:'localhost',...headers},socket:{remoteAddress:'127.0.0.1'}},r);return r;}
test('demo is explicit; validation and admin authorization cannot be bypassed',async()=>{
 const handler=api.createHandler({demo:true});
 assert.equal((await call(handler,null,{},'GET')).data.mode,'demo');
 const answer=await call(handler,{task:'recommend',text:'뮤지컬 취미'});
 assert.equal(answer.data.mode,'demo');assert.match(answer.data.answer,/취미반/);
 assert.equal((await call(handler,{task:'__proto__',text:'x'})).code,400);
 assert.equal((await call(handler,{task:'inquiry',text:' '})).code,400);
 assert.equal((await call(handler,'{')).code,400);
 assert.equal((await call(handler,{task:'reply',text:'문의'})).code,401);
 assert.equal((await call(handler,{task:'inquiry',text:'질문'},{origin:'https://other.invalid'})).code,403);
 assert.equal((await call(handler,{task:'inquiry',text:'x'.repeat(6001)})).code,400);
});
test('live connection requires configuration and consent, preserves limits and handles provider failures',async()=>{
 const keys=['OPENAI_API_KEY','OPENAI_MODEL','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','ADMIN_SESSION_SECRET'];
 const env=Object.fromEntries(keys.map(k=>[k,process.env[k]]));let sent;
 try{
  keys.forEach(k=>delete process.env[k]);
  assert.equal((await call(api,{task:'inquiry',text:'질문'})).code,503);
  keys.forEach(k=>process.env[k]='test-only');
  const handler=api.createHandler({limit:async()=>0,fetcher:async(url,options)=>{sent=JSON.parse(options.body);assert.equal(url,'https://api.openai.com/v1/responses');return {ok:true,json:async()=>({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'안내 답변'}]}]})};}});
  assert.equal((await call(handler,{task:'inquiry',text:'질문'})).code,400);
  const answer=await call(handler,{task:'inquiry',text:'질문',consent:true});assert.equal(answer.data.mode,'live');assert.equal(sent.store,false);assert.match(sent.instructions,/카메라·무대 연기 기초/);assert.equal(sent.input,'질문');
  let fetched=false;const limited=api.createHandler({limit:async()=>60,fetcher:async()=>{fetched=true;}});
  const blocked=await call(limited,{task:'inquiry',text:'질문',consent:true});assert.equal(blocked.code,429);assert.equal(blocked.headers['Retry-After'],'60');assert.equal(fetched,false);
  const failed=api.createHandler({limit:async()=>{throw Error('storage');},fetcher:async()=>{fetched=true;}});assert.equal((await call(failed,{task:'inquiry',text:'질문',consent:true})).code,503);assert.equal(fetched,false);
  const empty=api.createHandler({limit:async()=>0,fetcher:async()=>({ok:true,json:async()=>({status:'incomplete',output:[]})})});assert.equal((await call(empty,{task:'inquiry',text:'질문',consent:true})).code,503);
  const before=auth.requireAdmin;try{auth.requireAdmin=async()=>true;const draft=await call(handler,{task:'review',text:'실제 후기 원문',consent:true});assert.equal(draft.code,200);assert.match(sent.instructions,/원문/);}finally{auth.requireAdmin=before;}
 }finally{for(const k of keys)env[k]===undefined?delete process.env[k]:process.env[k]=env[k];}
});
test('shared AI budget enforces IP/global limits and database access controls',async()=>{
 const db=new PGlite();try{
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');await db.exec(fs.readFileSync('supabase/migrations/20261019_ai_limits.sql','utf8'));
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select public.consume_academy_ai_attempt($1)',['a'.repeat(64)]));await assert.rejects(db.exec('select * from public.academy_ai_limits'));await db.exec('reset role');}
 await db.exec('set role service_role');const consume=async bucket=>(await db.query('select public.consume_academy_ai_attempt($1) as retry',[bucket])).rows[0].retry;
 for(let i=0;i<10;i++)assert.equal(await consume('a'.repeat(64)),0);assert.ok(await consume('a'.repeat(64))>0);
 await db.exec("update public.academy_ai_limits set expires_at=now()-interval '1 second' where bucket <> 'global'");assert.equal(await consume('a'.repeat(64)),0);
 await db.exec("update public.academy_ai_limits set attempts=200 where bucket='global'");assert.ok(await consume('b'.repeat(64))>0);
 }finally{await db.close();}
});
