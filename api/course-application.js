const crypto=require('node:crypto');
const {isIP}=require('node:net');
const auth=require('./_admin');
const database=require('./_cms-store');
const {purposes,regions}=require('../src/enrollment/model.cjs');
const courses=require('../content/courses.json');
function validate(body){
 if(!body||typeof body.name!=='string'||body.name.trim().length<2||body.name.trim().length>40)return '이름을 2~40자로 입력해주세요.';
 if(typeof body.phone!=='string'||!/^01[016789]\d{7,8}$/.test(body.phone.replace(/[ -]/g,'')))return '휴대전화 번호를 확인해주세요.';
 if(!courses.some(course=>course.id===body.course))return '희망 과정을 선택해주세요.';
 if(body.purpose!==undefined&&!purposes.includes(body.purpose))return '수강 목적을 선택해주세요.';
 if(body.region!==undefined&&!regions.includes(body.region))return '지역을 선택해주세요.';
 if(body.source!==undefined&&!['instagram','website'].includes(body.source))return '유입 경로를 확인해주세요.';
 if(body.source==='instagram'&&(!body.purpose||!body.region))return '수강 목적과 지역을 선택해주세요.';
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
  const record={id:crypto.randomUUID(),name:body.name.trim(),phone:body.phone.replace(/[ -]/g,''),purposes:['수강 신청',...(body.purpose?[body.purpose]:[])],courses:[course.title],consent:true,status:'신규',memo:(body.source==='instagram'?'인스타그램':'홈페이지')+' 수강 신청 / 상담 대기 / 담당: 임도윤 실장'+(body.region?' / 지역: '+body.region:'')};
  const rows=await store.request('/rest/v1/academy_inquiries',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(record)});
  if(!rows?.[0]?.id)throw Error('not_confirmed');
  return res.status(201).json({id:rows[0].id,message:'상담 대기자 명단에 접수되었습니다. 임도윤 실장이 남겨주신 번호로 직접 연락드립니다. 수강 확정은 상담 후 진행됩니다.'});
 }catch{return res.status(503).json({error:'신청 접수를 확인하지 못했습니다. 잠시 후 다시 시도하거나 010-9942-4528로 문의해주세요.'});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;module.exports.validate=validate;
