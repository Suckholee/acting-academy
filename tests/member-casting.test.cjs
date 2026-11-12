const {test}=require('node:test'),assert=require('node:assert/strict');
const {createHandler}=require('../api/member-casting'),core=require('../api/_casting'),m=require('../src/casting/model.cjs');
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',id='11111111-1111-4111-8111-111111111111',callId='22222222-2222-4222-8222-222222222222';
process.env.ADMIN_SESSION_SECRET='member-casting-tests-secret-at-least-32-characters';
const now=Date.now();
const application=()=>({id,call_id:callId,revision:3,created_at:new Date(now).toISOString(),expires_at:new Date(now+86400000).toISOString(),consent_notice:{title:'신청한 작품'},answers:{roles:['주인공'],dates:['전 일정 가능'],phone:'private phone',notes:'private notes'},profile:{memberId:owner,path:'private/file.pdf',name:'profile.pdf'},status:'보류',note:'staff secret'});
const call={id:callId,document:{...m.SEED,status:'published',opensAt:new Date(now-1000).toISOString(),closesAt:new Date(now+60000).toISOString(),inviteHash:'private invite'}};
function res(){return {code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.data=v;return this;}};}
const req=(method='GET',body)=>({method,url:'/api/member-casting?user_id='+other,headers:{host:'localhost',origin:'http://localhost'},body});
test('my audition list uses authenticated owner and never exposes staff or storage data',async()=>{
 let queried='';const database={request:async route=>{if(route.includes('academy_casting_calls'))return [call];queried=route;return [application(),{...application(),id:other,profile:{memberId:other}}];}};
 const h=createHandler({database,requireMember:async()=>({id:owner}),now:()=>now});const r=res();await h(req(),r);
 assert.equal(r.code,200);assert(queried.includes('profile->>memberId=eq.'+owner));assert(!queried.includes(other));assert.equal(r.data.applications.length,1);const a=r.data.applications[0];assert.equal(a.title,'신청한 작품');assert.deepEqual(a.roles,['주인공']);assert.equal(a.canEdit,true);assert.match(a.viewUrl,/^\/audition-edit#/);assert.equal(a.status,'접수 완료');
 const json=JSON.stringify(r.data);for(const secret of ['staff secret','private/file','private phone','private notes','private invite','보류'])assert(!json.includes(secret));assert.equal(r.headers['Cache-Control'],'private, no-store');
});
test('unauthenticated list requests never read application data',async()=>{
 let accessed=false;const h=createHandler({database:{request:async()=>{accessed=true;}},requireMember:async()=>{throw core.fail(401,'login');}});const r=res();await h(req(),r);assert.equal(r.code,401);assert.equal(accessed,false);
});
test('legacy linking requires edit proof and cannot transfer an existing owner',async()=>{
 let row=application(),patched;delete row.profile.memberId;
 const database={request:async(route,options)=>{if(options){patched={route,body:JSON.parse(options.body)};return [row];}return [row];}};
 const h=createHandler({database,requireMember:async()=>({id:owner}),limit:async()=>{},now:()=>now});
 let r=res();await h(req('POST',{action:'link',id,key:'wrong'}),r);assert.equal(r.code,403);assert.equal(patched,undefined);
 r=res();await h(req('POST',{action:'link',id,key:core.editKey(id)}),r);assert.equal(r.code,200);assert.equal(patched.body.profile.memberId,owner);assert.equal(patched.body.profile.path,row.profile.path);assert(patched.route.includes('revision=eq.3'));assert(patched.route.includes('profile->>memberId=is.null'));
 patched=undefined;row.profile.memberId=other;r=res();await h(req('POST',{action:'link',id,key:core.editKey(id)}),r);assert.equal(r.code,403);assert.equal(patched,undefined);
});
test('closed calls remain viewable without promising edits',async()=>{
 const h=createHandler({database:{request:async route=>route.includes('academy_casting_calls')?[{...call,document:{...call.document,status:'closed'}}]:[application()]},requireMember:async()=>({id:owner}),now:()=>now});const r=res();await h(req(),r);assert.equal(r.data.applications[0].canEdit,false);assert(r.data.applications[0].viewUrl);
});
test('replacing an attachment preserves the account owner',async()=>{
 const row=application();row.answers={name:'가상 배우',birthYear:'1995',gender:'기타',phone:'01000000000',region:'서울',roles:[m.SEED.roles[0]],otherRoles:'없음',experience:'신인',introUrl:'https://example.test/i',actingUrl:'https://example.test/a',dates:['전 일정 가능'],filmingAvailability:'가능',adult:true,consent:true};
 let saved;const handler=require('../api/casting-edit').createHandler({repo:{application:async()=>row,call:async()=>({...call,revision:1}),editApplication:async(id,rev,callRev,answers,profile)=>{saved=profile;return {...row,profile};}},storage:()=>({info:async()=>({data:{size:5,contentType:'application/pdf'}})}),limit:async()=>{}});
 const receipt=core.signReceipt({memberId:owner,callId,kind:'document',path:callId+'/'+id+'.pdf',name:'new.pdf',type:'application/pdf',size:5,expires:now+60000});const r=res();await handler(req('POST',{action:'save',id,key:core.editKey(id),revision:3,callRevision:1,answers:row.answers,receipt}),r);assert.equal(r.code,200);assert.equal(saved.memberId,owner);assert.equal(saved.name,'new.pdf');
});
