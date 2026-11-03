const auth=require('./_admin'),store=require('./_cms-store');
const {koreaDay}=require('./admin-visitor-stats');
const {SOURCES}=require('../src/analytics/attribution.cjs');
function createHandler({authorize=auth.requireAdmin,database=store,now=()=>new Date()}={}){
 const cache=new Map(),pending=new Map();
 return async(req,res)=>{
  res.setHeader('Cache-Control','private, no-store');if(!await authorize(req,res))return;
  if(req.method!=='GET')return res.status(405).json({error:'지원하지 않는 요청입니다.'});
  const period=new URL(req.url,'http://localhost').searchParams.get('period')||'today',days={today:1,'7d':7,'30d':30};
  if(!Object.hasOwn(days,period))return res.status(400).json({error:'조회 기간을 확인해주세요.'});
  const date=now(),through=koreaDay(date),saved=cache.get(period);
  if(saved?.day===through&&date-saved.at<3600000)return res.json(saved.data);
  try{
   let task=pending.get(period);if(!task||task.day!==through){
    const since=new Date(new Date(through+'T00:00:00+09:00').getTime()-(days[period]-1)*86400000).toISOString();
    task={day:through};const current=task;
    task.promise=(async()=>{
     const rows=await database.request('/rest/v1/rpc/academy_application_sources',{method:'POST',body:JSON.stringify({p_since:since,p_until:date.toISOString()})});
     if(!Array.isArray(rows)||rows.some(row=>![...SOURCES,'uncollected'].includes(row.source)||![row.consultations,row.events].every(n=>Number.isSafeInteger(n)&&n>=0))||new Set(rows.map(row=>row.source)).size!==rows.length)throw Error('invalid_counts');
     const data={period,from:koreaDay(new Date(since)),through,updatedAt:date.toISOString(),sources:rows.filter(row=>row.consultations||row.events)};
     cache.set(period,{day:through,at:date,data});return data;
    })().finally(()=>{if(pending.get(period)===current)pending.delete(period);});pending.set(period,task);
   }
   return res.json(await task.promise);
  }catch{return res.status(503).json({error:'신청 유입 경로를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.'});}
 };
}
module.exports=createHandler();module.exports.createHandler=createHandler;
