// Local-only fixtures; never imported by the production serverless handler.
const auth=require('../api/_admin');
function createDemo(){
 const records=[
 {id:'b079d152-62a0-4396-a32a-12960bc2fb65',name:'시연 문의 A',phone:'01000000000',courses:['카메라 연기'],purposes:['취미·입문'],status:'신규',memo:'시연용 데이터입니다. 실제 접수 내역이 아닙니다.',created_at:'2026-10-19T01:30:00Z'},
 {id:'bd19b9eb-328d-4ff0-9903-c8e29fd6fb09',name:'시연 문의 B',phone:'01000000000',courses:['시니어 모델 트레이닝'],purposes:['배우 준비'],status:'연락 중',memo:'일정과 수강료 안내 예정 (시연)',created_at:'2026-10-19T00:20:00Z'}
 ];
 return async(req,res)=>{
  if(!await auth.requireAdmin(req,res))return;
  if(req.method==='GET')return res.json({demo:true,records});
  if(req.method!=='PATCH')return res.status(405).json({error:'지원하지 않는 요청입니다.'});
  const data=auth.body(req);if(!['신규','연락 중','상담완료'].includes(data?.status)||typeof data.memo!=='string'||data.memo.length>4000)return res.status(400).json({error:'입력 내용을 확인해주세요.'});
  const record=records.find(r=>r.id===data.id);if(!record)return res.status(404).json({error:'문의를 찾을 수 없습니다.'});Object.assign(record,{status:data.status,memo:data.memo});return res.json({record,demo:true});
 };
}
module.exports={createDemo};
