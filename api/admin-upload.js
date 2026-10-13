const {randomUUID}=require('node:crypto');const auth=require('./_admin');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');if(!auth.requireAdmin(req,res))return;
 if(req.method!=='POST')return res.status(405).json({error:'지원하지 않는 요청입니다.'});
 try{
  const data=auth.body(req);const match=/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(data?.image||'');
  if(!match)return res.status(400).json({error:'JPG·PNG·WEBP 사진을 선택해주세요.'});
  const bytes=Buffer.from(match[2],'base64');if(bytes.length>2*1024*1024)return res.status(413).json({error:'사진은 2MB 이하로 올려주세요.'});
  const valid=match[1]==='jpeg'?bytes[0]===255&&bytes[1]===216:match[1]==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  if(!valid)return res.status(400).json({error:'사진 형식이 올바르지 않습니다.'});
  const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!base||!key)throw new Error();
  const name=randomUUID()+'.'+(match[1]==='jpeg'?'jpg':match[1]);const response=await fetch(base+'/storage/v1/object/academy-site-media/'+name,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'image/'+match[1]},body:bytes,signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error();return res.json({url:base+'/storage/v1/object/public/academy-site-media/'+name});
 }catch{return res.status(503).json({error:'사진을 저장하지 못했습니다. 저장소 연결을 확인해주세요.'});}
};
