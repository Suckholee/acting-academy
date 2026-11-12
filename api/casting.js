const {requireCastingMember}=require('./_casting-member');
const access=require('./_casting-access');
const crypto=require('node:crypto'),auth=require('./_admin'),core=require('./_casting'),m=require('../src/casting/model.cjs');
function createHandler({repo=core.repository(),storage=core.bucket,limit=core.rateLimit,now=()=>Date.now(),requireMember=requireCastingMember}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 try{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='GET'){
   const id=url.searchParams.get('id');
   if(id){if(!m.uuid(id))throw core.fail(404,'공고를 찾을 수 없습니다.');const c=await repo.call(id);if(!c||c.document.status==='draft')throw core.fail(404,'공고를 찾을 수 없습니다.');return res.json({call:access.publicCall(req,c,now()),phase:access.allowed(req,c,now())?m.phase(c.document,now()):null});}
   return res.json({calls:(await repo.calls(false)).filter(c=>c.document.status!=='draft').map(c=>({...access.publicCall(req,c,now()),phase:access.allowed(req,c,now())?m.phase(c.document,now()):null}))});
  }
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');throw core.fail(405,'지원하지 않는 요청입니다.');}
  if(!auth.sameOrigin(req))throw core.fail(403,'허용되지 않은 요청입니다.');
  const b=core.body(req);if(!m.uuid(b.callId))throw core.fail(400,'공고를 확인해주세요.');
  // Only an already-issued, signed document receipt gets its own retry budget.
  // New document uploads and invite attempts retain the original IP protection.
  let flow;const flowToken=b.action==='submit'?b.receipt:b.action==='uploadPhoto'?b.flowReceipt:null;
  if(flowToken){try{const f=core.receipt(flowToken,b.callId,now());if((f.kind||'document')==='document')flow=f.path;}catch{/* Invalid receipts remain IP limited and fail normal verification below. */}}
  await limit(req,flow?{flow}:undefined);
  const c=await repo.call(b.callId);if(!c||c.document.status==='draft')throw core.fail(404,'공고를 찾을 수 없습니다.');
  if(b.action==='verifyInvite'){if(!access.privateCall(c)||!access.verify(b.code,c))throw core.fail(403,'초대 코드를 확인해주세요.');res.setHeader('Set-Cookie',access.cookie(req,c,now()));return res.json({verified:true});}
  if(!access.allowed(req,c,now()))throw core.fail(403,'초대 코드를 확인한 뒤 지원해주세요.');
  const applicant=await requireMember(req);
  if(m.phase(c.document,now())!=='접수 중')throw core.fail(410,'현재 접수 기간이 아닙니다.');
  if(b.revision!==c.revision)throw core.fail(409,'공고가 변경되었습니다. 작성 내용을 복사한 후 새로고침해주세요.');
  const error=m.validateApplication(b.answers,c.document,now());if(error)throw core.fail(400,error);
  if(b.action==='upload'||b.action==='uploadPhoto'){
   const photo=b.action==='uploadPhoto';
   if(!(photo?m.validPhoto(b.file):m.validFile(b.file)))throw core.fail(400,'프로필은 10MB 이하의 PDF·Word·PowerPoint·Excel 파일 1개를 선택해주세요.');
   const file={memberId:applicant.id,kind:photo?'photo':'document',name:b.file.name,size:b.file.size,type:photo?b.file.type:m.fileType(b.file),callId:c.id,path:c.id+'/'+crypto.randomUUID()+'.'+b.file.name.split('.').pop().toLowerCase(),expires:now()+2*3600000};
   const {data,error}=await storage().createSignedUploadUrl(file.path,{upsert:false});if(error||!data?.signedUrl)throw Error('upload_unavailable');
   return res.json({signedUrl:data.signedUrl,receipt:core.signReceipt(file),type:file.type});
  }
  if(b.action!=='submit')throw core.fail(400,'요청을 확인해주세요.');
  for(const receipt of [b.receipt,...(Array.isArray(b.photos)?b.photos.map(p=>p.receipt):[])]){if(core.receipt(receipt,c.id,now()).memberId!==applicant.id)throw core.fail(403,'본인 계정에서 첨부한 자료로 지원해주세요.');}
  const file=await core.verifiedFile(b.receipt,c.id,storage,'document',now()),photos=await core.verifiedPhotos(b.photos,c.id,storage,now());
  const result=await repo.submit(c,m.cleanApplication(b.answers),{...file,memberId:applicant.id,...(photos.length?{photos}:{})});
  if(!result?.id)throw Error('not_saved');
  return res.status(201).json({id:result.id,editKey:core.editKey(result.id),message:'지원서가 접수되었습니다. 일정 및 결과는 담당자가 별도로 안내합니다.'});
 }catch(e){if(e.retryAfter)res.setHeader('Retry-After',String(e.retryAfter));return res.status(e.status||503).json({error:e.status?e.message:'저장을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.'});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
