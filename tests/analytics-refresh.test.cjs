const {test}=require('node:test'),assert=require('node:assert/strict');
const {createHandler}=require('../api/admin-visitor-stats');
const {createAnalyticsFetcher,REFRESH_MS}=require('../src/analytics/upstream.cjs');
const res=()=>({code:200,setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}});
test('shares hourly snapshots and keeps an authenticated last-known value on a provider limit',async()=>{
 let clock=new Date('2026-10-29T07:00:00Z'),limited=false,allowed=true,calls=0;
 const handler=createHandler({authorize:async(req,r)=>{if(allowed)return true;r.status(401).json({error:'login'});return false;},now:()=>clock,token:()=> 'private-test-token',fetcher:async url=>{
  calls++;if(limited)return{ok:false,status:429,headers:{get:key=>key==='x-ratelimit-reset'?String(Date.parse('2026-10-29T08:00:00Z')/1000):null}};
  return{ok:true,json:async()=>url.includes('/aggregate?')?{query:{since:new URL(url).searchParams.get('since')},data:[{environment:'production',visitors:7}]}:{data:{visitors:30}}};
 }});
 const req={method:'GET'},first=res();await handler(req,first);assert.equal(calls,2);
 clock=new Date(clock.getTime()+REFRESH_MS-1);await handler(req,res());assert.equal(calls,2);
 clock=new Date(clock.getTime()+2);limited=true;const stale=res();await handler(req,stale);assert.equal(stale.code,200);assert.equal(stale.data.todayVisitors,7);assert.equal(stale.data.stale,true);assert.equal(stale.data.updatedAt,first.data.updatedAt);assert.match(stale.data.warning,/조회 한도/);assert.equal(calls,4);
 await handler(req,res());assert.equal(calls,4);allowed=false;const denied=res();await handler(req,denied);assert.equal(denied.code,401);assert.equal(calls,4);
});
test('respects the supplied retry time without retrying the provider during cooldown',async()=>{
 let at=new Date('2026-10-29T07:00:00Z'),calls=0;const query=createAnalyticsFetcher(async()=>{calls++;return{ok:false,status:429,headers:{get:key=>key==='retry-after'?'120':null}};},{now:()=>at});
 await assert.rejects(query('https://api.vercel.com/test'),error=>error.retryAt==='2026-10-29T07:02:00.000Z');
 at=new Date('2026-10-29T07:01:00Z');await assert.rejects(query('https://api.vercel.com/test'));assert.equal(calls,1);
 at=new Date('2026-10-29T07:02:01Z');await assert.rejects(query('https://api.vercel.com/test'));assert.equal(calls,2);
});
