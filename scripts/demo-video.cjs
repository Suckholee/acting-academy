const {randomUUID}=require('node:crypto');const auth=require('../api/_admin');const {MAX_VIDEO_BYTES}=require('../src/published-editor/video-model.cjs');
function createDemo(){
 const videos=new Map();let total=0;
 return {
  async config(req,res){res.setHeader('Cache-Control','no-store');if(!await auth.requireAdmin(req,res))return;if(req.method!=='GET')return res.status(405).json({error:'지원하지 않는 요청입니다.'});return res.json({demo:true,ready:true});},
  async upload(req,res){
   res.setHeader('Cache-Control','no-store');if(!await auth.requireAdmin(req,res))return;
   if(req.method!=='POST')return res.status(405).json({error:'지원하지 않는 요청입니다.'});
   const type=req.headers['content-type'];if(!['video/mp4','video/webm'].includes(type))return res.status(400).json({error:'MP4·WEBM 영상을 선택해주세요.'});
   if(Number(req.headers['content-length'])>MAX_VIDEO_BYTES)return res.status(413).json({error:'영상은 100MB 이하로 올려주세요.'});
   let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>MAX_VIDEO_BYTES)return res.status(413).json({error:'영상은 100MB 이하로 올려주세요.'});chunks.push(chunk);}
   const bytes=Buffer.concat(chunks);const valid=type==='video/mp4'?bytes.toString('ascii',4,8)==='ftyp':bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
   if(!valid)return res.status(400).json({error:'재생 가능한 MP4·WEBM 파일인지 확인해주세요.'});
   if(total+size>3*MAX_VIDEO_BYTES)return res.status(413).json({error:'시연용 영상 공간이 찼습니다. 외부 영상 링크를 이용해주세요.'});
   const url='/assets/demo-video-'+randomUUID()+'.'+(type==='video/mp4'?'mp4':'webm');videos.set(url,{bytes,type});total+=size;return res.json({url,demo:true});
  },
  serve(req,res,path){const file=videos.get(path);if(!file)return false;res.setHeader('Content-Type',file.type);res.setHeader('Accept-Ranges','bytes');res.setHeader('Cache-Control','no-store');
   const range=req.headers.range;if(range){const match=/^bytes=(\d+)-(\d*)$/.exec(range);const start=Number(match?.[1]),end=Math.min(match?.[2]?Number(match[2]):file.bytes.length-1,file.bytes.length-1);if(!match||start>end||start>=file.bytes.length){res.statusCode=416;res.setHeader('Content-Range','bytes */'+file.bytes.length);res.end();return true;}res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${file.bytes.length}`);res.setHeader('Content-Length',String(end-start+1));res.end(file.bytes.subarray(start,end+1));return true;}
   res.setHeader('Content-Length',String(file.bytes.length));res.end(file.bytes);return true;
  }
 };
}
module.exports={createDemo};
