const {test}=require('node:test'),assert=require('node:assert/strict');
const {createHandler}=require('../api/ai-audition'),{memoryRepository}=require('../api/_audition');
const {builtins}=require('../src/audition/catalog.cjs'),{pick}=require('../src/audition/recommend.cjs');
const {createQueue}=require('../api/_audition-queue'),memoryStore=require('./audition-store.cjs');
const jpeg='data:image/jpeg;base64,'+Buffer.from([255,216,255,224,0,16]).toString('base64');
const observation={choice:'provided-startup-dalmi',expression:'neutral',styling:'formal',face:'single',direction:'front',tilt:'level',framing:'close',faceBox:{x:.2,y:.2,w:.3,h:.4}};
function setup(fetcher,limit=async()=>0){return createHandler({repo:memoryRepository(),configured:()=>true,fetcher,limit,access:createQueue({request:memoryStore().request,secret:()=> 'test-session-secret'})});}
async function call(h,data,origin='https://academy.test'){const res={code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(data){this.data=data;return this;}};await h({method:'POST',headers:{host:'academy.test',origin},body:{action:'recommend',portrait:jpeg,consent:true,sceneConsent:true,...data}},res);return res;}
test('geometry ranks a prepared close frontal scene and never recommends uncatalogued or modified scenes',()=>{
 assert.equal(pick(builtins,observation).scriptId,'sample-masquerade');
 assert.equal(pick(builtins.map(b=>({...b,image:'/assets/other.jpg'})),observation).scriptId,null);
 assert.equal(pick(builtins,{...observation,face:'multiple'}).scriptId,null);assert.equal(pick(builtins,{...observation,direction:'unknown'}).scriptId,null);
 assert.equal(pick(builtins,{...observation,direction:'left',tilt:'down'}).scriptId,'sample-extreme-job');
 assert.equal(pick(builtins,{...observation,faceBox:null}).scriptId,null);assert.equal(pick(builtins,{...observation,faceBox:{x:0,y:0,w:1,h:1}}).scriptId,null);
 assert.throws(()=>pick(builtins,{...observation,direction:'cast the actor'}));
});
test('recommendation verifies photo, same origin and both consents before any paid request',async()=>{let calls=0;const h=setup(async()=>{calls++;});for(const input of [{portrait:'https://evil.test/x.jpg'},{consent:false},{sceneConsent:false}])assert.equal((await call(h,input)).code,400);assert.equal((await call(h,{},'https://evil.test')).code,403);assert.equal(calls,0);});
test('recommendation uses one unpersisted portrait analysis and returns only a catalog selection and explanation',async()=>{let paid=0,units=0;const h=setup(async(url,options)=>{paid++;assert.equal(url,'https://api.openai.com/v1/responses');const b=JSON.parse(options.body);assert.equal(b.store,false);assert.equal(b.model,process.env.OPENAI_AUDITION_RECOMMEND_MODEL||'gpt-4.1-mini');assert.equal(b.input[0].content[1].image_url,jpeg);assert.match(b.instructions,/Do not identify/);assert.equal(b.text.format.strict,true);return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify(observation)}]}]})};},async()=>{units++;return 0;});const r=await call(h,{});assert.equal(r.code,200);assert.equal(r.data.recommendation.scriptId,'provided-startup-dalmi');assert.equal(r.data.image,undefined);assert.equal(r.data.portrait,undefined);assert.equal(paid,1);assert.equal(units,1);});
test('recommendation quota stops the provider and malformed/refused output never becomes a fabricated match',async()=>{let paid=0;const h=setup(async()=>{paid++;},async()=>60),r=await call(h,{});assert.equal(r.code,429);assert.equal(r.headers['Retry-After'],'60');assert.equal(paid,0);
 const bad=setup(async()=>({ok:true,json:async()=>({output:[{content:[{type:'refusal',refusal:'no'}]}]})}));const b=await call(bad,{});assert.equal(b.code,503);assert.equal(b.data.recommendation,undefined);assert.match(b.data.error,/直接|직접/);
});
