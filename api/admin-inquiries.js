const auth=require('./_admin');const store=require('./_cms-store');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');if(!await auth.requireAdmin(req,res))return;
 try{
  if(req.method==='GET')return res.json({records:await store.request('/rest/v1/academy_inquiries?select=*&order=created_at.desc&limit=200')});
  if(req.method!=='PATCH')return res.status(405).json({error:'지원하지 않는 요청입니다.'});
  const data=auth.body(req);if(!/^[a-f0-9-]{36}$/.test(data?.id)||!['신규','연락 중','상담완료'].includes(data.status)||typeof data.memo!=='string'||data.memo.length>4000)return res.status(400).json({error:'입력 내용을 확인해주세요.'});
  const rows=await store.request('/rest/v1/academy_inquiries?id=eq.'+data.id,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:data.status,memo:data.memo})});
  return res.json({record:rows[0]});
 }catch{return res.status(503).json({error:'상담 저장소에 연결하지 못했습니다.'});}
};
