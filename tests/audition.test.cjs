const {test}=require('node:test'),assert=require('node:assert/strict');
const {createHandler}=require('../api/ai-audition'),{memoryRepository}=require('../api/_audition');
const {builtins,scriptText}=require('../src/audition/catalog.cjs'),{selection,entry}=require('../src/audition/model.cjs');
function response(){return {code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(data){this.data=data;return this;}};}
async function call(h,body,method='POST',headers={}){const r=response();await h({method,headers:{host:'academy.test',origin:'https://academy.test',...headers},body},r);return r;}
const jpeg='data:image/jpeg;base64,'+Buffer.from([255,216,255,224,0,16]).toString('base64'),png='data:image/png;base64,'+Buffer.from([137,80,78,71,13,10,26,10]).toString('base64');
const input={scriptId:builtins[0].id,portrait:jpeg,scene:jpeg,mask:png,box:{x:.2,y:.2,w:.2,h:.3},consent:true,sceneConsent:true};
test('anonymous visitors can read scripts without exposing storage credentials or unpublished admin state',async()=>{
 const r=await call(createHandler({repo:memoryRepository(),configured:()=>true}),null,'GET');assert.equal(r.code,200);assert.equal(r.data.ready,true);assert.equal(r.data.scripts.length,4);assert.equal(Object.hasOwn(r.data,'revision'),false);assert.match(scriptText(r.data.scripts[0]),/연습 안내/);assert.match(scriptText(r.data.scripts[0]),/출처:/);
});
test('invalid photos, rectangle, missing consent and foreign origins never contact the image provider',async()=>{
 let calls=0;const h=createHandler({repo:memoryRepository(),configured:()=>true,fetcher:async()=>{calls++;},limit:async()=>{calls++;}});
 for(const data of [{...input,portrait:'https://evil.test/photo.jpg'},{...input,scene:'data:image/svg+xml;base64,PHN2Zz4='},{...input,mask:jpeg},{...input,box:{x:.9,y:.2,w:.3,h:.2}},{...input,consent:false},{...input,sceneConsent:false}])assert.equal((await call(h,data)).code,400);
 assert.equal((await call(h,input,'POST',{origin:'https://evil.test'})).code,403);assert.equal(calls,0);
});
test('photo composite sends scene first, portrait second and mask; preserves the chosen script and never stores personal media',async()=>{
 const old=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-key';try{
  let units=0;const calls=[],repo=memoryRepository(),h=createHandler({repo,configured:()=>true,limit:async()=>{units++;return 0;},fetcher:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({data:[{b64_json:jpeg.split(',')[1]}]})};}});
  const r=await call(h,input);assert.equal(r.code,200);assert.equal(units,5);assert.equal(calls.length,1);assert.equal(calls[0].url,'https://api.openai.com/v1/images/edits');const form=calls[0].options.body;assert.equal(form.get('model'),process.env.OPENAI_IMAGE_MODEL||'gpt-image-2');assert.equal(form.getAll('image[]')[0].name,'scene.jpg');assert.equal(form.getAll('image[]')[1].name,'portrait.jpg');assert.equal(form.get('mask').name,'face-mask.png');assert.match(form.get('prompt'),/ONLY the face/);assert.match(form.get('prompt'),/Keep the original scene background/);assert.equal(form.has('input_fidelity'),false);assert.equal(r.data.script.script,builtins[0].script);assert.deepEqual((await repo.load()).records,[]);assert.equal(r.headers['Cache-Control'],'private, no-store');
 }finally{if(old===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=old;}
});
test('quota and provider errors keep actionable failures rather than a fake completed composite',async()=>{
 const repo=memoryRepository();let called=false;const h=createHandler({repo,configured:()=>true,limit:async()=>60,fetcher:async()=>{called=true;}}),r=await call(h,input);assert.equal(r.code,429);assert.equal(r.headers['Retry-After'],'60');assert.equal(called,false);
 const bad=createHandler({repo,configured:()=>true,limit:async()=>0,fetcher:async()=>({ok:true,json:async()=>({data:[{b64_json:Buffer.from('<svg/>').toString('base64')}]})})});const b=await call(bad,input);assert.equal(b.code,503);assert.equal(b.data.image,undefined);
});
test('public catalog updates require admin auth, explicit rights review and the current revision',async()=>{
 const create=require('../api/admin-audition').createHandler,repo=memoryRepository(),record={...builtins[0],rights:'permission',rightsNote:'대사 제공·장면 합성과 다운로드 허락 범위 확인',reviewed:true};
 const deny=create({repo,authorize:async(req,res)=>{res.status(401).json({error:'로그인'});return false;}});assert.equal((await call(deny,{record,revision:0},'PUT')).code,401);
 const admin=create({repo,authorize:async()=>true});assert.equal((await call(admin,{record:{...record,reviewed:false},revision:0},'PUT')).code,400);assert.equal((await call(admin,{record,revision:0},'PUT')).code,200);assert.equal((await call(admin,{record,revision:0},'PUT')).code,409);
 assert.throws(()=>entry({...record,rights:'비영리라서 괜찮음'}));assert.throws(()=>entry({...record,image:'https://evil.test/a.jpg'}));assert.throws(()=>entry({...record,source:'javascript:alert(1)'}));assert.throws(()=>selection({x:0,y:0,w:Infinity,h:.2}));
});
