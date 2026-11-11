const crypto=require('node:crypto'),auth=require('./_admin'),core=require('./_casting'),m=require('../src/casting/model.cjs');
function createHandler({repo=core.repository(),storage=core.bucket,limit=core.rateLimit,now=()=>Date.now()}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 try{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='GET'){
   const id=url.searchParams.get('id');
   if(id){if(!m.uuid(id))throw core.fail(404,'공고를 찾을 수 없습니다.');const c=await repo.call(id);if(!c||c.document.status==='draft')throw core.fail(404,'공고를 찾을 수 없습니다.');return res.json({call:c,phase:m.phase(c.document,now())});}
   return res.json({calls:(await repo.calls(false)).filter(c=>c.document.status!=='draft').map(c=>({...c,phase:m.phase(c.document,now())}))});
  }
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');throw core.fail(405,'지원하지 않는 요청입니다.');}
  if(!auth.sameOrigin(req))throw core.fail(403,'허용되지 않은 요청입니다.');
  const b=core.body(req);if(!m.uuid(b.callId))throw core.fail(400,'공고를 확인해주세요.');
  await limit(req);
  const c=await repo.call(b.callId);if(!c||c.document.status==='draft')throw core.fail(404,'공고를 찾을 수 없습니다.');
  if(m.phase(c.document,now())!=='접수 중')throw core.fail(410,'현재 접수 기간이 아닙니다.');
  if(b.revision!==c.revision)throw core.fail(409,'공고가 변경되었습니다. 작성 내용을 복사한 후 새로고침해주세요.');
  const error=m.validateApplication(b.answers,c.document,now());if(error)throw core.fail(400,error);
  if(b.action==='upload'){
   if(!m.validFile(b.file))throw core.fail(400,'프로필은 10MB 이하의 PDF·Word·PowerPoint·Excel 파일 1개를 선택해주세요.');
   const file={name:b.file.name,size:b.file.size,type:m.fileType(b.file),callId:c.id,path:c.id+'/'+crypto.randomUUID()+'.'+b.file.name.split('.').pop().toLowerCase(),expires:now()+2*3600000};
   const {data,error}=await storage().createSignedUploadUrl(file.path,{upsert:false});if(error||!data?.signedUrl)throw Error('upload_unavailable');
   return res.json({signedUrl:data.signedUrl,receipt:core.signReceipt(file),type:file.type});
  }
  if(b.action!=='submit')throw core.fail(400,'요청을 확인해주세요.');
  const file=core.receipt(b.receipt,c.id,now());const {data,error:infoError}=await storage().info(file.path);
  if(infoError||!data||Number(data.metadata?.size??data.size)!==file.size||(data.content_type||data.contentType||data.metadata?.mimetype)!==file.type)throw core.fail(400,'프로필 업로드를 확인하지 못했습니다. 다시 첨부해주세요.');
  const result=await repo.submit(c,m.cleanApplication(b.answers),{path:file.path,name:file.name,size:file.size,type:file.type});
  if(!result?.id)throw Error('not_saved');
  return res.status(201).json({id:result.id,editKey:core.editKey(result.id),message:'지원서가 접수되었습니다. 일정 및 결과는 담당자가 별도로 안내합니다.'});
 }catch(e){return res.status(e.status||503).json({error:e.status?e.message:'저장을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.'});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
