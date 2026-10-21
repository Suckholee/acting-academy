const auth=require('./_admin');const store=require('./_cms-store');
const {normalizeStage,validate}=require('../src/admissions/model.cjs');
function createHandler({database=store,requireAdmin=(...args)=>auth.requireAdmin(...args)}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');if(!await requireAdmin(req,res))return;
 try{
  if(req.method==='GET'){
   const records=await database.request('/rest/v1/academy_inquiries?select=*&order=created_at.desc&limit=1000');
   let workflow;try{workflow=await database.request('/rest/v1/academy_inquiry_workflow?select=*');}catch{return res.json({scheduleReady:false,records:records.map(r=>({...r,status:normalizeStage(r.status),revision:0}))});}
   const byId=new Map(workflow.map(w=>[w.inquiry_id,w]));
   return res.json({scheduleReady:true,records:records.map(r=>{const w=byId.get(r.id);return {...r,status:w?.stage||normalizeStage(r.status),revision:w?.revision||0,startsAt:w?.starts_at||null,endsAt:w?.ends_at||null,counselor:w?.counselor||'임도윤 실장'};})});
  }
  if(req.method!=='PATCH')return res.status(405).json({error:'지원하지 않는 요청입니다.'});
  const data=auth.body(req),error=validate(data);if(error)return res.status(400).json({error});
  const result=await database.request('/rest/v1/rpc/save_academy_inquiry_workflow',{method:'POST',body:JSON.stringify({p_id:data.id,p_stage:data.status,p_starts_at:data.startsAt||null,p_ends_at:data.endsAt||null,p_counselor:'임도윤 실장',p_memo:data.memo,p_revision:data.revision})});
  return res.json({record:{id:data.id,status:result.stage,memo:data.memo,startsAt:result.starts_at,endsAt:result.ends_at,counselor:result.counselor,revision:result.revision}});
 }catch{return res.status(409).json({error:'저장하지 못했습니다. 같은 실장의 예약 시간 중복 또는 다른 창의 수정 여부를 확인하고 새로고침해주세요.'});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
