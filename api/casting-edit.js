const access=require('./_casting-access');
const core=require('./_casting'),auth=require('./_admin'),m=require('../src/casting/model.cjs');
const safe=a=>({id:a.id,call_id:a.call_id,answers:a.answers,profile:{memberLinked:!!a.profile.memberId,submittedAs:a.profile.submittedAs,name:a.profile.name,size:a.profile.size,type:a.profile.type,photos:(a.profile.photos||[]).map(p=>({slot:p.slot,name:p.name}))},revision:a.revision});
function createHandler({repo=core.repository(),storage=core.bucket,limit=core.rateLimit}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('Referrer-Policy','no-referrer');
 try{
  if(req.method!=='POST')throw core.fail(405,'지원하지 않는 요청입니다.');if(!auth.sameOrigin(req))throw core.fail(403,'허용되지 않은 요청입니다.');await limit(req);const b=core.body(req);
  if(!core.canEdit(b.id,b.key))throw core.fail(403,'수정 링크를 확인해주세요.');const a=await repo.application(b.id);if(!a||Date.parse(a.expires_at)<=Date.now())throw core.fail(404,'지원서를 찾을 수 없습니다.');const c=await repo.call(a.call_id);
  if(!c||c.document.status==='draft')throw core.fail(404,'공고를 찾을 수 없습니다.');
  if(b.action==='load'){if(access.privateCall(c))res.setHeader('Set-Cookie',access.cookie(req,c));return res.json({application:safe(a),call:access.clean(c)});}
  if(b.action!=='save')throw core.fail(400,'요청을 확인해주세요.');if(m.phase(c.document)!=='접수 중')throw core.fail(410,'접수가 마감되어 수정할 수 없습니다.');
  if(b.revision!==a.revision||b.callRevision!==c.revision)throw core.fail(409,'지원서 또는 공고가 변경되었습니다. 다시 불러와주세요.');const error=m.validateApplication(b.answers,c.document);if(error)throw core.fail(400,error);
  let profile={...a.profile};if(b.receipt){if(a.profile.memberId&&core.receipt(b.receipt,c.id).memberId!==a.profile.memberId)throw core.fail(403,'지원한 회원 계정에서 파일을 첨부해주세요.');profile={...await core.verifiedFile(b.receipt,c.id,storage),...(a.profile.submittedAs?{submittedAs:a.profile.submittedAs}:{}),...(a.profile.memberId?{memberId:a.profile.memberId}:{}),photos:a.profile.photos||[]};}
  if(b.photos!==undefined){if(a.profile.memberId&&Array.isArray(b.photos))for(const photo of b.photos)if(core.receipt(photo.receipt,c.id).memberId!==a.profile.memberId)throw core.fail(403,'지원한 회원 계정에서 사진을 첨부해주세요.');const photos=await core.verifiedPhotos(b.photos,c.id,storage),keep=b.keepPhotos||[];if(!Array.isArray(keep)||keep.some(slot=>!m.PHOTO_SLOTS.includes(slot)))throw core.fail(400,'사진 선택을 확인해주세요.');profile.photos=[...(a.profile.photos||[]).filter(p=>keep.includes(p.slot)&&!photos.some(v=>v.slot===p.slot)),...photos];}
  const saved=await repo.editApplication(a.id,a.revision,c.revision,m.cleanApplication(b.answers),profile);
  // Replaced uploads are reclaimed by the orphan-file maintenance task.
  return res.json({application:safe(saved),message:'지원서를 수정했습니다.'});
 }catch(e){return res.status(e.status||503).json({error:e.status?e.message:'지원서를 불러오거나 저장하지 못했습니다. 잠시 후 다시 시도해주세요.'});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
