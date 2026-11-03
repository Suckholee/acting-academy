const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {parseHTML}=require('linkedom');
const source=fs.readFileSync('src/analytics/admin-summary.cjs','utf8');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function setup(fetcher){
  const {document}=parseHTML('<html><head></head><body></body></html>');
  const timers=new Map();let id=0;
  const context={module:{exports:{}},document,fetch:fetcher,AbortSignal,Date,Number,setTimeout:callback=>{timers.set(++id,callback);return id;},clearTimeout:id=>timers.delete(id)};
  vm.runInNewContext(source,context);
  const widget=context.module.exports.createVisitorSummary({fetcher});document.body.append(widget.element);
  return {widget,document,timers};
}
const success=()=>({ok:true,json:async()=>({todayVisitors:12,totalVisitors:1234,updatedAt:'2026-10-29T04:30:00Z'})});

test('loads only after admin authentication and clears values on logout',async()=>{
  let calls=0;
  const {widget}=setup(async()=>{calls++;return success();});
  assert.equal(widget.element.hidden,true);assert.equal(calls,0);
  widget.setActive(true);await flush();
  assert.equal(calls,1);assert.equal(widget.element.querySelectorAll('output')[0].textContent,'12');
  assert.equal(widget.element.querySelectorAll('output')[1].textContent,'1,234');
  widget.setActive(true);await flush();assert.equal(calls,1);
  widget.setActive(false);assert.equal(widget.element.hidden,true);assert.equal(widget.element.querySelector('output').textContent,'—');
});

test('shows failed refresh honestly and retains previously confirmed counts',async()=>{
  let failed=false;
  const {widget}=setup(async()=>{if(failed)throw Error('offline');return success();});
  widget.setActive(true);await flush();failed=true;
  widget.element.querySelector('button').onclick();await flush();
  assert.equal(widget.element.querySelector('output').textContent,'12');
  assert.match(widget.element.querySelector('[role="status"]').textContent,/이전 집계/);
  assert.equal(widget.element.querySelector('button').disabled,false);
});

test('hides in-flight data after logout and resumes after logging back in',async()=>{
  let finish,calls=0;
  const {widget}=setup(async()=>{calls++;if(calls===1)return new Promise(resolve=>{finish=resolve;});return success();});
  widget.setActive(true);widget.setActive(false);widget.setActive(true);
  finish(success());await flush();await flush();
  assert.equal(calls,2);assert.equal(widget.element.querySelector('output').textContent,'12');
});

test('source navigation opens a dedicated page without constructing a modal',async()=>{
  const {widget,document}=setup(async()=>success());widget.setActive(true);await flush();
  const link=widget.element.querySelector('a');assert.equal(link.textContent,'유입 경로');assert.equal(link.getAttribute('href'),'/admin/visitor-sources');assert.equal(document.querySelector('dialog'),null);
});
