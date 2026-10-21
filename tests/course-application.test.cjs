const {test}=require('node:test'),assert=require('node:assert/strict');
const {createHandler}=require('../api/course-application');
const body={name:'테스트',phone:'010-1234-5678',course:'camera',consent:true};
function response(){return {code:200,setHeader(){},status(n){this.code=n;return this;},json(data){this.data=data;return this;}};}
function req(data=body){return {method:'POST',headers:{origin:'https://example.com',host:'example.com'},body:data};}
async function run(store,data=body,limit=async()=>0){const previous=process.env.ADMIN_SESSION_SECRET;process.env.ADMIN_SESSION_SECRET='test-only-secret';try{const res=response();await createHandler({store,limit})(req(data),res);return res;}finally{if(previous===undefined)delete process.env.ADMIN_SESSION_SECRET;else process.env.ADMIN_SESSION_SECRET=previous;}}
test('valid application saves only approved fields and confirms storage',async()=>{let saved;const r=await run({ready:()=>true,request:async(route,options)=>{if(options.method==='POST'){saved=JSON.parse(options.body);return [{id:saved.id}];}return null;}});assert.equal(r.code,201);assert.equal(saved.phone,'01012345678');assert.deepEqual(saved.purposes,['수강 신청']);assert.equal(saved.status,'신규');});
test('consent and valid course are required before storage',async()=>{for(const invalid of [{...body,consent:false},{...body,course:'bad'},{...body,phone:'123'}]){const r=await run({ready:()=>true,request:()=>assert.fail()},invalid);assert.equal(r.code,400);}});
test('failed storage never returns success',async()=>{const r=await run({ready:()=>true,request:async()=>{throw Error('offline');}});assert.equal(r.code,503);assert(!r.data.id);});
test('rate limited submissions never write records',async()=>{const r=await run({ready:()=>true,request:()=>assert.fail()},body,async()=>60);assert.equal(r.code,429);});

test('instagram answers are validated and included in the private record',async()=>{let saved;const r=await run({ready:()=>true,request:async(route,options)=>{saved=JSON.parse(options.body);return [{id:saved.id}];}},{...body,purpose:'취미·입문',region:'서울',source:'instagram'});assert.equal(r.code,201);assert(saved.purposes.includes('취미·입문'));assert.match(saved.memo,/인스타그램/);assert.match(saved.memo,/서울/);});
test('incomplete instagram answers are rejected',async()=>{const r=await run({ready:()=>true,request:()=>assert.fail()},{...body,source:'instagram'});assert.equal(r.code,400);});
