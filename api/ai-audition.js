const crypto=require('node:crypto'),auth=require('./_admin'),store=require('./_cms-store');
const {consume,LIMITS}=require('./_audition-limit'),{queue}=require('./_audition-queue');
const {repository,catalog}=require('./_audition');
const {readImage}=require('../src/published-editor/image-model.cjs');
const {selection,castFor}=require('../src/audition/model.cjs');
const {dimensions,makeMask}=require('./_audition-mask');
const {scriptText}=require('../src/audition/catalog.cjs');
const {recommend}=require('./_audition-recommend');
const {scenePrompt}=require('./_audition-prompt');
function createHandler({repo=repository(),access=queue,demo=false,fetcher=(...a)=>fetch(...a),limit=consume,configured=()=>Boolean(process.env.OPENAI_API_KEY&&process.env.ADMIN_SESSION_SECRET&&store.ready())}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'지원하지 않는 요청입니다.'});}
 const ready=demo||configured();
 if(req.method==='GET'){try{if(ready&&!demo)access.session(req,res);const c=await repo.load();return res.json({ready,demo,scripts:catalog(c.records),limits:LIMITS,queue:{concurrency:access.concurrency()}});}catch{return res.status(503).json({error:'장면 목록을 불러오지 못했습니다. 잠시 후 다시 확인해주세요.'});}}
 if(!auth.sameOrigin(req)||!req.headers.origin)return res.status(403).json({error:'홈페이지에서 다시 시도해주세요.'});
 let data;try{data=auth.body(req);if(!data||Buffer.byteLength(JSON.stringify(data))>3000000)throw Error();}catch{return res.status(400).json({error:'요청 내용을 다시 확인해주세요.'});}
 if(!ready)return res.status(503).json({error:'이미지 생성 연결을 준비하고 있습니다. 대사지 보기는 이용할 수 있습니다.'});
 let lease,result,status=200,retryAfter;
 try{
  const visitor=demo?'demo':access.session(req,res);
  if(data.action==='cancel'){if(!demo)await access.cancel({visitor,ticket:data.ticket,permit:data.permit});return res.json({cancelled:true});}
  if(!(data.action==='recommend'&&['situation','random'].includes(data.mode))&&(data.consent!==true||data.sceneConsent!==true))return res.status(400).json({error:'사진 전송 동의를 확인해주세요.'});
  const scripts=catalog((await repo.load()).records);
  if(data.action==='recommend')return res.json(await recommend({data,scripts,visitor,req,limit,fetcher,demo}));
  const script=scripts.find(s=>s.id===data.scriptId);
  if(!script)return res.status(400).json({error:'목록에서 연습할 대사를 다시 선택해주세요.'});
  if(script.cardOnly)return res.status(400).json({error:'이 대본은 내 사진으로 기기에서 연습 카드를 만듭니다. AI 장면 생성은 사용하지 않습니다.'});
  const requestId=data.requestId||crypto.randomUUID();
  if(data.action==='prepare')return res.json(demo?{state:'ready',permit:'demo',ticket:'demo'}:await access.prepare({visitor,scriptId:script.id,requestId,ticket:data.ticket}));
  let portrait,scene,mask,faces,retained;
  try{scene=readImage(data.scene,900000);if(!scene)throw Error();
   const cast=castFor(script);if(!cast.length)throw Error();
   if(data.faces!==undefined){
    if(!Array.isArray(data.faces)||data.faces.length<1||data.faces.length>3||new Set(data.faces.map(f=>f.roleId)).size!==data.faces.length)throw Error();
    faces=data.faces.map(f=>{const role=cast.find(r=>r.id===f.roleId),image=readImage(f.portrait,430000);if(!role||!image||f.consent!==true)throw Error();return {roleId:role.id,target:role.target,image};});
   }else{
    // Support old open tabs, but rebuild the mask from the registered role on the server.
    portrait=readImage(data.portrait,900000);const oldMask=readImage(data.mask,200000),box=selection(data.box);
    const role=cast.find(r=>['x','y','w','h'].every(k=>Math.abs(r.target[k]-box[k])<.001));
    if(!portrait||!oldMask||oldMask.mime!=='image/png'||!role)throw Error();
    faces=[{roleId:role.id,target:role.target,image:portrait}];
   }
   retained=cast.filter(r=>!faces.some(f=>f.roleId===r.id));
   mask={mime:'image/png',bytes:makeMask(dimensions(scene),faces.map(f=>f.target),retained.map(r=>r.target))};
  }catch{return res.status(400).json({error:'사진과 역할별 전송 동의를 확인해주세요. 사진을 넣지 않은 역할은 원본 얼굴을 기준으로 생성합니다.'});}
  if(demo)return res.json({demo:true,image:data.scene,script,scriptText:scriptText(script)});
  let permit=data.permit;
  if(!permit){const prepared=await access.prepare({visitor,scriptId:script.id,requestId});if(prepared.state!=='ready'){await access.cancel({visitor,ticket:prepared.ticket});return res.status(503).json({code:'capacity_wait',retryAfter:3,error:'다른 이용자의 사진을 처리 중입니다. 잠시 후 같은 사진으로 다시 눌러주세요.'});}permit=prepared.permit;}
  lease=await access.start({visitor,scriptId:script.id,requestId,permit});
  const charge=await access.reserve(lease,limit,req);
  const form=new FormData();form.set('model',process.env.OPENAI_IMAGE_MODEL||'gpt-image-2');form.set('n','1');form.set('size','auto');form.set('quality','medium');form.set('output_format','jpeg');form.set('output_compression','82');
  form.append('image[]',new Blob([scene.bytes],{type:scene.mime}),'scene.'+scene.ext);
  for(const f of faces)form.append('image[]',new Blob([f.image.bytes],{type:f.image.mime}),'role-'+f.roleId+'.'+f.image.ext);
  form.set('mask',new Blob([mask.bytes],{type:'image/png'}),'scene-context-mask.png');
  form.set('prompt',scenePrompt(faces,retained));
  const response=await fetcher('https://api.openai.com/v1/images/edits',{method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY},body:form,signal:AbortSignal.timeout(105000),redirect:'error'});
  if(!response.ok){let code;try{code=(await response.json()).error?.code;}catch{}if(response.status===429)throw Object.assign(Error('사진 생성 서버가 혼잡합니다. 잠시 후 다시 시도해주세요.'),{status:503,code:'provider_busy',retryAfter:Math.max(3,Math.min(60,Number(response.headers?.get('Retry-After'))||5))});if(code==='content_policy_violation')throw Object.assign(Error('이 사진으로는 합성을 진행할 수 없습니다. 다른 사진을 선택해주세요.'),{status:422});throw Error('provider');}
  const b64=(await response.json()).data?.[0]?.b64_json;if(typeof b64!=='string'||b64.length>3500000||!readImage('data:image/jpeg;base64,'+b64,2500000))throw Error('image');
  await access.complete(charge);result={image:'data:image/jpeg;base64,'+b64,script,scriptText:scriptText(script)};
 }catch(error){status=error.status||503;retryAfter=error.retryAfter;result={error:error.status?error.message:(data.action==='recommend'?'추천을 불러오지 못했습니다. 아래에서 직접 작품을 선택하거나 잠시 후 다시 추천받아보세요.':'합성을 완료하지 못했습니다. 사진과 대사는 그대로 있으니 잠시 후 다시 시도해주세요.')};if(error.code)result.code=error.code;if(retryAfter)result.retryAfter=retryAfter;}
 finally{if(lease)await access.finish(lease);}
 if(retryAfter)res.setHeader('Retry-After',String(retryAfter));return res.status(status).json(result);
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
