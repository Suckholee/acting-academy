const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createHandler}=require('../api/admin-inquiries');
const id='b079d152-62a0-4396-a32a-12960bc2fb65';
const response=()=>({code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(data){this.data=data;return this;}});

test('deletion targets one general inquiry and returns only its ID',async()=>{
 const res=response();let calls=0;
 await createHandler({requireAdmin:async()=>true,database:{request:async(route,options)=>{
  calls++;const url=new URL(route,'https://example.test');
  assert.equal(url.pathname,'/rest/v1/academy_inquiries');assert.equal(url.searchParams.get('id'),'eq.'+id);
  assert.equal(url.searchParams.get('purposes'),'not.cs.["무료특강 신청"]');assert.equal(url.searchParams.get('select'),'id');
  assert.equal(options.method,'DELETE');assert.equal(options.headers.Prefer,'return=representation');return [{id}];
 }}})({method:'DELETE',body:{id}},res);
 assert.equal(calls,1);assert.equal(res.code,200);assert.deepEqual(res.data,{id});assert.equal(res.headers['Cache-Control'],'private, no-store');
});
test('malformed IDs and payloads cannot delete records',async()=>{
 for(const body of [null,{},'{broken',{id:''},{id:[]},{id:id+'&or=(id.not.is.null)'},{id:'all'}]){
  const res=response();await createHandler({requireAdmin:async()=>true,database:{request:()=>assert.fail('must not access storage')}})({method:'DELETE',body},res);assert.equal(res.code,400);
 }
});
test('denied deletion never accesses storage; missing and failed deletions never claim success',async()=>{
 for(const code of [401,403]){const res=response();await createHandler({requireAdmin:async(req,res)=>{res.status(code).json({error:'denied'});return false;},database:{request:()=>assert.fail()}})({method:'DELETE',body:{id}},res);assert.equal(res.code,code);}
 for(const fail of [false,true]){const res=response();await createHandler({requireAdmin:async()=>true,database:{request:async()=>{if(fail)throw Error('private connection details');return [];}}})({method:'DELETE',body:{id}},res);assert.equal(res.code,fail?503:404);assert(!res.data.id);assert.doesNotMatch(res.data.error,/private connection/);}
});

const {parseHTML}=require('linkedom'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function screen({count=1,confirm=true,remove=async()=>({ok:true,json:async()=>({id})}),scheduleReady=true}={}){
 const {document,window}=parseHTML('<html><body><main id="admissions-root"></main></body></html>');
 // LinkeDOM does not implement the browser select setter or dialog methods.
 Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return this.querySelector('option[selected]')?.value||this.querySelector('option')?.value||'';},set(value){for(const option of this.querySelectorAll('option'))option.selected=option.value===value;}});
 window.HTMLElement.prototype.showModal=function(){this.setAttribute('open','');};
 window.HTMLElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new window.Event('close'));};
 const records=Array.from({length:count},(_,index)=>({id:index?id.slice(0,-4)+String(index).padStart(4,'0'):id,name:'테스트 신청자 '+index,phone:'01000000000',courses:['취미반'],purposes:['취미·입문'],status:'신청',created_at:'2026-11-04T01:00:00Z',memo:'메모',revision:0}));
 const calls=[],prompts=[];window.confirm=message=>{prompts.push(message);return confirm;};
 const fetch=async(url,options={})=>{
  calls.push({url,...options});if(options.method==='DELETE')return remove(options);
  return {ok:true,json:async()=>url==='/api/admin-auth'?{authenticated:true}:{records,scheduleReady}};
 };
 const requireLocal=require('node:module').createRequire(path.resolve('src/admissions/app.js'));
 vm.runInNewContext(fs.readFileSync('src/admissions/app.js','utf8'),{document,window,fetch,require:requireLocal,Intl,Date,console});await tick();
 return {document,calls,prompts,button:text=>[...document.querySelectorAll('button')].find(button=>button.textContent===text)};
}
test('cancel preserves the record and sends no delete request',async()=>{
 const ui=await screen({confirm:false});await ui.document.querySelector('.delete-record').onclick();
 assert.equal(ui.calls.filter(call=>call.method==='DELETE').length,0);assert.equal(ui.document.querySelectorAll('tbody tr').length,1);assert.match(ui.prompts[0],/01000000000/);assert.match(ui.prompts[0],/복구할 수 없습니다/);
});
test('confirmed deletion updates totals and the final page, including without workflow setup',async()=>{
 const ui=await screen({count:26,scheduleReady:false});ui.button('다음').onclick();
 assert.match(ui.document.querySelector('.grid-footer').textContent,/2 \/ 2 페이지/);
 await ui.document.querySelector('.delete-record').onclick();
 assert.equal(ui.calls.filter(call=>call.method==='DELETE').length,1);assert.match(ui.document.querySelector('.register-bar').textContent,/총 25명 중 25명/);
 assert.match(ui.document.querySelector('.grid-footer').textContent,/1 \/ 1 페이지/);assert.equal(ui.document.querySelectorAll('tbody tr').length,25);assert.match(ui.document.querySelector('.admissions-feedback').textContent,/삭제했습니다/);
});
test('failed deletion keeps the record and restores controls',async()=>{
 const ui=await screen({remove:async()=>({ok:false,json:async()=>({error:'다시 시도해주세요.'})})});
 const button=ui.document.querySelector('.delete-record');await button.onclick();assert.equal(button.disabled,false);
 assert.match(ui.document.querySelector('.register-bar').textContent,/총 1명/);assert.match(ui.document.querySelector('.admissions-feedback').textContent,/다시 시도/);
});
test('detail deletion blocks repeat requests and closes the dialog after success',async()=>{
 let finish;const pending=new Promise(resolve=>{finish=resolve;});const ui=await screen({remove:()=>pending});
 ui.document.querySelector('.open-record').onclick();const dialog=ui.document.querySelector('dialog'),button=dialog.querySelector('.delete-record');
 const deletion=button.onclick();assert.equal(button.disabled,true);assert.equal(dialog.querySelector('[type=submit]').disabled,true);
 await button.onclick();assert.equal(ui.calls.filter(call=>call.method==='DELETE').length,1);
 finish({ok:true,json:async()=>({id})});await deletion;
 assert.equal(ui.document.querySelector('dialog'),null);assert.match(ui.document.querySelector('.register-bar').textContent,/총 0명/);
 ui.button('타임테이블형').onclick();assert.equal(ui.document.querySelector('.calendar-event'),null);assert.equal(ui.document.querySelector('.unscheduled'),null);
});
