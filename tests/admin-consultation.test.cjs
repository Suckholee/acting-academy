const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const auth=require('../api/_admin');
const {createHandler}=require('../api/admin-consultation');
const {createStore}=require('../scripts/local-admin-store.cjs');
function response(){return{code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(data){this.data=data;return this;},end(data){this.body=data;return this;}};}
test('private consultation pages require a live administrator session, including raw images and PDF',async()=>{
 const before={password:process.env.ADMIN_PASSWORD,secret:process.env.ADMIN_SESSION_SECRET};
 process.env.ADMIN_PASSWORD='test-only-password';process.env.ADMIN_SESSION_SECRET='x'.repeat(32);
 try{
  const local=auth.createAuth(createStore()),handler=createHandler({requireAdmin:(...args)=>local.requireAdmin(...args)});
  const call=async(url,cookie='',method='GET',origin)=>{const res=response();await handler({url,method,headers:{host:'localhost',cookie,...(origin?{origin}:{})}},res);return res;};
  for(const url of ['/api/admin-consultation','/api/admin-consultation?page=1','/api/admin-consultation?download=pdf'])assert.equal((await call(url)).code,401);
  const session=response();await local.session(session);const cookie=session.headers['Set-Cookie'].split(';')[0];
  const meta=await call('/api/admin-consultation',cookie);assert.equal(meta.code,200);assert.equal(meta.data.pages.length,9);assert.equal(meta.data.pages[0].links[0].page,2);assert.match(meta.headers['Cache-Control'],/no-store/);
  const image=await call('/api/admin-consultation?page=7',cookie);assert.equal(image.headers['Content-Type'],'image/jpeg');assert.equal(image.body.readUInt16BE(0),0xffd8);
  const pdf=await call('/api/admin-consultation?download=pdf',cookie);assert.equal(pdf.body.subarray(0,5).toString(),'%PDF-');assert.match(pdf.headers['Content-Disposition'],/attachment/);
  for(const value of ['../guide.pdf','0','-1','1.5','01','1%2F..%2Fguide.pdf'])assert.equal((await call('/api/admin-consultation?page='+value,cookie)).code,400,value);
  assert.equal((await call('/api/admin-consultation?page=10',cookie)).code,404);
  assert.equal((await call('/api/admin-consultation?page=1&download=pdf',cookie)).code,400);
  assert.equal((await call('/api/admin-consultation?download=other',cookie)).code,400);
  assert.equal((await call('/api/admin-consultation',cookie,'POST')).code,405);
  assert.equal((await call('/api/admin-consultation?page=1',cookie,'GET','https://other.invalid')).code,403);
  await local.clear({headers:{cookie}},response());assert.equal((await call('/api/admin-consultation?page=1',cookie)).code,401);
 }finally{for(const [key,value]of [['ADMIN_PASSWORD',before.password],['ADMIN_SESSION_SECRET',before.secret]])value===undefined?delete process.env[key]:process.env[key]=value;}
});
test('missing consultation files fail without exposing filesystem details',async()=>{
 const res=response();await createHandler({directory:path.join(__dirname,'missing-private-assets'),requireAdmin:async()=>true})({method:'GET',url:'/api/admin-consultation'},res);assert.equal(res.code,503);assert.doesNotMatch(res.data.error,/ENOENT|tests|private-assets/);
});
test('build exposes the authenticated viewer and menu link, but no public consultation assets or editor overlay',()=>{
 const html=fs.readFileSync('dist-published/admin/consultation.html','utf8');assert.match(html,/consultation\.js/);assert.doesNotMatch(html,/component-editor\.js|ai-assistant\.js/);
 assert.match(fs.readFileSync('dist-published/component-editor.js','utf8'),/\/admin\/consultation/);
 assert.match(fs.readFileSync('dist-published/members.js','utf8'),/\/admin\/consultation/);
 assert.equal(fs.existsSync('dist-published/private-assets'),false);
 assert.equal(fs.existsSync('dist-published/admin/guide.pdf'),false);
 const config=JSON.parse(fs.readFileSync('vercel.json'));assert.equal(config.functions['api/admin-consultation.js'].includeFiles,'private-assets/consultation/**');
});
