const {randomUUID}=require('node:crypto');const auth=require('./_admin');const {validVideoFile}=require('../src/published-editor/video-model.cjs');
function createHandler({client}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');if(!await auth.requireAdmin(req,res))return;
 if(req.method==='GET')return res.json({demo:false,ready:Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY)});
 if(req.method!=='POST')return res.status(405).json({error:'지원하지 않는 요청입니다.'});
 let file;try{file=auth.body(req);}catch{return res.status(400).json({error:'영상 정보를 확인해주세요.'});}
 if(!validVideoFile(file))return res.status(400).json({error:'100MB 이하의 MP4·WEBM 영상 파일을 선택해주세요.'});
 try{
  const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!client&&(!base||!key))throw Error('not_configured');
  const storage=client||require('@supabase/supabase-js').createClient(base,key,{auth:{persistSession:false,autoRefreshToken:false}}).storage;
  const path=randomUUID()+'.'+(file.type==='video/mp4'?'mp4':'webm');const bucket=storage.from('academy-site-videos');
  const {data,error}=await bucket.createSignedUploadUrl(path,{upsert:false});if(error||!data?.signedUrl)throw Error('sign_failed');
  return res.json({signedUrl:data.signedUrl,url:bucket.getPublicUrl(path).data.publicUrl});
 }catch{return res.status(503).json({error:'영상 저장소를 연결하지 못했습니다. 저장소 설정을 확인하거나 영상 링크를 입력해주세요.'});}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
