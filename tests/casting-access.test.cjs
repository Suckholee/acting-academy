const {test}=require('node:test'),assert=require('node:assert/strict');
const access=require('../api/_casting-access'),m=require('../src/casting/model.cjs');
const {createDemo}=require('../scripts/demo-casting.cjs');
const CALL='11111111-1111-4111-8111-111111111111';
process.env.ADMIN_SESSION_SECRET='local-invitation-test-secret-not-for-production';
async function request(handler,method='GET',body,url='/api/casting',cookie=''){
 const req={method,body,url,headers:{host:'localhost',origin:'http://localhost',cookie},socket:{remoteAddress:'127.0.0.1'}};
 const res={code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.data=v;return this;},end(v){this.html=v;return this;}};
 await handler(req,res);return res;
}
async function fixture(){const {repo}=createDemo(),invite=access.generate();await repo.saveCall(CALL,{...m.SEED,title:'비공개 작품명',description:'공개하면 안 되는 시놉시스',status:'published',opensAt:new Date(Date.now()-60000).toISOString(),closesAt:new Date(Date.now()+3600000).toISOString(),accessMode:'invite',inviteHash:invite.inviteHash},0);const handler=require('../api/casting').createHandler({repo,limit:async()=>{}});return {repo,invite,handler,call:await repo.call(CALL)};}
test('private calls reveal no title, synopsis, roles, or verifier through public JSON, HTML and sitemap',async()=>{
 const f=await fixture(),page=require('../api/casting-page').createHandler({repo:f.repo});
 for(const r of [await request(f.handler),await request(f.handler,'GET',null,'/api/casting?id='+CALL),await request(page,'GET',null,'/auditions'),await request(page,'GET',null,'/auditions/'+CALL)]){
  const body=JSON.stringify(r.data||r.html);for(const hidden of ['비공개 작품명','공개하면 안 되는 시놉시스',m.SEED.roles[0],f.invite.inviteHash])assert(!body.includes(hidden),hidden);
 }
 const denied=await request(page,'GET',null,'/auditions/'+CALL);assert.equal(denied.code,403);assert.match(denied.headers['X-Robots-Tag'],/noindex/);
 const sitemap=await request(page,'GET',null,'/auditions-sitemap.xml');assert(!sitemap.html.includes(CALL));
 const bypass=await request(f.handler,'POST',{action:'upload',callId:CALL,revision:1});assert.equal(bypass.code,403);
});
test('verified invitation grants an expiring httpOnly cookie; tampering, expiry and reissue revoke it',async()=>{
 const f=await fixture();assert.equal((await request(f.handler,'POST',{action:'verifyInvite',callId:CALL,code:'wrong'})).code,403);
 const granted=await request(f.handler,'POST',{action:'verifyInvite',callId:CALL,code:f.invite.code});assert.equal(granted.code,200);const cookie=granted.headers['Set-Cookie'];assert.match(cookie,/HttpOnly; SameSite=Lax; Max-Age=3600/);
 const opened=await request(f.handler,'GET',null,'/api/casting?id='+CALL,cookie);assert.equal(opened.data.call.document.title,'비공개 작품명');assert(!('inviteHash' in opened.data.call.document));
 const req={headers:{cookie}};assert(access.allowed(req,f.call));assert(!access.allowed(req,f.call,Date.now()+3601000));assert(!access.allowed({headers:{cookie:cookie.replace(/=./,'=x')}},f.call));assert(!access.allowed(req,{...f.call,document:{...f.call.document,inviteHash:access.generate().inviteHash}}));
 assert.match(access.cookie({headers:{host:'www.kactstar.com'}},f.call),/; Secure$/);
});
test('only authenticated admins can rotate an invitation and stale revisions cannot replace it',async()=>{
 const f=await fixture();const create=require('../api/admin-casting').createHandler;
 const denied=create({repo:f.repo,requireAdmin:async(req,res)=>{res.status(401).json({error:'login'});return false;}});
 assert.equal((await request(denied,'POST',{action:'createInvite',id:CALL,revision:1})).code,401);
 const handler=create({repo:f.repo,requireAdmin:async()=>true});const result=await request(handler,'POST',{action:'createInvite',id:CALL,revision:1});assert.equal(result.code,200);assert(access.verify(result.data.code,result.data.call));assert(!access.verify(f.invite.code,result.data.call));assert.equal((await request(handler,'POST',{action:'createInvite',id:CALL,revision:1})).code,409);
});
