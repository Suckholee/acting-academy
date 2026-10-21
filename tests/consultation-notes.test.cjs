const {test}=require('node:test'),assert=require('node:assert/strict');
const {createHandler}=require('../api/admin-consultation-notes');
const id='11111111-1111-4111-8111-111111111111',rid='22222222-2222-4222-8222-222222222222';
function response(){return {code:200,setHeader(){},status(n){this.code=n;return this;},json(data){this.data=data;return this;}};}
const report={goals:'입문 [상담 메모]',summary:'기초반 문의 [녹음 1]',recommendation:'미확인',followup:'미확인',memo:'시간표 확인 필요'};
test('private consultation notes enforce authentication, room revision, AI consent and recording ownership',async()=>{
 const blocked=createHandler({requireAdmin:async(req,res)=>{res.status(401).json({error:'login'});return false;}}),res=response();await blocked({method:'POST'},res);assert.equal(res.code,401);
 const previous={};for(const k of ['OPENAI_API_KEY','OPENAI_MODEL','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY']){previous[k]=process.env[k];process.env[k]='test';}
 try{
 let room={id,revision:0,annotations:{_journal:[{color:'#273b32',width:3,points:[[.1,.1],[.3,.3]]}],_recordings:[{id:rid,path:id+'/recording.webm',type:'audio/webm'}]},journal:{},name:'테스트',page_ids:[1]},calls=0;
 const store={get:async key=>key===id?structuredClone(room):null,update:async(key,rev,fields)=>{if(rev!==room.revision)return;room={...room,...fields,revision:rev+1};return structuredClone(room);}};
 const storageClient={from:()=>({download:async()=>({data:new Blob(['audio'],{type:'audio/webm'})}),createSignedUrl:async()=>({data:{signedUrl:'https://private.test/audio'}})})};
 const handler=createHandler({store,requireAdmin:async()=>true,storageClient,limit:async()=>0,fetcher:async(url,options)=>{calls++;if(url.endsWith('/transcriptions')){assert.equal(options.body.get('language'),'ko');return {ok:true,json:async()=>({text:'기초반 수업 문의'})};}const body=JSON.parse(options.body);assert.equal(body.store,false);assert.match(body.instructions,/추측하지/);assert.equal(body.text.format.strict,true);return {ok:true,json:async()=>({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(report)}]}]})};}});
 const call=async(action,extra={})=>{const r=response();await handler({method:'POST',body:{roomId:id,revision:room.revision,action,...extra}},r);return r;};
 assert.equal((await call('report')).code,400);assert.equal(calls,0);
 assert.equal((await call('play',{recordingId:'another-room'})).code,404);
 assert.equal((await call('play',{recordingId:rid})).data.url,'https://private.test/audio');
 assert.equal((await call('transcribe',{recordingId:rid,consent:true,revision:99})).code,409);
 const transcribed=await call('transcribe',{recordingId:rid,consent:true});assert.equal(transcribed.code,200);assert.equal(room.annotations._recordings[0].transcript,'기초반 수업 문의');assert.equal(room.annotations._journal.length,1);
 const result=await call('report',{consent:true});assert.equal(result.code,200);assert.deepEqual(result.data.report,report);assert.deepEqual(room.journal,{});assert.equal(calls,2);
 assert.equal((await call('attach',{path:'33333333-3333-4333-8333-333333333333/file.webm'})).code,400);
 assert.equal((await call('upload',{size:21*1024*1024,type:'audio/webm'})).code,400);
 }finally{for(const[k,v]of Object.entries(previous))if(v===undefined)delete process.env[k];else process.env[k]=v;}
});
test('provider failures preserve original notes and recordings; untranscribed recordings cannot be omitted from a report',async()=>{
 const previous={};for(const k of ['OPENAI_API_KEY','OPENAI_MODEL','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY']){previous[k]=process.env[k];process.env[k]='test';}
 try{const original={id,revision:0,annotations:{_recordings:[{id:rid,path:id+'/a.webm'}]},journal:{}};let writes=0;
 const handler=createHandler({requireAdmin:async()=>true,store:{get:async()=>structuredClone(original),update:async()=>{writes++;}},storageClient:{from:()=>({download:async()=>({data:new Blob(['audio'])})})},limit:async()=>0,fetcher:async()=>({ok:false})});
 for(const action of ['transcribe','report']){const res=response();await handler({method:'POST',body:{roomId:id,revision:0,action,recordingId:rid,consent:true}},res);assert.equal(res.code,action==='transcribe'?503:400);}assert.equal(writes,0);
 }finally{for(const[k,v]of Object.entries(previous))if(v===undefined)delete process.env[k];else process.env[k]=v;}
});
test('audio uploads stay in a private bucket and attachment metadata comes from storage',async()=>{
 let room={id,revision:0,annotations:{_journal:[]}},signedPath;
 const storageClient={getBucket:async()=>({data:{public:false}}),from:()=>({createSignedUploadUrl:async path=>{signedPath=path;return {data:{signedUrl:'https://private.test/upload'}};},info:async()=>({data:{size:1200,contentType:'audio/webm'}})})};
 const handler=createHandler({requireAdmin:async()=>true,storageClient,store:{get:async()=>structuredClone(room),update:async(key,rev,fields)=>{room={...room,...fields,revision:rev+1};return room;}}});
 const call=async(action,extra={})=>{const r=response();await handler({method:'POST',body:{roomId:id,revision:room.revision,action,...extra}},r);return r;};
 assert.equal((await call('upload',{size:1200,type:'audio/webm;codecs=opus'})).code,200);assert.ok(signedPath.startsWith(id+'/'));
 const attached=await call('attach',{path:signedPath,size:99999999,type:'text/html'});assert.equal(attached.code,200);assert.equal(room.annotations._recordings[0].size,1200);assert.equal(room.annotations._recordings[0].type,'audio/webm');assert.deepEqual(room.annotations._journal,[]);
 const again=await call('attach',{path:signedPath});assert.equal(again.code,200);assert.equal(room.annotations._recordings.length,1);
 storageClient.getBucket=async()=>({data:{public:true}});assert.equal((await call('upload',{size:1200,type:'audio/webm'})).code,503);
});
