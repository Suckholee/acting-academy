const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const {createHandler}=require('../api/admin-event-applications');
const {EVENT,TAG}=require('../api/event-application');
const id='12345678-1234-4234-8234-123456789abc';
const response=()=>({code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(data){this.data=data;return this;}});
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('deletion uses one database request restricted to the ID and this event',async()=>{
 const res=response();let calls=0;
 await createHandler({requireAdmin:async()=>true,database:{request:async(route,options)=>{
  calls++;const query=new URL(route,'https://database.test').searchParams;
  assert.equal(query.get('id'),'eq.'+id);assert.equal(query.get('purposes'),'cs.'+JSON.stringify([TAG]));assert.equal(query.get('courses'),'cs.'+JSON.stringify([EVENT]));assert.equal(query.get('select'),'id');
  assert.equal(options.method,'DELETE');assert.equal(options.headers.Prefer,'return=representation');return [{id}];
 }}})({method:'DELETE',body:JSON.stringify({id})},res);
 assert.equal(calls,1);assert.equal(res.code,200);assert.deepEqual(res.data,{id});assert.equal(res.headers['Cache-Control'],'private, no-store');
});
test('deletion requires administrator authentication and rejects other origins',async()=>{
 const auth=require('../api/_admin');const oldPassword=process.env.ADMIN_PASSWORD,oldSecret=process.env.ADMIN_SESSION_SECRET;
 process.env.ADMIN_PASSWORD='test-password';process.env.ADMIN_SESSION_SECRET='test-secret-'.repeat(4);
 try{
  const security=auth.createAuth({create:async()=>{},active:async()=>true});
  const session=response();await security.session(session);const cookie=session.headers['Set-Cookie'].split(';')[0];
  for(const [headers,code] of [[{host:'example.test'},401],[{host:'example.test',origin:'https://other.test',cookie},403]]){
   const res=response();await createHandler({requireAdmin:security.requireAdmin,database:{request:()=>assert.fail('unauthorized database access')}})({method:'DELETE',headers,body:{id}},res);assert.equal(res.code,code);
  }
 }finally{
  if(oldPassword===undefined)delete process.env.ADMIN_PASSWORD;else process.env.ADMIN_PASSWORD=oldPassword;
  if(oldSecret===undefined)delete process.env.ADMIN_SESSION_SECRET;else process.env.ADMIN_SESSION_SECRET=oldSecret;
 }
});
test('invalid deletion IDs and malformed bodies never reach storage',async()=>{
 for(const body of [undefined,null,{},'{broken',{id:'bad'},{id:id+'&purposes=other'},{id:[id]}]){
  const res=response();await createHandler({requireAdmin:async()=>true,database:{request:()=>assert.fail('invalid deletion')}})({method:'DELETE',body},res);assert.equal(res.code,400);
 }
});
test('a missing or different-event record and storage failure never report deletion success',async()=>{
 for(const [request,code] of [[async()=>[],404],[async()=>{throw Error('offline');},503]]){
  const res=response();await createHandler({requireAdmin:async()=>true,database:{request}})({method:'DELETE',body:{id}},res);assert.equal(res.code,code);assert(res.data.error);
 }
});
test('unsupported methods advertise only roster reading and deletion',async()=>{
 const res=response();await createHandler({requireAdmin:async()=>true,database:{request:()=>assert.fail()}})({method:'POST'},res);assert.equal(res.code,405);assert.equal(res.headers.Allow,'GET, DELETE');
});

