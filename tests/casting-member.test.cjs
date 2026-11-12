const {test}=require('node:test'),assert=require('node:assert/strict');
const member=require('../api/_member'),core=require('../api/_casting'),model=require('../src/casting/model.cjs');
const {requireCastingMember}=require('../api/_casting-member'),{createHandler}=require('../api/casting');
const id='11111111-1111-4111-8111-111111111111',owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function res(){return {code:200,setHeader(){},status(n){this.code=n;return this;},json(v){this.data=v;return this;}};}
const req=body=>({method:'POST',url:'/api/casting',headers:{host:'localhost',origin:'http://localhost'},body:{callId:id,...body}});
const call={id,revision:1,document:{...model.SEED,status:'published',opensAt:new Date(Date.now()-60000).toISOString(),closesAt:new Date(Date.now()+3600000).toISOString()}};
const answers={name:'테스트 배우',birthYear:'1995',gender:'기타',phone:'01000000000',email:'member@example.test',region:'서울',roles:[model.SEED.roles[0]],otherRoles:'없음',experience:'신인',introUrl:'https://example.test/i',actingUrl:'https://example.test/a',dates:['전 일정 가능'],filmingAvailability:'가능',adult:true,consent:true};
test('casting membership requires verified active account and completed required information',async()=>{
 const old=[member.user,member.profile];
 try{
  member.user=async()=>null;await assert.rejects(requireCastingMember({}),e=>e.status===401);
  member.user=async()=>({id:owner});await assert.rejects(requireCastingMember({}),e=>e.status===401);
  member.user=async()=>({id:owner,email_confirmed_at:'2026-11-12'});
  for(const change of [{status:'inactive'},{consented_at:null},{phone:''},{name:''}]){member.profile=async()=>({name:'배우 회원',phone:'01000000000',status:'active',consented_at:'2026-11-12',...change});await assert.rejects(requireCastingMember({}),e=>e.status===403);}
  member.profile=async()=>({name:'배우 회원',phone:'01000000000',status:'active',consented_at:'2026-11-12'});assert.equal((await requireCastingMember({})).id,owner);
 }finally{[member.user,member.profile]=old;}
});
test('rejected member authentication cannot reach storage or save; public calls remain readable',async()=>{
 let touched=false;const handler=createHandler({repo:{call:async()=>call,submit:async()=>{touched=true;}},storage:()=>{touched=true;},limit:async()=>{},requireMember:async()=>{throw Object.assign(Error('login'),{status:401});}});
 for(const action of ['upload','uploadPhoto','submit']){const r=res();await handler(req({action,answers}),r);assert.equal(r.code,401);}
 const r=res();await handler({...req({}),method:'GET',url:'/api/casting?id='+id},r);assert.equal(r.code,200);assert.equal(r.data.call.id,id);assert.equal(touched,false);
});
test('upload receipt binds its owner and cannot be submitted by another member',async()=>{
 process.env.ADMIN_SESSION_SECRET='casting-member-test-secret-at-least-32-characters';let active=owner,saved;
 const handler=createHandler({repo:{call:async()=>call,submit:async(c,a,p)=>{saved=p;return {id};}},storage:()=>({createSignedUploadUrl:async()=>({data:{signedUrl:'https://example.test/upload'}}),info:async()=>({data:{size:5,contentType:'application/pdf'}})}),limit:async()=>{},requireMember:async()=>({id:active})});
 const upload=res();await handler(req({action:'upload',revision:1,answers,file:{name:'profile.pdf',size:5,type:'application/pdf'}}),upload);assert.equal(upload.code,200);assert.equal(core.receipt(upload.data.receipt,id).memberId,owner);
 active='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';const denied=res();await handler(req({action:'submit',revision:1,answers,receipt:upload.data.receipt}),denied);assert.equal(denied.code,403);assert.equal(saved,undefined);
 active=owner;const accepted=res();await handler(req({action:'submit',revision:1,answers,receipt:upload.data.receipt}),accepted);assert.equal(accepted.code,201);assert.equal(saved.memberId,owner);
});
test('submission transport sends the current member token',async()=>{
 let authorization;const transport=require('../src/casting/transport.cjs');
 await transport.request({action:'submit',receipt:'signed'},{getToken:async()=>'current-member-token',fetcher:async(url,options)=>{authorization=options.headers.Authorization;return {ok:true,json:async()=>({id})};}});
 assert.equal(authorization,'Bearer current-member-token');
});

test('anonymous applicants may submit without a member account but must provide email',async()=>{
 process.env.ADMIN_SESSION_SECRET='casting-member-test-secret-at-least-32-characters';let saved;
 const handler=createHandler({repo:{call:async()=>call,submit:async(c,a,p)=>{saved={answers:a,profile:p};return {id};}},storage:()=>({createSignedUploadUrl:async()=>({data:{signedUrl:'https://example.test/upload'}}),info:async()=>({data:{size:5,contentType:'application/pdf'}})}),limit:async()=>{}});
 const upload=res();await handler(req({action:'upload',revision:1,answers,file:{name:'guest.pdf',size:5,type:'application/pdf'}}),upload);assert.equal(upload.code,200);assert.equal(core.receipt(upload.data.receipt,id).memberId,undefined);
 const missingEmail=res();await handler(req({action:'submit',revision:1,answers:{...answers,email:''},receipt:upload.data.receipt}),missingEmail);assert.equal(missingEmail.code,400);assert.equal(saved,undefined);
 const accepted=res();await handler(req({action:'submit',revision:1,answers,receipt:upload.data.receipt}),accepted);assert.equal(accepted.code,201);assert.equal(saved.profile.memberId,undefined);assert.equal(saved.profile.submittedAs,'guest');assert(core.canEdit(accepted.data.id,accepted.data.editKey));assert.equal(model.applicantType(saved.profile),'비회원 지원');assert.equal(model.applicantType({...saved.profile,memberId:owner}),'비회원 지원 · 계정 연결');
});
test('anonymous submission cannot reuse a member upload receipt',async()=>{
 process.env.ADMIN_SESSION_SECRET='casting-member-test-secret-at-least-32-characters';let touched=false;
 const h=createHandler({repo:{call:async()=>call,submit:async()=>{touched=true;}},storage:()=>{touched=true;},limit:async()=>{}});
 const receipt=core.signReceipt({memberId:owner,callId:id,kind:'document',path:id+'/'+id+'.pdf',name:'member.pdf',type:'application/pdf',size:5,expires:Date.now()+60000});const r=res();await h(req({action:'submit',revision:1,answers,receipt}),r);assert.equal(r.code,403);assert.equal(touched,false);
});
test('optional applicant authentication rejects supplied invalid or unverified credentials',async()=>{
 const {castingApplicant}=require('../api/_casting-member');const old=member.user;
 try{member.user=async()=>{throw Error('must not query auth for guest');};assert.equal(await castingApplicant({headers:{}}),null);member.user=async()=>null;await assert.rejects(castingApplicant({headers:{authorization:'Bearer invalid'}}),e=>e.status===401);member.user=async()=>({id:owner});await assert.rejects(castingApplicant({headers:{authorization:'Bearer unverified'}}),e=>e.status===401);}finally{member.user=old;}
});
