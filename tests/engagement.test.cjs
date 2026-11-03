const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createDwellClock,startDwellTracking}=require('../src/analytics/dwell.cjs');
const {TIME_EVENTS}=require('../src/analytics/sections.cjs');
const {summarize,createHandler}=require('../api/admin-engagement');
const seconds=events=>events.reduce((total,[event])=>total+(TIME_EVENTS[event]||0),0);
test('records one exposure and exact whole seconds across ten-, five- and one-second batches',()=>{
  let time=0;const events=[],clock=createDwellClock({now:()=>time,send:(...event)=>events.push(event)});
  clock.sample('hero',true);for(let i=0;i<17;i++){time+=1000;clock.sample('hero',true);}clock.sample(null,false);clock.flush();
  assert.equal(events.filter(([name])=>name==='section_seen').length,1);assert.equal(seconds(events),17);
  clock.flush();assert.equal(seconds(events),17);assert.ok(events.every(([,data])=>Object.keys(data).join(',')==='section'));
  clock.sample('hero',true);time+=1000;clock.sample('hero',true);clock.flush();assert.equal(events.filter(([name])=>name==='section_seen').length,1);assert.equal(seconds(events),18);
});
test('does not count hidden/inactive periods or long timer suspension as active dwell',()=>{
  let time=0;const events=[],clock=createDwellClock({now:()=>time,send:(...event)=>events.push(event)});
  clock.sample('hero',true);time+=1000;clock.sample('hero',true);clock.sample(null,false);time+=30000;clock.sample(null,false);clock.flush();assert.equal(seconds(events),1);
  clock.sample('programs',true);time+=30000;clock.sample('programs',true);clock.flush();assert.equal(seconds(events),3);
  clock.sample('unknown',true);time+=1000;clock.sample('unknown',true);assert.equal(events.some(([,data])=>data.section==='unknown'),false);
});
test('browser tracker selects a single visible section and excludes overlays, background tabs and idle time',()=>{
  let time=0,tick,overlay=false,focused=true;const events=[],listeners={};
  const hero={getBoundingClientRect:()=>({top:0,bottom:500,width:800}),querySelector:()=>null};
  const programs={getBoundingClientRect:()=>({top:500,bottom:1000,width:800}),querySelector:()=>null};
  const doc={hidden:false,hasFocus:()=>focused,querySelector:selector=>selector==='main > .hero'?hero:selector==='#programs'?programs:null,querySelectorAll:()=>overlay?[{hidden:false,getClientRects:()=>[{}]}]:[],addEventListener(name,fn){listeners[name]=fn;},removeEventListener(){}};
  const win={innerHeight:800,addEventListener(name,fn){listeners[name]=fn;},removeEventListener(){},setInterval(fn){tick=fn;return 1;},clearInterval(){}};
  const stop=startDwellTracking((...event)=>events.push(event),{doc,win,now:()=>time});
  for(let i=0;i<5;i++){time+=1000;tick();}overlay=true;tick();for(let i=0;i<10;i++){time+=1000;tick();}assert.equal(events.some(([,data])=>data.section==='programs'),false);
  overlay=false;listeners.scroll();tick();for(let i=0;i<3;i++){time+=1000;tick();}focused=false;doc.hidden=true;listeners.visibilitychange();const before=seconds(events);
  for(let i=0;i<20;i++){time+=1000;tick();}assert.equal(seconds(events),before);
  focused=true;doc.hidden=false;listeners.visibilitychange();for(let i=0;i<90;i++){time+=1000;tick();}stop();assert.ok(seconds(events)<=before+60);
});
test('engagement totals use weighted seconds and visitors from the exposure event',()=>{
  const rows=[{eventName:'section_seen','eventData/section':'programs',count:5,visitors:3},{eventName:'section_time_10s',eventData:{section:'programs'},count:4,visitors:2},{eventName:'section_time_5s',eventData:'programs',count:1,visitors:1},{eventName:'section_time_1s','eventData/section':'programs',count:3,visitors:1}];
  const report=summarize(rows);assert.equal(report[0].seconds,48);assert.equal(report[0].visitors,3);assert.equal(report[0].averageSeconds,16);assert.equal(report[0].label,'교육과정');assert.deepEqual(summarize([]),[]);
  assert.throws(()=>summarize([{eventName:'Others',eventData:'programs',count:1,visitors:1}]));
});
test('counts a dynamically opened announcement separately, then resumes the uncovered homepage',()=>{
  let time=0,tick,popup=null,extraOverlay=false;const events=[],listeners={};
  const hero={getBoundingClientRect:()=>({top:0,bottom:800,width:800}),querySelector:()=>null};
  const doc={hidden:false,hasFocus:()=>true,querySelector:selector=>selector==='main > .hero'?hero:selector==='dialog.academy-event-popup[open]'?popup:null,querySelectorAll:()=>[...(popup?[popup]:[]),...(extraOverlay?[{hidden:false,getClientRects:()=>[{}]}]:[])],addEventListener(name,fn){listeners[name]=fn;},removeEventListener(){}};
  const win={innerHeight:800,addEventListener(name,fn){listeners[name]=fn;},removeEventListener(){},setInterval(fn){tick=fn;return 1;},clearInterval(){}};
  const stop=startDwellTracking((...event)=>events.push(event),{doc,win,now:()=>time});
  popup={hidden:false,getClientRects:()=>[{}]};
  for(let i=0;i<13;i++){time+=1000;tick();}
  assert.equal(events.some(([,data])=>data.section==='hero'),false);
  extraOverlay=true;tick();const popupSeconds=seconds(events);
  for(let i=0;i<5;i++){time+=1000;tick();}assert.equal(seconds(events),popupSeconds);
  popup=null;extraOverlay=false;listeners.pointerdown();tick();
  for(let i=0;i<4;i++){time+=1000;tick();}stop();
  const report=summarize(Object.entries(Object.groupBy(events,([event,data])=>event+':'+data.section)).map(([key,rows])=>({eventName:rows[0][0],'eventData/section':rows[0][1].section,count:rows.length,visitors:1})));
  assert.equal(report.find(row=>row.id==='event_popup').seconds,12);
  assert.equal(report.find(row=>row.id==='hero').seconds,4);
});
for(const [id,selector] of [['application','#enrollment-root'],['event_application','main.event-layout']])test('tracks '+id+' separately without reading form values',()=>{
  let time=0,tick;const events=[];
  const root={getBoundingClientRect:()=>({top:0,bottom:800,width:800}),querySelector:()=>null};
  const doc={hidden:false,hasFocus:()=>true,querySelector:query=>query===selector?root:null,querySelectorAll:()=>[],addEventListener(){},removeEventListener(){}};
  const win={innerHeight:800,addEventListener(){},removeEventListener(){},setInterval(fn){tick=fn;return 1;},clearInterval(){}};
  const stop=startDwellTracking((...event)=>events.push(event),{doc,win,now:()=>time});
  for(let i=0;i<13;i++){time+=1000;tick();}stop();
  assert.equal(seconds(events),12);assert.ok(events.every(([,data])=>JSON.stringify(data)===JSON.stringify({section:id})));
});
test('database count uses a HEAD request and never downloads applicant records',async t=>{
  const originalFetch=global.fetch,originalUrl=process.env.SUPABASE_URL,originalKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  t.after(()=>{global.fetch=originalFetch;if(originalUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=originalUrl;if(originalKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=originalKey;});
  process.env.SUPABASE_URL='https://database.test';process.env.SUPABASE_SERVICE_ROLE_KEY='test-private-key';
  let total='0-0/4';global.fetch=async(url,options)=>{assert.equal(options.method,'HEAD');assert.equal(options.headers.Prefer,'count=exact');return{ok:true,headers:{get:()=>total}};};
  const {count}=require('../api/_cms-store');assert.equal(await count('/rest/v1/academy_inquiries?select=id&limit=1'),4);
  total='*/0';assert.equal(await count('/rest/v1/academy_inquiries?select=id&limit=1'),0);
  total=null;await assert.rejects(count('/rest/v1/academy_inquiries?select=id&limit=1'));
});
test('engagement API requires authentication, fixes the project and range, caches reads and reports an empty period honestly',async()=>{
  const res=()=>({code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(data){this.data=data;return this;}});
  let allowed=true,calls=0;
  const applicationRoutes=[];
  const handler=createHandler({authorize:async(req,r)=>{if(allowed)return true;r.status(401).json({error:'로그인 필요'});return false;},token:()=> 'private-test-token',now:()=>new Date('2026-10-29T04:30:00Z'),countApplications:async route=>{applicationRoutes.push(route);return new URL(route,'https://database.test').searchParams.get('purposes')==='cs.["수강 신청"]'?3:12;},fetcher:async url=>{calls++;const q=new URL(url).searchParams;assert.equal(q.get('since'),'2026-10-28T15:00:00.000Z');if(q.get('by')==='environment'){const form=q.get('filter').includes('requestPath'),consult=q.get('filter').includes("'/apply'");return{ok:true,json:async()=>({query:{since:q.get('since')},data:[{environment:'production',visitors:form?(consult?3:2):url.includes('/visits/')?80:8,...(form?{pageviews:consult?6:3}:{})}]})};}assert.deepEqual(q.getAll('by'),['eventName','eventData/section']);assert.equal(q.get('limit'),'100');return{ok:true,json:async()=>({query:{since:q.get('since')},data:[]})};}});
  const req={method:'GET',url:'/api/admin-engagement?period=today'},first=res();await handler(req,first);assert.equal(first.code,200);assert.deepEqual(first.data.sections,[]);assert.equal(first.headers['Cache-Control'],'private, no-store');assert.doesNotMatch(JSON.stringify(first),/private-test-token/);
  assert.deepEqual(first.data.coverage,{visitors:80,trackedVisitors:8});assert.equal(first.data.applications,3);assert.equal(first.data.eventApplications,12);assert.deepEqual(first.data.formPages.map(p=>[p.id,p.pageVisitors,p.measuredVisitors]),[['application',3,0],['event_application',2,0]]);
  assert.equal(applicationRoutes.length,2);
  const [consultation,event]=applicationRoutes.map(route=>new URL(route,'https://database.test').searchParams);
  for(const query of [consultation,event]){assert.equal(query.get('select'),'id');assert.deepEqual(query.getAll('created_at'),['gte.2026-10-28T15:00:00.000Z','lt.2026-10-29T04:30:00.000Z']);}
  assert.deepEqual(consultation.getAll('purposes'),['cs.["수강 신청"]','not.cs.["무료특강 신청"]']);assert.equal(consultation.has('courses'),false);
  assert.equal(event.get('purposes'),'cs.["무료특강 신청"]');assert.equal(event.get('courses'),'cs.["11/7 김정태 무료특강"]');
  await handler(req,res());assert.equal(calls,5);assert.equal(applicationRoutes.length,2);allowed=false;const denied=res();await handler(req,denied);assert.equal(denied.code,401);assert.equal(calls,5);assert.equal(applicationRoutes.length,2);
});
test('report keeps consultation and free lecture counts, links and dwell rows distinct',async()=>{
  const {document}=require('linkedom').parseHTML('<html><body></body></html>');const vm=require('node:vm'),fs=require('node:fs');let calls=0;
  const context={module:{exports:{}},require:()=>require('../src/analytics/section-destinations.cjs'),document,AbortSignal,Date,Number,Intl,setTimeout:()=>1,clearTimeout(){}};
  vm.runInNewContext(fs.readFileSync('src/analytics/engagement-panel.cjs','utf8'),context);
  const widget=context.module.exports.createEngagementPanel({fetcher:async()=>{calls++;return{ok:true,json:async()=>({period:'today',from:'2026-10-29',through:'2026-10-29',updatedAt:'2026-10-29T04:30:00Z',collectionEnabledAt:'2026-10-29T06:06:55.354Z',coverage:{visitors:80,trackedVisitors:8},applications:3,eventApplications:12,formPages:[{id:'application',label:'수강 상담',enabledAt:'2026-10-29T06:26:06.165Z',pageVisitors:3,measuredVisitors:2},{id:'event_application',label:'11/7 무료 특강',enabledAt:'2026-10-29T06:31:58.006Z',pageVisitors:5,measuredVisitors:4}],sections:[{label:'수강 상담 신청 페이지',visitors:2,seconds:40,averageSeconds:20},{label:'무료 특강 신청 페이지',visitors:4,seconds:120,averageSeconds:30}]})};}});
  assert.equal(calls,0);widget.setActive(true);await new Promise(resolve=>setImmediate(resolve));
  const cards=[...widget.element.querySelectorAll('.kjt-application-count')];assert.equal(cards.length,2);assert.match(cards[0].textContent,/수강 상담 신청3건/);assert.match(cards[1].textContent,/11\/7 무료 특강 신청12건/);
  assert.equal(cards[0].querySelector('a').getAttribute('href'),'/admin/admissions');assert.equal(cards[1].querySelector('a').getAttribute('href'),'/admin/event-applications');
  const comparison=widget.element.querySelector('[aria-label="신청 페이지 방문과 체류 측정 비교"]');assert.match(comparison.textContent,/페이지 방문체류 측정/);const comparisonRows=comparison.querySelectorAll('tbody tr');assert.match(comparisonRows[0].textContent,/3명2명/);assert.match(comparisonRows[1].textContent,/5명4명/);
  const tables=widget.element.querySelectorAll('table'),rows=[...tables[tables.length-1].querySelectorAll('tbody tr')];assert.equal(rows.length,2);
  for(const [i,label,href,values]of [[0,'수강 상담 신청 페이지','/apply',['2명','20초','40초']],[1,'무료 특강 신청 페이지','/events/kim-jung-tae-20261107',['4명','30초','2분 0초']]]){
    assert.match(rows[i].querySelector('strong').textContent,new RegExp(label));assert.equal(rows[i].querySelector('.kjt-section-destination').getAttribute('href'),href);assert.deepEqual([...rows[i].querySelectorAll('td')].slice(1).map(td=>td.textContent),values);
  }
  assert.match(widget.element.textContent,/부분 수집일/);assert.match(widget.element.textContent,/선택 기간 전체 방문 80명 · 체류 기록 8명/);assert.match(widget.element.textContent,/체류 기록이 없는 방문 72명/);
  widget.setActive(false);assert.equal(widget.element.querySelectorAll('.kjt-application-count').length,0);
});
test('covers a public detail page with one fallback surface instead of dropping the visit',()=>{
 let time=0,tick;const events=[];const main={getBoundingClientRect:()=>({top:0,bottom:1600,width:800})};
 const belowFold={getBoundingClientRect:()=>({top:1800,bottom:2200,width:800})};
 const doc={hidden:false,hasFocus:()=>false,querySelector:selector=>selector==='main'?main:selector==='#about'?belowFold:null,querySelectorAll:()=>[],addEventListener(){},removeEventListener(){}};
 const win={innerHeight:800,addEventListener(){},removeEventListener(){},setInterval(fn){tick=fn;return 1;},clearInterval(){}};
 const stop=startDwellTracking((...event)=>events.push(event),{doc,win,now:()=>time});for(let i=0;i<12;i++){time+=1000;tick();}stop();
 assert.equal(seconds(events),11);assert.ok(events.every(([,data])=>data.section==='other_public'));
});
test('unavailable page traffic stays unavailable instead of being set to the measured count',async()=>{
 const handler=createHandler({authorize:async()=>true,token:()=> 'test-token',now:()=>new Date('2026-10-29T07:00:00Z'),countApplications:async()=>0,fetcher:async url=>{
  const q=new URL(url).searchParams;if(q.get('filter').includes('requestPath'))return{ok:false};
  return{ok:true,json:async()=>({query:{since:q.get('since')},data:[]})};
 }});
 const res={setHeader(){},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
 await handler({method:'GET',url:'/api/admin-engagement'},res);assert.ok(res.data.formPages.every(page=>page.pageVisitors===null&&page.pageviews===null&&page.measuredVisitors===0));
 assert.equal(res.data.collectionEnabledAt,'2026-10-29T06:06:55.354Z');
});
