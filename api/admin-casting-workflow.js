const core=require('./_casting'),auth=require('./_admin'),m=require('../src/casting/model.cjs'),w=require('../src/casting/workflow.cjs');
function createHandler({demo=false,repo=core.repository(),requireAdmin=(...args)=>auth.requireAdmin(...args)}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','private, no-store');
 if(!await requireAdmin(req,res))return;
 try{
  const u=new URL(req.url,'http://localhost');let b={};if(req.method==='POST'){if(!auth.sameOrigin(req))throw core.fail(403,'허용되지 않은 요청입니다.');b=auth.body(req);if(!b||Buffer.byteLength(JSON.stringify(b))>1500000)throw core.fail(413,'시간표가 너무 큽니다.');}else if(req.method!=='GET')throw core.fail(405,'지원하지 않는 요청입니다.');
  const id=req.method==='GET'?u.searchParams.get('callId'):b.callId;if(!m.uuid(id))throw core.fail(400,'공고를 확인해주세요.');
  const {call,applications:rows,workflow}=await repo.snapshot(id);if(!call)throw core.fail(404,'공고를 찾을 수 없습니다.');const hash=w.rosterHash(rows),stale=Boolean(workflow&&(workflow.document.roster!==hash||workflow.document.callRevision!==call.revision));
  if(req.method==='GET')return res.json({demo,call,roster:hash,workflow,stale,report:w.report(call,rows),applications:rows.map(a=>({id:a.id,name:a.answers.name,dates:a.answers.dates,status:a.status})),template:w.DEFAULT_TEMPLATE});
  if(b.roster!==hash||b.callRevision!==call.revision)throw core.fail(409,'지원서나 공고가 변경되었습니다. 새로 불러와주세요.');
  if(b.action==='propose')return res.json({schedule:w.propose(call,rows,b.config)});
  if(b.action==='save'){
   const schedule=b.schedule,error=w.validateSchedule(call,rows,schedule);if(error)throw core.fail(400,error);if(typeof b.template!=='string'||b.template.length>4000||!b.template.trim())throw core.fail(400,'안내문을 1~4000자로 입력해주세요.');
   const document={roster:hash,callRevision:call.revision,schedule:{config:w.settings(schedule.config),assigned:schedule.assigned.map(s=>({id:s.id,date:s.date,time:s.time,room:s.room})),unassigned:schedule.unassigned.map(s=>({id:s.id,reason:s.reason})),confirmed:schedule.confirmed===true},template:b.template};
   return res.json({workflow:await repo.saveWorkflow(call,hash,Number.isInteger(b.revision)?b.revision:null,document)});
  }
  if(b.action==='messages'){if(stale)throw core.fail(409,'지원서가 변경되어 시간표를 다시 확인해야 합니다.');return res.json({messages:w.messages(call,rows,workflow?.document.schedule,workflow?.document.template)});}
  throw core.fail(400,'요청을 확인해주세요.');
 }catch(e){return res.status(e.status||400).json({error:e.status?e.message:(e.message.includes('시간')||e.message.includes('확인')?e.message:'요청을 처리하지 못했습니다. 다시 확인해주세요.')});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
