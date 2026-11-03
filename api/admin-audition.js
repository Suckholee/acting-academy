const auth=require('./_admin'),{repository}=require('./_audition');
const {entry}=require('../src/audition/model.cjs');
function createHandler({repo=repository(),authorize=(...a)=>auth.requireAdmin(...a)}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Robots-Tag','noindex, nofollow');
 if(!await authorize(req,res))return;
 if(!auth.sameOrigin(req))return res.status(403).json({error:'허용되지 않은 요청입니다.'});
 try{
  if(req.method==='GET')return res.json(await repo.load());
  if(req.method!=='PUT')return res.status(405).json({error:'지원하지 않는 요청입니다.'});
  let data,record;try{data=auth.body(req);if(Buffer.byteLength(JSON.stringify(data))>20000||!Number.isSafeInteger(data.revision)||data.revision<0)throw Error();record=entry(data.record);}catch{return res.status(400).json({error:'대본·출처·장면 사진의 얼굴 영역과 이용 범위를 확인해주세요.'});}
  const current=await repo.load();if(current.revision!==data.revision)return res.status(409).json({error:'다른 창에서 변경했습니다. 입력을 보관한 뒤 목록을 다시 불러와주세요.'});
  const records=current.records.filter(r=>r.id!==record.id);if(records.length>=40)return res.status(400).json({error:'대본은 최대 40개까지 등록할 수 있습니다.'});records.push(record);
  const saved=await repo.save(records,current.revision);if(!saved)return res.status(409).json({error:'다른 창에서 변경했습니다. 목록을 다시 확인해주세요.'});
  return res.json({records:saved.value.records,revision:saved.revision});
 }catch{return res.status(503).json({error:'대본을 저장하지 못했습니다. 입력 내용은 화면에 남아 있습니다.'});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
