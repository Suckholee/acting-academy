const auth=require('../api/_admin');
const {valid}=require('../api/site-content');
const copy=value=>JSON.parse(JSON.stringify(value));
function createDemo(initial={pages:{},revision:0}){
 if(!valid(initial.pages)||!Number.isSafeInteger(initial.revision)||initial.revision<0)throw Error('Invalid demo seed');
 let pages=copy(initial.pages),revision=initial.revision;
 const records=[{revision,value:copy(pages),created_at:new Date().toISOString(),action:'baseline',restored_from:null}];
 const conflict=res=>res.status(409).json({error:'다른 곳에서 변경되었습니다. 새로고침 후 다시 수정해주세요.'});
 const publish=(value,action,from=null)=>{pages=copy(value);revision++;records.unshift({revision,value:copy(value),created_at:new Date().toISOString(),action,restored_from:from});return revision;};
 return {
  async content(req,res){
   if(req.method==='GET')return res.json({ready:true,demo:true,pages:copy(pages),revision});
   if(!await auth.requireAdmin(req,res))return;
   if(req.method!=='PUT')return res.status(405).json({error:'지원하지 않는 요청입니다.'});
   const data=auth.body(req);if(!valid(data?.pages)||!Number.isSafeInteger(data.revision))return res.status(400).json({error:'입력 내용을 확인해주세요.'});
   if(data.revision!==revision)return conflict(res);
   publish(data.pages,'save');return res.json({revision});
  },
  async history(req,res){
   if(!await auth.requireAdmin(req,res))return;
   const url=new URL(req.url,'http://localhost');
   if(req.method==='GET'){
    const selected=url.searchParams.get('revision'),before=url.searchParams.get('before');
    for(const value of [selected,before])if(value!==null&&(!/^\d+$/.test(value)||!Number.isSafeInteger(Number(value))))return res.status(400).json({error:'이력 번호를 확인해주세요.'});
    if(selected!==null){const record=records.find(r=>r.revision===Number(selected));return record?res.json({record:copy(record),demo:true}):res.status(404).json({error:'저장 이력을 찾을 수 없습니다.'});}
    const result=records.filter(r=>before===null||r.revision<Number(before)).slice(0,50).map(({value,...metadata})=>metadata);return res.json({records:result,nextBefore:result.length===50?result.at(-1).revision:null,demo:true});
   }
   if(req.method!=='POST')return res.status(405).json({error:'지원하지 않는 요청입니다.'});
   const data=auth.body(req);if(!Number.isSafeInteger(data?.targetRevision)||data.targetRevision<0||!Number.isSafeInteger(data?.revision)||data.targetRevision===data.revision)return res.status(400).json({error:'복원할 이전 시점을 선택해주세요.'});
   if(data.revision!==revision)return conflict(res);
   const target=records.find(r=>r.revision===data.targetRevision);if(!target)return res.status(404).json({error:'저장 이력을 찾을 수 없습니다.'});
   publish(target.value,'restore',target.revision);return res.json({revision,pages:copy(pages),restoredFrom:target.revision});
  }
 };
}
module.exports={createDemo};
