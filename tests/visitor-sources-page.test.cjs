const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const esbuild=require('esbuild');
const {parseHTML}=require('linkedom');
const {sourceName}=require('../src/analytics/source-model.cjs');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const data=period=>({period,from:'2026-10-23',through:'2026-10-29',updatedAt:'2026-10-29T04:30:00Z',sources:[{hostname:'m.search.naver.com',visitors:3,pageviews:4},{hostname:'',visitors:8,pageviews:10},{hostname:'<img src=x onerror=alert(1)>',visitors:1,pageviews:1}]});
const ok=data=>({ok:true,json:async()=>data});
function panel(fetcher){
  const {document}=parseHTML('<html><body></body></html>');
  const context={module:{exports:{}},require:()=>({sourceName}),document,fetch:fetcher,AbortSignal,Date,Number,setTimeout:()=>1,clearTimeout(){}};
  vm.runInNewContext(fs.readFileSync('src/analytics/source-panel.cjs','utf8'),context);
  const widget=context.module.exports.createVisitorSources({fetcher});document.body.append(widget.element);return{widget,document};
}
test('source panel loads only after authentication and renders domains as text',async()=>{
  let calls=0;const {widget,document}=panel(async()=>{calls++;return ok(data('today'));});
  assert.equal(calls,0);widget.setActive(true);await flush();assert.equal(calls,1);
  assert.match(widget.element.textContent,/네이버/);assert.match(widget.element.textContent,/직접 방문·확인 불가/);assert.equal(document.querySelectorAll('img').length,0);
  assert.equal(sourceName('l.instagram.com'),'인스타그램');assert.equal(sourceName('m.facebook.com'),'페이스북');assert.equal(sourceName('naver.com.evil.test'),'naver.com.evil.test');
  widget.setActive(false);assert.equal(widget.element.hidden,true);assert.equal(widget.element.querySelectorAll('tbody tr').length,0);
});
test('period changes ignore stale responses and deactivation suppresses pending results',async()=>{
  let finish;const {widget}=panel(async url=>url.endsWith('today')?new Promise(resolve=>{finish=resolve;}):ok(data('7d')));
  widget.setActive(true);const select=widget.element.querySelector('select');select.querySelector('option[value="7d"]').selected=true;select.onchange();await flush();
  finish(ok({...data('today'),sources:[]}));await flush();assert.match(widget.element.textContent,/네이버/);
  widget.setActive(false);assert.equal(widget.element.querySelectorAll('tbody tr').length,0);
});
test('dedicated page requires admin authentication and honors the period in its address',async()=>{
  const code=esbuild.buildSync({entryPoints:['src/analytics/sources-page.js'],bundle:true,platform:'browser',write:false}).outputFiles[0].text;
  for(const authenticated of [false,true]){
    const {document}=parseHTML(fs.readFileSync('published-source/admin/visitor-sources.html','utf8'));const calls=[];
    const context={document,URLSearchParams,location:{search:'?period=7d'},history:{replaceState(){}},AbortSignal,Date,Number,setTimeout:()=>1,clearTimeout(){},fetch:async url=>{calls.push(url);return url.includes('admin-auth')?ok({authenticated}):url.includes('visitor-stats')?ok({todayVisitors:12,totalVisitors:37,updatedAt:'2026-10-29T04:30:00Z'}):ok(data('7d'));}};
    vm.runInNewContext(code,context);await flush();await flush();
    if(authenticated){assert.ok(calls.includes('/api/admin-visitor-sources?period=7d'));assert.match(document.querySelector('#visitor-sources-root').textContent,/네이버/);}
    else{assert.deepEqual(calls,['/api/admin-auth']);assert.ok(document.querySelector('input[type="password"]'));assert.equal(document.querySelectorAll('tbody tr').length,0);}
    assert.equal(document.querySelector('dialog'),null);
  }
});
