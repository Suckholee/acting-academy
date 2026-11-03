const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createHandler}=require('../api/admin-visitor-sources');
const response=()=>({code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(data){this.data=data;return this;}});
const request=period=>({method:'GET',url:'/api/admin-visitor-sources?period='+period,headers:{}});
const value=data=>({ok:true,json:async()=>data});
const fixture=url=>{
  const q=new URL(url).searchParams,filter=q.get('filter');let data;
  if(q.get('by')==='environment'){
    const values=filter.includes("referrerHostname eq 'naver.com'")?[3,5]:filter.includes("referrerHostname eq 'instagram.com'")?[5,6]:null;
    data=values?[{environment:'production',visitors:values[0],pageviews:values[1]}]:[];
  }else data=[{referrerHostname:'',visitors:8,pageviews:12},{referrerHostname:'Others',visitors:1,pageviews:2}];
  return value({query:{since:q.get('since')},data});
};
test('queries source hostnames for fixed production project and Korean date ranges',async()=>{
  const calls=[];
  const handler=createHandler({authorize:async()=>true,token:()=> 'secret-test-key',now:()=>new Date('2026-10-29T04:30:00Z'),fetcher:async(url,options)=>{calls.push({url,options});return fixture(url);}});
  for(const [period,start]of [['today','2026-10-28T15:00:00.000Z'],['7d','2026-10-22T15:00:00.000Z'],['30d','2026-09-29T15:00:00.000Z']]){
    const res=response();await handler(request(period),res);assert.equal(res.code,200);
    const query=new URL(calls.at(-1).url).searchParams;
    assert.equal(query.get('since'),start);assert.equal(query.get('until'),'2026-10-29T04:30:00.000Z');
    assert.equal(query.get('by'),'referrerHostname');assert.match(query.get('filter'),/environment eq 'production' and not/);assert.equal(query.get('limit'),'20');
    assert.deepEqual(res.data.sources.map(r=>r.visitors),[8,5,3,1]);
    assert.equal(res.data.period,period);assert.equal(res.data.timezone,'Asia/Seoul');
    assert.equal(res.headers['Cache-Control'],'private, no-store');
    assert.doesNotMatch(JSON.stringify(res),/secret-test-key/);
  }
});
test('authorizes cached reads, shares concurrent work, and separates periods and Korean dates',async()=>{
  let allowed=true,calls=0,clock=new Date('2026-10-29T14:59:59Z');
  const handler=createHandler({authorize:async(req,res)=>{if(allowed)return true;res.status(401).json({error:'로그인 필요'});return false;},token:()=> 'test',now:()=>clock,fetcher:async url=>{calls++;return fixture(url);}});
  await Promise.all([handler(request('today'),response()),handler(request('today'),response())]);assert.equal(calls,9);
  await handler(request('today'),response());assert.equal(calls,9);
  await handler(request('7d'),response());assert.equal(calls,18);
  allowed=false;const denied=response();await handler(request('today'),denied);assert.equal(denied.code,401);assert.equal(calls,18);
  allowed=true;clock=new Date('2026-10-29T15:00:00Z');await handler(request('today'),response());assert.equal(calls,27);
});
test('rejects unsupported periods, writes, malformed rows and shifted date bounds',async()=>{
  const handler=createHandler({authorize:async()=>true,token:()=> 'test',fetcher:async()=>{throw Error('must not query');}});
  for(const period of ['365d','__proto__','constructor']){const res=response();await handler(request(period),res);assert.equal(res.code,400);}
  const write=response();await handler({...request('today'),method:'POST'},write);assert.equal(write.code,405);
  for(const data of [
    {query:{since:'2026-10-28T00:00:00.000Z'},data:[]},
    {query:{since:'2026-10-28T15:00:00.000Z'},data:[{referrerHostname:'https://example.com/?token=secret',visitors:1,pageviews:1}]},
    {query:{since:'2026-10-28T15:00:00.000Z'},data:[{referrerHostname:'example.com',visitors:-1,pageviews:1}]},
  ]){
    const bad=createHandler({authorize:async()=>true,token:()=> 'test',now:()=>new Date('2026-10-29T04:30:00Z'),fetcher:async()=>value(data)}),res=response();await bad(request('today'),res);assert.equal(res.code,503);assert.equal(res.data.sources,undefined);
  }
});
test('distinguishes a confirmed empty period from unavailable statistics',async()=>{
  const empty=createHandler({authorize:async()=>true,token:()=> 'test',fetcher:async url=>value({query:{since:new URL(url).searchParams.get('since')},data:[]})}),res=response();await empty(request('today'),res);assert.equal(res.code,200);assert.deepEqual(res.data.sources,[]);
  for(const options of [{token:()=>undefined},{token:()=> 'test',fetcher:async()=>({ok:false})}]){const unavailable=createHandler({authorize:async()=>true,...options}),failed=response();await unavailable(request('today'),failed);assert.equal(failed.code,503);assert.equal(failed.data.sources,undefined);}
});

test('combines all Facebook addresses in one distinct-visitor query rather than summing per-host visitors',async()=>{
  const queries=[];const handler=createHandler({authorize:async()=>true,token:()=> 'test',fetcher:async url=>{const q=new URL(url).searchParams;queries.push(q);return q.get('by')==='environment'&&q.get('filter').includes("referrerHostname eq 'facebook.com'")?value({query:{since:q.get('since')},data:[{environment:'production',visitors:7,pageviews:12}]}):fixture(url);}});
  const res=response();await handler(request('today'),res);const facebook=res.data.sources.filter(r=>r.hostname==='facebook.com');assert.equal(facebook.length,1);assert.equal(facebook[0].visitors,7);assert.equal(facebook[0].grouped,true);
  const query=queries.find(q=>q.get('by')==='environment'&&q.get('filter').includes("referrerHostname eq 'facebook.com'"));assert.match(query.get('filter'),/endswith\(referrerHostname, '\.facebook\.com'\)/);assert.match(queries.find(q=>q.get('by')==='referrerHostname').get('filter'),/and not/);
});