function setup({count=2,confirm=()=>true,remove=async()=>({ok:true,json:async()=>({id})})}={}){
 const {document,Event}=parseHTML(fs.readFileSync('published-source/admin/event-applications.html','utf8'));
 const records=Array.from({length:count},(_,i)=>({id:i?'12345678-1234-4234-8234-'+String(i).padStart(12,'0'):id,name:'신청자'+i,phone:'010'+String(i).padStart(8,'0'),created_at:'2026-10-22T00:00:00Z'}));
 let calls=0,csv='';
 vm.runInNewContext(fs.readFileSync('published-source/admin-event-applications.js','utf8'),{document,Intl,Date,window:{confirm},fetch:async(url,options)=>{
  assert.equal(url,'/api/admin-event-applications');if(options.method==='DELETE'){calls++;assert.equal(options.credentials,'same-origin');assert.equal(JSON.parse(options.body).id,id);return remove();}return {ok:true,json:async()=>({records})};
 },Blob:class {constructor(parts){csv=parts.join('');}},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:()=>{}},setTimeout:()=>{}});
 return {document,Event,calls:()=>calls,csv:()=>csv};
}
test('canceling confirmation preserves the roster without sending a deletion',async()=>{
 let prompt='';const ctx=setup({confirm:message=>{prompt=message;return false;}});await tick();ctx.document.querySelector('.delete-record').click();await tick();assert.equal(ctx.calls(),0);assert.equal(ctx.document.querySelectorAll('#event-records tr').length,2);assert(prompt.includes('신청자0 (01000000000)'));assert(prompt.includes('복구할 수 없습니다'));
});
test('successful deletion recomputes capacity, reception order, search and CSV',async()=>{
 const ctx=setup({count:41});await tick();ctx.document.querySelector('.delete-record').click();await tick();
 assert.equal(ctx.calls(),1);assert.equal(ctx.document.querySelectorAll('#event-records tr').length,40);assert.match(ctx.document.querySelector('#admin-event-status').textContent,/삭제했습니다.*총 40명 접수 · 정원 내 40명 · 대기 0명/);
 const rows=ctx.document.querySelectorAll('#event-records tr');assert.equal(rows[0].querySelector('td').textContent,'1');assert(rows[0].textContent.includes('신청자1'));assert.equal(rows[39].querySelectorAll('td')[8].textContent,'정원 내');
 ctx.document.querySelector('#export').click();assert(!ctx.csv().includes('"신청자0"'));assert(ctx.csv().includes('"신청자40"'));
 const search=ctx.document.querySelector('#search');search.value='신청자40';search.dispatchEvent(new ctx.Event('input'));assert.equal(ctx.document.querySelectorAll('#event-records tr').length,1);assert.equal(ctx.document.querySelector('#event-records td').textContent,'40');
});
test('pending deletion prevents duplicate requests and failure retains the applicant for retry',async()=>{
 let complete;const ctx=setup({remove:()=>new Promise(resolve=>complete=resolve)});await tick();const button=ctx.document.querySelector('.delete-record');button.click();button.click();assert.equal(ctx.calls(),1);assert.equal(ctx.document.querySelector('#refresh').disabled,true);assert.equal(ctx.document.querySelector('#export').disabled,true);
 complete({ok:false,json:async()=>({error:'삭제 실패'})});await tick();assert.equal(ctx.document.querySelectorAll('#event-records tr').length,2);assert.equal(ctx.document.querySelector('#admin-event-status').textContent,'삭제 실패');assert.equal(button.disabled,false);
});
test('deleting the last record shows empty state and expired sessions return to login',async()=>{
 const empty=setup({count:1});await tick();empty.document.querySelector('.delete-record').click();await tick();assert.match(empty.document.querySelector('#event-records').textContent,/아직 접수된 신청이 없습니다/);assert.equal(empty.document.querySelector('#event-records td').colSpan,10);assert.equal(empty.document.querySelector('#export').disabled,true);
 const expired=setup({remove:async()=>({status:401,ok:false,json:async()=>({error:'expired'})})});await tick();expired.document.querySelector('.delete-record').click();await tick();assert.equal(expired.document.querySelector('#login').hidden,false);assert.equal(expired.document.querySelector('#event-records').children.length,0);assert.equal(expired.document.querySelector('#export').disabled,true);
});
