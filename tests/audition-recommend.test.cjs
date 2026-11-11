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
const {recommendationPool,candidates}=require('../src/audition/recommend-options.cjs');
const oldCatalog=builtins.filter(s=>!s.cardOnly);
const ids=['provided-startup-dalmi','provided-crush-and-blush','provided-my-wife-episode8'];
test('each recommendation round covers unseen scripts, then restarts without repeating the last scene',()=>{
 assert.deepEqual(recommendationPool(oldCatalog,[ids[0]]).available.map(s=>s.id),ids.slice(1));
 assert.deepEqual(recommendationPool(oldCatalog,ids.slice(0,2)).available.map(s=>s.id),[ids[2]]);
 assert.equal(recommendationPool(oldCatalog,ids).cycleRestarted,true);
 assert.ok(recommendationPool(oldCatalog,ids).available.every(s=>s.id!==ids[2]));
 assert.deepEqual(recommendationPool(oldCatalog,[...ids,ids[0],ids[2]]).available.map(s=>s.id),[ids[1]]);
});
test('photo provider receives only fresh candidates and an excluded choice is rejected',async()=>{
 let sent;const h=setup(async(_,o)=>{sent=JSON.parse(o.body);return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify(observation)}]}]})};});
 const r=await call(h,{mode:'photo',recentSceneIds:[ids[0]]});assert.equal(r.code,503);assert.ok(!sent.text.format.schema.properties.choice.anyOf[1].enum.includes(ids[0]));const scenes=JSON.parse(sent.input[0].content[0].text).scenes;assert.ok(scenes.every(s=>s.id!==ids[0]));
});
test('random needs neither portrait nor consent and never calls paid AI or consumes its quota',async()=>{
 let paid=0,quota=0;const h=setup(async()=>{paid++;},async()=>{quota++;return 0;});let history=[];
 const all=candidates(builtins,false).map(s=>s.id);for(let i=0;i<all.length*2;i++){const r=await call(h,{mode:'random',portrait:undefined,consent:false,sceneConsent:false,recentSceneIds:history});assert.equal(r.code,200);const id=r.data.recommendation.scriptId;assert.ok(all.includes(id));assert.notEqual(id,history.at(-1));history.push(id);if(i%all.length===all.length-1)assert.equal(new Set(history.slice(-all.length)).size,all.length);}
 assert.equal(paid,0);assert.equal(quota,0);
});
test('situation returns only the requested registered script without photo analysis',async()=>{
 const h=setup(()=>assert.fail('no paid call'),()=>assert.fail('no paid quota'));
 const r=await call(h,{mode:'situation',situationId:ids[2],portrait:undefined,consent:false,sceneConsent:false});assert.equal(r.code,200);assert.equal(r.data.recommendation.scriptId,ids[2]);
 assert.equal((await call(h,{mode:'situation',situationId:'sample-oldboy'})).code,400);
});
test('invalid modes, history and missing photo consent cannot invoke paid analysis',async()=>{
 const h=setup(()=>assert.fail());for(const d of [{mode:'unknown'},{recentSceneIds:'bad'},{recentSceneIds:Array(301).fill('x')},{mode:'photo',consent:false},{preference:{}}])assert.equal((await call(h,d)).code,400);
});

test('licensed scripts are eligible and a different work is offered when one remains unseen',()=>{
 const p=recommendationPool(builtins,['licensed-valkaama-18']);assert.equal(p.all.length,100);assert.ok(p.available.every(s=>s.work!=='Valkaama'));assert.ok(p.available.some(s=>s.id.startsWith('licensed-tos-')));
});

test('all recommendation modes exclude script-only cards unless explicitly requested',async()=>{
 const h=setup(()=>assert.fail('free mode must not call AI'));
 for(const mode of ['random','situation']){
  const r=await call(h,{mode,filters:{situation:'갈등'}});assert.equal(r.code,200);assert.equal(r.data.recommendation.eligibleCount,3);
  assert.ok(!builtins.find(s=>s.id===r.data.recommendation.scriptId)?.cardOnly);
 }
 const opted=await call(h,{mode:'random',includeCardOnly:true});assert.equal(opted.data.recommendation.eligibleCount,100);
 assert.equal((await call(h,{mode:'random',includeCardOnly:'true'})).code,400);
 let choices;const photo=setup(async(_,o)=>{choices=JSON.parse(o.body).text.format.schema.properties.choice.anyOf[1].enum;return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify(observation)}]}]})};});
 assert.equal((await call(photo,{mode:'photo'})).code,200);assert.equal(choices.length,3);assert.ok(choices.every(id=>!builtins.find(s=>s.id===id).cardOnly));
});
