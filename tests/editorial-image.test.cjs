const {test}=require('node:test'),assert=require('node:assert/strict');
const {createHandler}=require('../api/admin-editorial-image');
function response(){return {code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(data){this.data=data;return this;}};}
async function call(handler,body={},headers={}){const r=response();await handler({method:'POST',url:'/api/admin-editorial-image',headers:{host:'example.com',origin:'https://example.com',...headers},body},r);return r;}
const allow=async()=>true,input={title:'시선 처리',body:'상대의 위치를 정하고 연습하세요.',prompt:'카메라 옆 시선 표시를 바라보는 성인 배우',consent:true};
test('image generation enforces admin authorization, origin and consent before contacting providers',async()=>{
 let used=false;const fetcher=async()=>{used=true;};let handler=createHandler({authorize:async(req,res)=>{res.status(401).json({});return false;},fetcher});assert.equal((await call(handler,input)).code,401);
 handler=createHandler({authorize:allow,fetcher});assert.equal((await call(handler,input,{origin:'https://evil.example'})).code,403);assert.equal((await call(handler,{...input,consent:false})).code,400);assert.equal(used,false);
});
test('live image generation stores validated JPEG bytes and returns a durable media URL',async()=>{
 const names=['OPENAI_API_KEY','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','OPENAI_IMAGE_MODEL'],old=Object.fromEntries(names.map(n=>[n,process.env[n]]));Object.assign(process.env,{OPENAI_API_KEY:'test',SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test'});delete process.env.OPENAI_IMAGE_MODEL;
 try{
  const calls=[],jpeg=Buffer.from([255,216,255,224,0,16]);const handler=createHandler({authorize:allow,limit:async()=>0,fetcher:async(url,options)=>{calls.push({url,options});return calls.length===1?{ok:true,json:async()=>({data:[{b64_json:jpeg.toString('base64')}]})}:{ok:true};}});
  const r=await call(handler,input);assert.equal(r.code,200);assert.match(r.data.image,/^https:\/\/test\.supabase\.co\/storage\/v1\/object\/public\/academy-site-media\/[a-f0-9-]+\.jpg$/);
  const payload=JSON.parse(calls[0].options.body);assert.equal(payload.model,'gpt-image-2');assert.equal(payload.n,1);assert.equal(payload.output_format,'jpeg');assert.match(payload.prompt,/시선 처리/);assert.deepEqual(calls[1].options.body,jpeg);
  let callsOnFailure=0;const invalid=createHandler({authorize:allow,limit:async()=>0,fetcher:async()=>{callsOnFailure++;return {ok:true,json:async()=>({data:[{b64_json:Buffer.from('<svg/>').toString('base64')}]})};}});assert.equal((await call(invalid,input)).code,503);assert.equal(callsOnFailure,1);
  const limited=createHandler({authorize:allow,limit:async()=>60,fetcher:async()=>{throw Error('must not call');}});const l=await call(limited,input);assert.equal(l.code,429);assert.equal(l.headers['Retry-After'],'60');
 }finally{for(const name of names)if(old[name]===undefined)delete process.env[name];else process.env[name]=old[name];}
});
