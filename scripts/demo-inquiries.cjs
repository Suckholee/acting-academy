// Local-only fixtures. No production records or messages are created.
const auth=require('../api/_admin');const {validate,validateProfile}=require('../src/admissions/model.cjs');
function createDemo(){const records=[
 {id:'b079d152-62a0-4396-a32a-12960bc2fb65',name:'시연 신청자 A',phone:'01000000000',courses:['카메라·무대 연기 기초'],purposes:['취미·입문'],status:'신청',memo:'시연용 데이터입니다.',created_at:'2026-10-21T01:00:00Z',revision:0},
 {id:'bd19b9eb-328d-4ff0-9903-c8e29fd6fb09',name:'시연 신청자 B',phone:'01000000000',courses:['취미반'],purposes:['취미·입문'],status:'대면 상담 진행',memo:'시연용 대면 상담 예약',created_at:'2026-10-21T00:20:00Z',startsAt:'2026-10-21T05:00:00Z',endsAt:'2026-10-21T06:00:00Z',revision:1,counselor:'임도윤 실장'}];return async(req,res)=>{
 if(!await auth.requireAdmin(req,res))return;
 if(req.method==='GET')return res.json({demo:true,scheduleReady:true,records});
 if(req.method!=='PATCH')return res.status(405).json({error:'지원하지 않는 요청입니다.'});
 const data=auth.body(req),error=data?.action==='profile'?validateProfile(data):validate(data);if(error)return res.status(400).json({error});
 const record=records.find(r=>r.id===data.id);if(!record)return res.status(404).json({error:'상담자를 찾을 수 없습니다.'});
 if(data.action==='profile'){Object.assign(record,{name:data.name.trim(),phone:data.phone.replace(/[ -]/g,''),courses:data.courses,purposes:data.purposes});return res.json({record:{id:record.id,name:record.name,phone:record.phone,courses:record.courses,purposes:record.purposes},demo:true});}
 if(record.revision!==data.revision)return res.status(409).json({error:'다른 창에서 변경되었습니다.'});
 if(data.startsAt&&records.some(r=>r.id!==data.id&&(r.counselor||'임도윤 실장')===(data.counselor||'임도윤 실장')&&r.startsAt&&Date.parse(data.startsAt)<Date.parse(r.endsAt)&&Date.parse(data.endsAt)>Date.parse(r.startsAt)))return res.status(409).json({error:'같은 시간에 예약이 있습니다.'});
 Object.assign(record,{status:data.status,counselor:data.counselor||'임도윤 실장',memo:data.memo,startsAt:data.startsAt,endsAt:data.endsAt,revision:record.revision+1});return res.json({record,demo:true});
};}module.exports={createDemo};
