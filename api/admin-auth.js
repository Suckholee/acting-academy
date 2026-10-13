const auth=require('./_admin');
const store=require('./_cms-store');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method==='GET')return res.json({configured:auth.configured(),authenticated:auth.authenticated(req),storageReady:store.ready()});
 if(!auth.sameOrigin(req))return res.status(403).json({error:'허용되지 않은 요청입니다.'});
 if(req.method==='DELETE'){auth.clear(res);return res.json({success:true});}
 if(req.method!=='POST')return res.status(405).json({error:'지원하지 않는 요청입니다.'});
 if(!auth.configured())return res.status(503).json({error:'관리자 인증 설정이 필요합니다.'});
 try{const data=auth.body(req);if(typeof data?.password!=='string'||data.password.length>256||!auth.equal(data.password,process.env.ADMIN_PASSWORD))return res.status(401).json({error:'비밀번호가 올바르지 않습니다.'});auth.session(res);return res.json({success:true});}catch{return res.status(400).json({error:'입력 내용을 확인해주세요.'});}
};
