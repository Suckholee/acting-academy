const crypto=require('node:crypto');
const {isIP}=require('node:net');
const auth=require('./_admin');
const database=require('./_cms-store');
const courses=require('../content/courses.json');
function validate(body){
 if(!body||typeof body.name!=='string'||body.name.trim().length<2||body.name.trim().length>40)return '이름을 2~40자로 입력해주세요.';
 if(typeof body.phone!=='string'||!/^01[016789]\d{7,8}$/.test(body.phone.replace(/[ -]/g,'')))return '휴대전화 번호를 확인해주세요.';
 if(!courses.some(course=>course.id===body.course))return '희망 과정을 선택해주세요.';
 if(body.consent!==true)return '개인정보 수집·이용에 동의해주세요.';
 if(body.website)return '입력 내용을 확인해주세요.';
 return null;
}
function createHandler({store=database,limit}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method==='GET')return res.json({ready:store.ready()&&Boolean(process.env.ADMIN_SESSION_SECRET)});
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'지원하지 않는 요청입니다.'});}
 if(!auth.sameOrigin(req))return res.status(403).json({error:'허용되지 않은 요청입니다.'});
 let body;try{body=auth.body(req);}catch{return res.status(400).json({error:'입력 내용을 확인해주세요.'});}
 if(Buffer.byteLength(JSON.stringify(body)||'')>4096)return res.status(413).json({error:'입력 내용이 너무 깁니다.'});
 const error=validate(body);if(error)return res.status(400).json({error});
 if(!store.ready()||!process.env.ADMIN_SESSION_SECRET)return res.status(503).json({error:'온라인 신청 연결을 준비 중입니다. 아직 접수되지 않았습니다. 010-9942-4528로 문의해주세요.'});
 try{
  const ip=process.env.VERCEL?req.headers['x-vercel-forwarded-for']?.split(',')[0]?.trim():req.socket?.remoteAddress;
  if(!limit&&!isIP(ip||''))throw Error('ip_unavailable');
  const bucket=crypto.createHmac('sha256',process.env.ADMIN_SESSION_SECRET).update('application:'+ip).digest('hex');
  const retry=limit?await limit(req):await store.request('/rest/v1/rpc/consume_academy_ai_attempt',{method:'POST',body:JSON.stringify({p_bucket:bucket})});
  if(!Number.isInteger(retry)||retry<0)throw Error('limit_unavailable');
  if(retry){res.setHeader('Retry-After',String(retry));return res.status(429).json({error:'신청 요청이 많습니다. 잠시 후 다시 시도해주세요.'});}
  const course=courses.find(c=>c.id===body.course);
  const record={id:crypto.randomUUID(),name:body.name.trim(),phone:body.phone.replace(/[ -]/g,''),purposes:['수강 신청'],courses:[course.title],consent:true,status:'신규',memo:'홈페이지 챗봇에서 수강 신청 · 담당자 확인 필요'};
  const rows=await store.request('/rest/v1/academy_inquiries',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(record)});
  if(!rows?.[0]?.id)throw Error('not_confirmed');
  return res.status(201).json({id:rows[0].id,message:'수강 신청이 접수되었습니다. 담당자가 연락드려 일정과 등록 가능 여부를 안내합니다. 수강 확정은 담당자 확인 후 진행됩니다.'});
 }catch{return res.status(503).json({error:'신청 접수를 확인하지 못했습니다. 잠시 후 다시 시도하거나 010-9942-4528로 문의해주세요.'});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;module.exports.validate=validate;
