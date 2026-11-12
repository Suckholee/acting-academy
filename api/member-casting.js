const store=require('./_cms-store'),auth=require('./_admin'),core=require('./_casting'),m=require('../src/casting/model.cjs');
const {requireCastingMember}=require('./_casting-member');
function createHandler({database=store,requireMember=requireCastingMember,limit=core.rateLimit,now=()=>Date.now()}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
 try{
  if(!['GET','POST'].includes(req.method))throw core.fail(405,'지원하지 않는 요청입니다.');
  if(req.method==='POST'&&!auth.sameOrigin(req))throw core.fail(403,'허용되지 않은 요청입니다.');
  const user=await requireMember(req);if(!m.uuid(user.id))throw core.fail(401,'다시 로그인해주세요.');
  const repo=core.repository(database);
  if(req.method==='POST'){
   await limit(req);const body=core.body(req);
   if(body.action!=='link'||!core.canEdit(body.id,body.key))throw core.fail(403,'접수 완료 때 받은 수정 전용 링크를 확인해주세요.');
   const application=await repo.application(body.id);
   if(!application||Date.parse(application.expires_at)<=now())throw core.fail(404,'지원서를 찾을 수 없습니다.');
   if(application.profile.memberId&&application.profile.memberId!==user.id)throw core.fail(403,'다른 회원에게 연결된 지원서입니다.');
   if(!application.profile.memberId){
    const rows=await database.request('/rest/v1/academy_casting_applications?id=eq.'+application.id+'&revision=eq.'+application.revision+'&profile->>memberId=is.null',{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({profile:{...application.profile,memberId:user.id},revision:application.revision+1})});
    if(!rows?.[0])throw core.fail(409,'지원서가 변경되었습니다. 다시 시도해주세요.');
   }
   return res.json({linked:true});
  }
  const url=new URL(req.url,'http://localhost'),offset=Number(url.searchParams.get('offset')||0);
  if(!Number.isInteger(offset)||offset<0||offset>10000)throw core.fail(400,'목록 위치를 확인해주세요.');
  const rows=await database.request('/rest/v1/academy_casting_applications?profile->>memberId=eq.'+user.id+'&expires_at=gt.'+encodeURIComponent(new Date(now()).toISOString())+'&select=id,call_id,created_at,answers,profile,expires_at,consent_notice&order=created_at.desc,id.desc&limit=21&offset='+offset);
  const owned=rows.filter(a=>a.profile?.memberId===user.id&&m.uuid(a.id)&&m.uuid(a.call_id)&&Date.parse(a.expires_at)>now()).slice(0,20);
  const ids=[...new Set(owned.map(a=>a.call_id))];
  const calls=ids.length?await database.request('/rest/v1/academy_casting_calls?id=in.('+ids.join(',')+')&select=id,document'):[];
  const applications=owned.map(a=>{
   const c=calls.find(c=>c.id===a.call_id),d=c?.document,available=d&&d.status!=='draft';
   return {id:a.id,callId:a.call_id,title:a.consent_notice?.title||d?.title||'오디션 공고',submittedAt:a.created_at,roles:a.answers.roles||[],dates:a.answers.dates||[],profileName:a.profile.name||'',status:'접수 완료',closesAt:d?.closesAt||null,canEdit:Boolean(available&&m.phase(d,now())==='접수 중'),viewUrl:available?'/audition-edit#'+new URLSearchParams({id:a.id,key:core.editKey(a.id)}):null,callUrl:available?'/auditions/'+a.call_id:null};
  });
  return res.json({applications,nextOffset:rows.length>20?offset+20:null});
 }catch(e){return res.status(e.status||503).json({error:e.status?e.message:'신청 내역을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
