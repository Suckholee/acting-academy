const crypto=require('node:crypto'),store=require('./_cms-store');
const COOKIE='kjt_audition_visitor';
const positive=v=>Number.isSafeInteger(v)&&v>0;
const fail=(code,message,status=409)=>Object.assign(Error(message),{code,status});
function createQueue({request=(...a)=>store.request(...a),secret=()=>process.env.ADMIN_SESSION_SECRET,now=()=>Date.now(),capacity=()=>Number(process.env.AUDITION_CONCURRENCY)||3}={}){
 const count=()=>Math.max(1,Math.min(8,Math.floor(capacity()))),ttl=60000,runTtl=270000,maxWait=30*60000;
 const mac=text=>crypto.createHmac('sha256',secret()).update(text).digest('base64url');
 function sign(value){const data=Buffer.from(JSON.stringify(value)).toString('base64url');return data+'.'+mac(data);}
 function parse(token,type,visitor){try{const [data,sig,...extra]=String(token).split('.'),expected=mac(data);if(extra.length||!sig||sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw Error();const p=JSON.parse(Buffer.from(data,'base64url'));if(p.type!==type||p.visitor!==visitor||p.deadline<=now())throw Error();return p;}catch{throw fail('expired','대기 요청이 만료됐습니다. 사진은 유지되니 다시 눌러주세요.');}}
 const keyFilter=key=>'bucket=eq.'+encodeURIComponent(key);
 async function row(key){return (await request('/rest/v1/academy_ai_limits?'+keyFilter(key)+'&select=bucket,attempts,expires_at'))?.[0];}
 async function insert(value){await request('/rest/v1/academy_ai_limits?'+keyFilter(value.bucket)+'&expires_at=lte.'+encodeURIComponent(new Date(now()).toISOString()),{method:'DELETE'});return (await request('/rest/v1/academy_ai_limits?on_conflict=bucket',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify(value)}))?.[0];}
 async function patch(key,nonce,values,alive=true){return (await request('/rest/v1/academy_ai_limits?'+keyFilter(key)+'&attempts=eq.'+nonce+(alive?'&expires_at=gt.'+encodeURIComponent(new Date(now()).toISOString()):''),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(values)}))?.[0];}
 async function remove(key,nonce){await request('/rest/v1/academy_ai_limits?'+keyFilter(key)+'&attempts=in.('+nonce+','+(-nonce)+')',{method:'DELETE'});}
 function session(req,res){if(!secret())throw Error('session_unavailable');let id;try{const raw=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1),[value,sig]=String(raw).split('.'),expected=mac('visitor:'+value);if(!sig||sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw Error();const data=JSON.parse(Buffer.from(value,'base64url'));if(!/^[a-f0-9-]{36}$/.test(data.id)||data.until<=now())throw Error();id=data.id;}catch{const data={id:crypto.randomUUID(),until:now()+7*86400000},value=Buffer.from(JSON.stringify(data)).toString('base64url');id=data.id;res.setHeader('Set-Cookie',COOKIE+'='+value+'.'+mac('visitor:'+value)+'; Path=/api/ai-audition; Max-Age=604800; HttpOnly; SameSite=Lax'+(req.headers.host?.startsWith('127.0.0.1')?'':'; Secure'));}return crypto.createHmac('sha256',secret()).update('visitor:'+id).digest('hex');}
 async function prepare({visitor,scriptId,requestId,ticket}){
  if(!/^[a-f0-9-]{36}$/.test(requestId))throw fail('invalid','요청을 다시 시작해주세요.',400);
  let q;
  if(ticket){q=parse(ticket,'queue',visitor);if(q.requestId!==requestId||q.scriptId!==scriptId)throw fail('invalid','선택한 작품으로 다시 요청해주세요.',400);}
  else{
   const nonce=crypto.randomInt(1,2147483647),user='audition-user:'+visitor,expires_at=new Date(now()+ttl).toISOString();
   if(!await insert({bucket:user,attempts:nonce,expires_at}))throw fail('already_running','다른 요청이 진행 중입니다. 완료하거나 대기를 취소한 뒤 다시 시도해주세요.');
   q={type:'queue',visitor,scriptId,requestId,nonce,user,key:'audition-queue:'+String(now()).padStart(13,'0')+':'+crypto.randomUUID(),deadline:now()+maxWait};
   try{if(!await insert({bucket:q.key,attempts:nonce,expires_at}))throw Error('queue_insert');}catch(error){await remove(user,nonce).catch(()=>{});throw error;}
  }
  const expires_at=new Date(now()+ttl).toISOString();
  if(!await patch(q.key,q.nonce,{expires_at})||!await patch(q.user,q.nonce,{expires_at}))throw fail('expired','대기 요청이 만료됐습니다. 사진은 유지되니 다시 눌러주세요.');
  const pending=await request('/rest/v1/academy_ai_limits?bucket=like.audition-queue:*&attempts=gt.0&expires_at=gt.'+encodeURIComponent(new Date(now()).toISOString())+'&select=bucket&order=bucket.asc&limit=1000');
  const position=(pending||[]).findIndex(x=>x.bucket===q.key)+1,queueToken=sign(q);
  if(!position)throw fail('expired','대기 요청이 만료됐습니다. 다시 요청해주세요.');
  if(position<=count()){
   const slots=await request('/rest/v1/academy_ai_limits?bucket=like.audition-slot:*&expires_at=gt.'+encodeURIComponent(new Date(now()).toISOString())+'&select=bucket');
   for(let i=0;i<count();i++){
    const slot='audition-slot:'+i;if((slots?.length||0)>=count())break;if(slots?.some(x=>x.bucket===slot))continue;
    const until=new Date(now()+45000).toISOString();
    if(await insert({bucket:slot,attempts:q.nonce,expires_at:until}))return {state:'ready',ticket:queueToken,permit:sign({type:'permit',visitor,q,slot,deadline:now()+45000}),concurrency:count()};
   }
  }
  return {state:'queued',ticket:queueToken,position,retryAfter:Math.min(15,Math.max(3,Math.ceil(position/count())*2)),concurrency:count()};
 }
 async function start({visitor,scriptId,requestId,permit}){
  const p=parse(permit,'permit',visitor),q=p.q;if(q.scriptId!==scriptId||q.requestId!==requestId)throw fail('invalid','작품을 다시 선택해주세요.',400);
  const end=new Date(now()+runTtl).toISOString();
  if(!await patch(p.slot,q.nonce,{attempts:-q.nonce,expires_at:end}))throw fail('expired','처리 차례가 만료됐습니다. 사진은 유지되니 다시 요청해주세요.');
  try{if(!await patch(q.key,q.nonce,{attempts:-q.nonce,expires_at:end})||!await patch(q.user,q.nonce,{attempts:-q.nonce,expires_at:end}))throw fail('expired','진행 중인 요청을 다시 확인해주세요.');return p;}catch(error){await finish(p);throw error;}
 }
 async function reserve(p,consume,req){const key='audition-charge:'+crypto.createHmac('sha256',secret()).update(p.visitor+':'+p.q.requestId).digest('hex');let current=await row(key);if(current&&Date.parse(current.expires_at)>now()){if(current.attempts===2)throw fail('already_completed','이미 완료된 요청입니다. 결과가 표시되지 않으면 사진을 유지한 채 새로 요청해주세요.');if(current.attempts===1)return key;}if(!current||Date.parse(current.expires_at)<=now())await insert({bucket:key,attempts:0,expires_at:new Date(now()+maxWait+runTtl).toISOString()});const retry=await consume(req,p.visitor);if(!Number.isInteger(retry)||retry<0)throw Error('limit');if(retry)throw Object.assign(fail('rate_limited',`생성 요청 한도에 도달했습니다. 약 ${Math.ceil(retry/60)}분 후 다시 시도해주세요. 사진과 선택한 작품은 유지됩니다.`,429),{retryAfter:retry});if(!await patch(key,0,{attempts:1}))throw Error('quota_reservation');return key;}
 async function complete(key){await patch(key,1,{attempts:2});}
 async function finish(p){await Promise.allSettled([remove(p.slot,p.q.nonce),remove(p.q.key,p.q.nonce),remove(p.q.user,p.q.nonce)]);}
 async function cancel({visitor,ticket,permit}){if(!ticket)return;const q=parse(ticket,'queue',visitor);const removed=await request('/rest/v1/academy_ai_limits?'+keyFilter(q.key)+'&attempts=eq.'+q.nonce,{method:'DELETE',headers:{Prefer:'return=representation'}});if(!removed?.length)return;const tasks=[request('/rest/v1/academy_ai_limits?'+keyFilter(q.user)+'&attempts=eq.'+q.nonce,{method:'DELETE'})];if(permit){try{const p=parse(permit,'permit',visitor);if(p.q.key===q.key)tasks.push(request('/rest/v1/academy_ai_limits?'+keyFilter(p.slot)+'&attempts=eq.'+q.nonce,{method:'DELETE'}));}catch{}}await Promise.allSettled(tasks);}
 return {session,prepare,start,reserve,complete,finish,cancel,concurrency:count};
}
module.exports={createQueue,queue:createQueue()};
