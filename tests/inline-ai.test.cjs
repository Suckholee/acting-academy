const {test}=require('node:test');const assert=require('node:assert/strict');const registry=require('../content/editor-registry.json');const auth=require('../api/_admin');const {createHandler}=require('../api/admin-inline-ai');const {validateChanges}=require('../src/published-editor/chat-model.cjs');
const moduleDef=Object.values(registry.modules).find(m=>m.page==='/reviews'&&m.kind==='review');const values=Object.fromEntries(moduleDef.fields.map(f=>[f.id,f.defaultValue]));const photo={id:'photo-test',data:'data:image/jpeg;base64,'+Buffer.from([255,216,255,0,0]).toString('base64')};
const response=()=>({code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.data=v;return this;}});
async function call(handler,body,method='POST'){const res=response();await handler({method,body,headers:{host:'localhost'}},res);return res;}
const input=(extra={})=>({moduleId:moduleDef.id,values,message:'이 사진으로 수강후기 써줘',history:[],images:[photo],...extra});
test('inline AI uses server-defined modules, requests real review context and proposes bounded photo/text updates',async()=>{
 const old=auth.requireAdmin;try{auth.requireAdmin=async()=>true;const handler=createHandler({demo:true});
 const question=await call(handler,input());assert.equal(question.data.status,'question');assert.equal(question.data.changes.length,0);
 const draft=await call(handler,input({message:'소감: 대본을 함께 읽으며 말하기가 편해졌어요. 이 사진으로 수강후기 써줘'}));assert.equal(draft.code,200);assert.ok(draft.data.changes.some(c=>c.after==='attachment:photo-test'));assert.ok(draft.data.changes.some(c=>c.after.includes('대본을 함께 읽으며')));
 const layout=await call(handler,input({message:'레이아웃을 바꾸고 카드 추가해줘'}));assert.equal(layout.data.status,'unsupported');assert.equal(layout.data.changes.length,0);
 assert.equal((await call(handler,input({moduleId:'__proto__'}))).code,400);assert.equal((await call(handler,input({values:{...values,css:'red'}}))).code,400);assert.equal((await call(handler,input({images:[{id:'photo-x',data:'https://private.example/image'}]}))).code,400);
 }finally{auth.requireAdmin=old;}
});
test('inline AI authorization precedes input processing and provider access',async()=>{
 const old=auth.requireAdmin;try{auth.requireAdmin=async(req,res)=>{res.status(401).json({error:'auth'});return false;};const handler=createHandler({demo:true,fetcher:()=>{throw Error('must not call');}});assert.equal((await call(handler,input())).code,401);assert.equal((await call(handler,null,'GET')).code,401);}finally{auth.requireAdmin=old;}
});
test('proposal validator rejects new fields, executable content and unrequested media URLs',()=>{
 const text=moduleDef.fields.find(f=>f.type==='text'),image=moduleDef.fields.find(f=>f.type==='image');
 for(const change of [{fieldId:'layout',value:'grid'},{fieldId:text.id,value:'<script>alert(1)</script>'},{fieldId:image.id,value:'https://invented.example/photo.jpg'},{fieldId:image.id,value:'attachment:unknown'},{fieldId:text.id,value:'new',css:'red'}])assert.throws(()=>validateChanges(moduleDef,values,[change],[photo],''));
 assert.equal(validateChanges(moduleDef,values,[{fieldId:image.id,value:'attachment:photo-test'}],[photo],'')[0].after,'attachment:photo-test');
});
test('live proposal uses constrained multimodal schema, consent, usage limit and revalidates model output',async()=>{
 const oldAuth=auth.requireAdmin;const names=['OPENAI_API_KEY','OPENAI_MODEL','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','ADMIN_SESSION_SECRET'];const env=Object.fromEntries(names.map(n=>[n,process.env[n]]));let captured;
 try{auth.requireAdmin=async()=>true;names.forEach(n=>process.env[n]='test');const text=moduleDef.fields.find(f=>f.id.startsWith('body-'));
 const handler=createHandler({limit:async()=>0,fetcher:async(url,options)=>{captured=JSON.parse(options.body);return {ok:true,json:async()=>({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify({status:'proposal',message:'변경안',changes:[{fieldId:text.id,value:'제공된 실제 소감'}]})}]}]})};}});
 assert.equal((await call(handler,input())).code,400);const result=await call(handler,input({consent:true}));assert.equal(result.code,200);assert.equal(captured.store,false);assert.equal(captured.text.format.strict,true);assert.equal(captured.input[0].content[1].type,'input_image');assert.ok(captured.text.format.schema.properties.changes.items.properties.fieldId.enum.includes(text.id));
 const invalid=createHandler({limit:async()=>0,fetcher:async()=>({ok:true,json:async()=>({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify({status:'proposal',message:'oops',changes:[{fieldId:'css',value:'red'}]})}]}]})})});assert.equal((await call(invalid,input({consent:true}))).code,503);
 const limited=createHandler({limit:async()=>60,fetcher:async()=>{throw Error('must not call');}});assert.equal((await call(limited,input({consent:true}))).code,429);
 }finally{auth.requireAdmin=oldAuth;for(const name of names)env[name]===undefined?delete process.env[name]:process.env[name]=env[name];}
});
test('all registered modules expose only typed fixed-template slots and stable IDs',()=>{
 const ids=new Set();for(const module of Object.values(registry.modules)){assert.ok(!ids.has(module.id));ids.add(module.id);for(const field of module.fields){assert.ok(['text','image','video'].includes(field.type));assert.match(field.key,/^cms-\d+$/);assert.ok(!['html','css','layout'].includes(field.id));}}
});
