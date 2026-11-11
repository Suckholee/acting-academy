const crypto=require('node:crypto'),auth=require('./_admin'),core=require('./_casting'),m=require('../src/casting/model.cjs');
function createHandler({demo=false,repo=core.repository(),storage=core.bucket,requireAdmin=(...args)=>auth.requireAdmin(...args)}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 if(!await requireAdmin(req,res))return;
 try{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='GET'){
   const callId=url.searchParams.get('callId');
   if(callId){
    if(!m.uuid(callId))throw core.fail(400,'공고를 확인해주세요.');
    if(url.searchParams.get('view')==='roles'){const [call,counts]=await Promise.all([repo.call(callId),repo.counts(callId)]);if(!call)throw core.fail(404,'공고를 찾을 수 없습니다.');return res.json({call,counts:counts[callId],demo});}
    const offset=Number(url.searchParams.get('offset')||0),role=url.searchParams.get('role')||'',status=url.searchParams.get('status')||'',query=(url.searchParams.get('q')||'').trim(),consultation=url.searchParams.get('consultation')||'';
    if(!['','agreed','declined'].includes(consultation)||!Number.isInteger(offset)||offset<0||offset>100000||role.length>100||query.length>100||(status&&!m.STATUSES.includes(status)))throw core.fail(400,'검색 조건을 확인해주세요.');
    return res.json(await repo.searchApplications(callId,{offset,role,status,query,consultation}));
   }
   const [calls,counts]=await Promise.all([repo.calls(true),repo.counts()]);return res.json({calls,counts,demo});
  }
  if(!['POST','PATCH','DELETE'].includes(req.method)){res.setHeader('Allow','GET, POST, PATCH, DELETE');throw core.fail(405,'지원하지 않는 요청입니다.');}
  if(!auth.sameOrigin(req))throw core.fail(403,'허용되지 않은 요청입니다.');
  const b=core.body(req);
  if(b.action==='saveCall'&&req.method==='POST'){
   const error=m.validateCampaign(b.document);if(error)throw core.fail(400,error);
   if(b.id&&(!m.uuid(b.id)||!Number.isInteger(b.revision)||b.revision<0))throw core.fail(400,'공고 수정 정보를 확인해주세요.');
   return res.json({call:await repo.saveCall(b.id||crypto.randomUUID(),m.cleanCampaign(b.document),b.id?b.revision:null)});
  }
  if(!m.uuid(b.id))throw core.fail(400,'지원서를 확인해주세요.');
  if(b.action==='review'&&req.method==='PATCH'){
   if(!m.STATUSES.includes(b.status)||typeof b.note!=='string'||b.note.length>4000||!Number.isInteger(b.revision)||b.revision<0)throw core.fail(400,'심사 상태와 메모를 확인해주세요.');
   return res.json({application:await repo.updateApplication(b.id,b.revision,b.status,b.note)});
  }
  const a=await repo.application(b.id);if(!a)throw core.fail(404,'지원서를 찾을 수 없습니다.');
  if(b.action==='profile'&&req.method==='POST'){
   const {data,error}=await storage().createSignedUrl(a.profile.path,60,{download:a.profile.name});if(error||!data?.signedUrl)throw Error('file_unavailable');return res.json({url:data.signedUrl});
  }
  if(b.action==='delete'&&req.method==='DELETE'){
   const {error}=await storage().remove([a.profile.path]);if(error)throw Error('delete_failed');await repo.removeApplication(a.id);return res.json({id:a.id});
  }
  throw core.fail(400,'요청을 확인해주세요.');
 }catch(e){return res.status(e.status||503).json({error:e.status?e.message:'저장소에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.'});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
