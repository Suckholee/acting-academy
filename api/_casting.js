const crypto=require('node:crypto');
const {isIP}=require('node:net');
const store=require('./_cms-store');
const auth=require('./_admin');
const m=require('../src/casting/model.cjs');
const BUCKET='academy-casting-private';
const fail=(status,message)=>Object.assign(new Error(message),{status});
function repository(db=store){
 const calls='/rest/v1/academy_casting_calls', apps='/rest/v1/academy_casting_applications';
 return {
  async calls(admin=false){const all=[];for(let offset=0;offset<10000;offset+=100){const rows=await db.request(calls+'?select=*&order=created_at.desc,id.desc&limit=100&offset='+offset+(admin?'':'&document->>status=in.(published,closed)'));all.push(...rows);if(rows.length<100)return all;}throw fail(503,'공고 목록을 불러오지 못했습니다.');},
  async call(id){return (await db.request(calls+'?select=*&id=eq.'+id+'&limit=1'))?.[0];},
  async saveCall(id,document,revision){const rows=await db.request(calls+(revision===null?'':'?id=eq.'+id+'&revision=eq.'+revision),{method:revision===null?'POST':'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({id,document,...(revision===null?{}:{revision:revision+1,updated_at:new Date().toISOString()})})});if(!rows?.[0])throw fail(409,'다른 관리자가 수정했습니다. 새로고침 후 다시 확인해주세요.');return rows[0];},
  async applications(id,offset){return db.request(apps+'?select=*&call_id=eq.'+id+'&order=created_at.desc,id.desc&limit=100&offset='+offset);},
  async counts(id=null){return db.request('/rest/v1/rpc/casting_application_counts',{method:'POST',body:JSON.stringify({p_call:id})});},
  async searchApplications(id,{offset=0,role='',status='',query='',consultation=''}={}){return db.request('/rest/v1/rpc/search_casting_applications',{method:'POST',body:JSON.stringify({p_call:id,p_role:role,p_status:status,p_query:query,p_offset:offset,p_consultation:consultation})});},
  async application(id){return (await db.request(apps+'?select=*&id=eq.'+id+'&limit=1'))?.[0];},
  async editApplication(id,revision,callRevision,answers,profile){try{return await db.request('/rest/v1/rpc/edit_casting_application',{method:'POST',body:JSON.stringify({p_id:id,p_revision:revision,p_call_revision:callRevision,p_answers:answers,p_profile:profile})});}catch{throw fail(409,'지원서나 공고가 변경되었거나 접수가 마감되었습니다. 다시 불러와주세요.');}},
  async saveSummary(id,revision,summary){const rows=await db.request(apps+'?id=eq.'+id+'&revision=eq.'+revision,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({ai_summary:summary,revision:revision+1})});if(!rows?.[0])throw fail(409,'지원서가 변경되었습니다. 다시 요약해주세요.');return rows[0];},
  async snapshot(id){return db.request('/rest/v1/rpc/casting_workflow_snapshot',{method:'POST',body:JSON.stringify({p_call:id})});},
  async saveWorkflow(call,roster,revision,document){try{return await db.request('/rest/v1/rpc/save_casting_workflow',{method:'POST',body:JSON.stringify({p_call:call.id,p_call_revision:call.revision,p_roster:roster,p_revision:revision,p_document:document})});}catch{throw fail(409,'공고·지원서·시간표가 변경되었습니다. 새로 불러온 후 다시 확인해주세요.');}},
  async updateApplication(id,revision,status,note){const rows=await db.request(apps+'?id=eq.'+id+'&revision=eq.'+revision,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status,note,revision:revision+1})});if(!rows?.[0])throw fail(409,'다른 관리자가 수정했습니다. 목록을 다시 열어주세요.');return rows[0];},
  async removeApplication(id){await db.request(apps+'?id=eq.'+id,{method:'DELETE'});},
  async submit(call,answers,profile){return db.request('/rest/v1/rpc/submit_casting_application',{method:'POST',body:JSON.stringify({p_id:crypto.randomUUID(),p_call:call.id,p_revision:call.revision,p_answers:answers,p_profile:profile})});}
 };
}
function bucket(){if(!store.ready())throw fail(503,'접수 저장소를 준비 중입니다. 아직 접수되지 않았습니다.');return require('@supabase/supabase-js').createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}).storage.from(BUCKET);}
function secret(){if(!process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET.length<32)throw fail(503,'접수 보안 설정을 확인해주세요.');return process.env.ADMIN_SESSION_SECRET;}
function editKey(id){return crypto.createHmac('sha256',secret()).update('casting-self-edit:'+id).digest('hex');}
function canEdit(id,key){return m.uuid(id)&&typeof key==='string'&&key.length===64&&auth.equal(key,editKey(id));}
function signReceipt(payload){const body=Buffer.from(JSON.stringify(payload)).toString('base64url');return body+'.'+crypto.createHmac('sha256',secret()).update('casting:'+body).digest('hex');}
function receipt(token,callId,now=Date.now()){
 if(typeof token!=='string'||token.length>2000)throw fail(400,'프로필을 다시 첨부해주세요.');
 const [body,sig]=token.split('.');const expected=crypto.createHmac('sha256',secret()).update('casting:'+body).digest('hex');
 if(!sig || !auth.equal(sig,expected))throw fail(400,'프로필 첨부 정보를 확인해주세요.');
 let data;try{data=JSON.parse(Buffer.from(body,'base64url'));}catch{throw fail(400,'프로필 첨부 정보를 확인해주세요.');}
 if(data.callId!==callId||data.expires<=now||!(data.kind==='photo'?m.validPhoto(data):m.validFile(data))||!new RegExp('^'+callId+'/[a-f0-9-]+\\.[a-z0-9]+$').test(data.path))throw fail(400,'프로필 첨부가 만료되었습니다. 다시 첨부해주세요.');return data;
}
async function verifiedFile(token,callId,storage,kind='document',now=Date.now()){
 const f=receipt(token,callId,now);if((f.kind||'document')!==kind)throw fail(400,'첨부 자료의 종류를 확인해주세요.');const {data,error}=await storage().info(f.path);if(error&&![400,404].includes(Number(error.statusCode||error.status)))throw Object.assign(fail(503,'첨부 자료를 확인하고 있습니다. 잠시 후 다시 시도해주세요.'),{retryAfter:2});if(error||!data||Number(data.metadata?.size??data.size)!==f.size||(data.content_type||data.contentType||data.metadata?.mimetype)!==f.type)throw fail(400,'첨부 자료 업로드를 확인해주세요.');return {path:f.path,name:f.name,size:f.size,type:f.type};
}
async function verifiedPhotos(items,callId,storage,now=Date.now()){
 if(items===undefined)return [];if(!Array.isArray(items)||items.length>3||new Set(items.map(v=>v?.slot)).size!==items.length)throw fail(400,'사진은 종류별로 1장씩 등록해주세요.');const result=[];for(const item of items){if(!m.PHOTO_SLOTS.includes(item?.slot))throw fail(400,'사진 종류를 확인해주세요.');result.push({...await verifiedFile(item.receipt,callId,storage,'photo',now),slot:item.slot});}return result;
}
function profilePaths(profile){return [profile.path,...(profile.photos||[]).map(p=>p.path)].filter(Boolean);}
async function rateLimit(req,context={}){const ip=process.env.VERCEL?req.headers['x-vercel-forwarded-for']?.split(',')[0]?.trim():req.socket?.remoteAddress;if(!isIP(ip||''))throw fail(503,'접수를 잠시 후 다시 시도해주세요.');const key=crypto.createHmac('sha256',secret()).update(context.flow?'casting-flow:'+context.flow:'casting:'+ip).digest('hex');const retry=await store.request('/rest/v1/rpc/consume_casting_attempt',{method:'POST',body:JSON.stringify({p_bucket:key})});if(!Number.isInteger(retry)||retry<0)throw fail(503,'접수를 잠시 후 다시 시도해주세요.');if(retry)throw Object.assign(fail(429,'요청이 많습니다. 잠시 후 다시 시도해주세요.'),{retryAfter:retry});}
function body(req){let value;try{value=auth.body(req);}catch{throw fail(400,'입력 내용을 확인해주세요.');}if(!value||typeof value!=='object'||Array.isArray(value))throw fail(400,'입력 내용을 확인해주세요.');if(Buffer.byteLength(JSON.stringify(value))>40000)throw fail(413,'입력 내용이 너무 깁니다.');return value;}
module.exports={verifiedFile,verifiedPhotos,profilePaths,repository,bucket,signReceipt,receipt,rateLimit,body,fail,editKey,canEdit};
