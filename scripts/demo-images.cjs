const {randomUUID}=require('node:crypto');const auth=require('../api/_admin');const {readImage}=require('../src/published-editor/image-model.cjs');
function createDemo(){const files=new Map();let total=0;return {
 async upload(req,res){res.setHeader('Cache-Control','no-store');if(!await auth.requireAdmin(req,res))return;if(req.method!=='POST')return res.status(405).json({error:'지원하지 않는 요청입니다.'});const image=readImage(auth.body(req)?.image);if(!image)return res.status(400).json({error:'2MB 이하 JPG·PNG·WEBP 사진을 선택해주세요.'});if(total+image.bytes.length>30*1024*1024)return res.status(413).json({error:'시연용 사진 공간이 찼습니다.'});const url='/assets/demo-photo-'+randomUUID()+'.'+image.ext;files.set(url,image);total+=image.bytes.length;return res.json({url,demo:true});},
 serve(req,res,path){const image=files.get(path);if(!image)return false;res.setHeader('Content-Type',image.mime);res.setHeader('Content-Length',String(image.bytes.length));res.setHeader('Cache-Control','no-store');res.end(image.bytes);return true;}
};}
module.exports={createDemo};
