const auth=require('./_admin');
const store=require('./_cms-store');
const {valid}=require('./site-content');
const validRevision=value=>Number.isSafeInteger(value)&&value>=0;
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(!await auth.requireAdmin(req,res))return;
 if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'지원하지 않는 요청입니다.'});
 try{
  if(req.method==='GET'){
   const url=new URL(req.url||'/api/admin-content-history','http://localhost');
   const revision=url.searchParams.get('revision');
   if(revision!==null){
    if(!/^\d+$/.test(revision)||!validRevision(Number(revision)))return res.status(400).json({error:'이력 번호를 확인해주세요.'});
    const rows=await store.request('/rest/v1/academy_content_history?revision=eq.'+Number(revision)+'&select=*');
    return rows[0]?res.json({record:rows[0]}):res.status(404).json({error:'선택한 저장 이력을 찾을 수 없습니다.'});
   }
   const before=url.searchParams.get('before');
   if(before!==null&&(!/^\d+$/.test(before)||!validRevision(Number(before))))return res.status(400).json({error:'이력 번호를 확인해주세요.'});
   const records=await store.request('/rest/v1/academy_content_history?select=revision,created_at,action,restored_from&order=revision.desc&limit=50'+(before!==null?'&revision=lt.'+Number(before):''));
   return res.json({records,nextBefore:records.length===50?records.at(-1).revision:null});
  }
  let data;try{data=auth.body(req);}catch{return res.status(400).json({error:'입력 내용을 확인해주세요.'});}
  if(!validRevision(data?.targetRevision)||!validRevision(data?.revision)||data.targetRevision===data.revision)return res.status(400).json({error:'복원할 이전 저장 시점을 선택해주세요.'});
  const rows=await store.request('/rest/v1/academy_content_history?revision=eq.'+data.targetRevision+'&select=*');
  if(!rows[0])return res.status(404).json({error:'선택한 저장 이력을 찾을 수 없습니다.'});
  if(!valid(rows[0].value))return res.status(422).json({error:'이 저장 이력의 형식이 현재 편집기와 호환되지 않습니다.'});
  const revision=await store.request('/rest/v1/rpc/restore_academy_content',{method:'POST',body:JSON.stringify({target_revision:data.targetRevision,expected_revision:data.revision})});
  if(revision===null)return res.status(409).json({error:'다른 곳에서 변경되었습니다. 현재 화면을 새로고침한 뒤 복원해주세요.'});
  return res.json({revision,pages:rows[0].value,restoredFrom:data.targetRevision});
 }catch{return res.status(503).json({error:'저장 이력에 연결하지 못했습니다. 서버 연결과 이력 저장소 설정을 확인해주세요.'});}
};
