const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {parseHTML}=require('linkedom');
const {SECTIONS}=require('../src/analytics/sections.cjs');
const destinations=require('../src/analytics/section-destinations.cjs');

test('each distinct measurement links to its real page or exact homepage anchor and an existing image',()=>{
  const {document}=parseHTML(fs.readFileSync('published-source/index.html','utf8'));
  for(const section of SECTIONS.filter(section=>!section.fallback)){
    const destination=destinations.sectionDestination(section);assert.ok(destination,section.id);
    assert.ok(fs.statSync('published-source'+destination.image).size>0,section.id);
    const url=new URL(destination.href,'https://academy.test');assert.equal(url.origin,'https://academy.test');
    if(url.hash&&section.id!=='event_popup')assert.equal(document.querySelector(url.hash),document.querySelector(section.selector),section.id);
    else if(!url.hash)assert.ok(fs.existsSync('published-source'+url.pathname+'.html'),section.id);
  }
  assert.equal(destinations.sectionDestination({id:'other_public'}),null);
  assert.equal(destinations.sectionDestination({id:'https://evil.test',label:'알 수 없는 구간'}),null);
});

test('names and thumbnails share the correct link; grouped and unknown measurements are not assigned a guessed page',async()=>{
  const {document}=parseHTML('<html><body></body></html>');
  const context={module:{exports:{}},require:()=>destinations,document,AbortSignal,Date,Number,Intl,setTimeout:()=>1,clearTimeout(){}};
  vm.runInNewContext(fs.readFileSync('src/analytics/engagement-panel.cjs','utf8'),context);
  const sections=[{id:'faq',label:'자주 묻는 질문'},{id:'event_popup',label:'첫 안내 팝업'},{id:'other_public',label:'기타 공개 페이지'},{id:'not-known',label:'<img src=x onerror=alert(1)>'}].map(section=>({...section,visitors:3,seconds:30,averageSeconds:10}));
  const panel=context.module.exports.createEngagementPanel({fetcher:async()=>({ok:true,json:async()=>({period:'today',from:'2026-10-30',through:'2026-10-30',updatedAt:'2026-10-30T01:00:00Z',sections})})});
  panel.setActive(true);await new Promise(resolve=>setImmediate(resolve));
  const rows=panel.element.querySelectorAll('.kjt-dwell-table tbody tr');assert.equal(rows.length,4);
  for(const [i,href]of [[0,'/#faq'],[1,'/#announcement']]){
    const link=rows[i].querySelector('a');assert.equal(link.getAttribute('href'),href);assert.equal(link.target,'_blank');assert.match(link.rel,/noopener/);assert.ok(link.querySelector('strong'));assert.ok(link.querySelector('img'));assert.equal(link.querySelector('img').loading,'lazy');
  }
  assert.match(rows[2].textContent,/여러 상세 페이지 합산/);assert.equal(rows[2].querySelector('.kjt-section-destination'),null);assert.equal(rows[2].querySelectorAll('details a').length,8);
  assert.equal(rows[3].querySelectorAll('a,img').length,0);assert.match(rows[3].textContent,/측정 위치를 확인할 수 없습니다/);
});

test('homepage arrival opens the announcement while anchors, daily hiding and private entry points bypass it',()=>{
  const source=fs.readFileSync('published-source/event-popup.js','utf8');
  for(const [pathname,hash,search,stored,shouldOpen]of [
    ['/','#faq','',false,false],['/','','',true,false],['/','','',false,true],
    ['/','#announcement','',true,true],['/','','?admin=1',false,false],['/','','?chat=1',false,false],
    ['/index.html','','',false,true],['/journal','','',false,false],['/admin/editorial','','',false,false]
  ]){
    let opened=false;
    const context={window:{addEventListener(){}},location:{pathname,hash,search},URLSearchParams,Intl,Date,localStorage:{getItem:()=>stored?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()):null},document:{querySelector:()=>null,createElement(){opened=true;throw Error('opened');}}};
    try{vm.runInNewContext(source,context);}catch(error){assert.equal(error.message,'opened');}
    assert.equal(opened,shouldOpen);
  }
});
test('poster preloading follows the same homepage, daily hiding and explicit reopening rules',()=>{
  const source=fs.readFileSync('published-source/event-popup-preload.js','utf8');
  for(const [pathname,hash,search,stored,expected]of [
    ['/','','',false,true],['/','','',true,false],['/','#announcement','',true,true],
    ['/','#faq','',false,false],['/','','?admin=1',false,false],['/','','?chat=1',false,false],['/journal','','',false,false]
  ]){
    let preload=false;
    vm.runInNewContext(source,{location:{pathname,hash,search},URLSearchParams,Intl,Date,localStorage:{getItem:()=>stored?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()):null},document:{createElement:()=>({}),head:{append:()=>{preload=true;}}}});
    assert.equal(preload,expected);
  }
});
