const {test} = require('node:test');
const assert = require('node:assert/strict');
const {createHandler, koreaDay} = require('../api/admin-visitor-stats');
const response = () => ({code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(data){this.data=data;return this;}});
const request = {method:'GET',headers:{}};
const allow = async () => true;
const value = data => ({ok:true,json:async()=>data});
const dataFor = (url, today=7, total=52) => url.includes('/aggregate?')
  ? value({query:{since:new URL(url).searchParams.get('since')},data:[{environment:'production',visitors:today,pageviews:20}]})
  : value({data:{visitors:total,pageviews:106}});

test('uses Korean midnight and deduplicated daily summary rather than summing hourly visitors', async () => {
  const calls=[];
  const handler=createHandler({authorize:allow,token:()=> 'private-test-token',now:()=>new Date('2026-10-29T04:30:00Z'),fetcher:async(url,options)=>{calls.push({url,options});return dataFor(url);}});
  const res=response();await handler(request,res);
  assert.equal(res.code,200);
  assert.equal(res.data.todayVisitors,7);
  assert.equal(res.data.totalVisitors,52);
  assert.equal(res.data.date,'2026-10-29');
  assert.equal(res.data.timezone,'Asia/Seoul');
  const query=new URL(calls[0].url).searchParams;
  assert.equal(query.get('since'),'2026-10-28T15:00:00.000Z');
  assert.equal(query.get('until'),'2026-10-29T04:30:00.000Z');
  assert.equal(query.get('by'),'environment');
  assert.equal(query.get('filter'),"environment eq 'production'");
  assert.ok(!calls[1].url.includes('since='),'cumulative query must not be limited to the reporting window');
  assert.equal(calls[0].options.headers.Authorization,'Bearer private-test-token');
  assert.doesNotMatch(JSON.stringify(res),/private-test-token/);
  assert.equal(res.headers['Cache-Control'],'private, no-store');
});

test('authenticates every request, including cached results, and never queries for an unauthenticated visitor', async () => {
  let allowed=true,calls=0;
  const handler=createHandler({authorize:async(req,res)=>{if(allowed)return true;res.status(401).json({error:'관리자 로그인이 필요합니다.'});return false;},token:()=> 'test',fetcher:async url=>{calls++;return dataFor(url);}});
  await handler(request,response());assert.equal(calls,2);
  allowed=false;const res=response();await handler(request,res);
  assert.equal(res.code,401);assert.equal(res.data.todayVisitors,undefined);assert.equal(calls,2);
});

test('coalesces concurrent requests and invalidates the cache at Korean midnight', async () => {
  let clock=new Date('2026-10-29T14:59:59Z'),calls=0;
  const handler=createHandler({authorize:allow,token:()=> 'test',now:()=>clock,fetcher:async url=>{calls++;return dataFor(url);}});
  await Promise.all([handler(request,response()),handler(request,response())]);assert.equal(calls,2);
  await handler(request,response());assert.equal(calls,2);
  clock=new Date('2026-10-29T15:00:00Z');const res=response();await handler(request,res);
  assert.equal(calls,4);assert.equal(res.data.date,'2026-10-30');
  assert.equal(koreaDay(new Date('2026-12-31T15:00:00Z')),'2027-01-01');
});

test('does not invent zero visitors on missing credentials, service failures, or malformed data', async () => {
  for (const options of [
    {token:()=>undefined,fetcher:async()=>{throw Error('must not query');}},
    {token:()=> 'test',fetcher:async()=>({ok:false})},
    {token:()=> 'test',fetcher:async url=>dataFor(url,-1,52)},
    {token:()=> 'test',fetcher:async()=>value({})},
  ]) {
    const handler=createHandler({authorize:allow,...options}),res=response();await handler(request,res);
    assert.equal(res.code,503);assert.equal(res.data.todayVisitors,undefined);assert.equal(res.data.totalVisitors,undefined);
  }
  const handler=createHandler({authorize:allow,token:()=> 'test',fetcher:async url=>dataFor(url,0,0)}),res=response();
  await handler(request,res);assert.equal(res.data.todayVisitors,0);assert.equal(res.data.totalVisitors,0);
});

test('rejects writes without querying analytics', async () => {
  const handler=createHandler({authorize:allow,fetcher:async()=>{throw Error('must not query');}}),res=response();
  await handler({...request,method:'POST'},res);assert.equal(res.code,405);
});

test('rejects shifted daily bounds and unexpected groups; accepts an empty confirmed day as zero', async () => {
  for (const daily of [
    {query:{since:'2026-10-28T00:00:00.000Z'},data:[{environment:'production',visitors:7}]},
    {query:{since:'2026-10-28T15:00:00.000Z'},data:[{environment:'preview',visitors:7}]},
    {query:{since:'2026-10-28T15:00:00.000Z'},data:[{environment:'production',visitors:7},{environment:'production',visitors:8}]},
    {query:{since:'2026-10-28T15:00:00.000Z'},data:[]},
  ]) {
    const handler=createHandler({authorize:allow,token:()=> 'test',now:()=>new Date('2026-10-29T04:30:00Z'),fetcher:async url=>url.includes('/aggregate?')?value(daily):dataFor(url)}),res=response();
    await handler(request,res);
    assert.equal(res.code,daily.data.length===0?200:503);
    if(!daily.data.length)assert.equal(res.data.todayVisitors,0);
  }
});
