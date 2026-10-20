const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../dist-published');const demo=process.argv.includes('--demo');const seedFile=process.argv.find(arg=>arg.startsWith('--seed='))?.slice(7);const demoContent=demo?require('./demo-content.cjs').createDemo(seedFile?JSON.parse(fs.readFileSync(seedFile,'utf8')):undefined):null;
if(demo){process.env.ADMIN_PASSWORD='preview-only';process.env.ADMIN_SESSION_SECRET=crypto.randomBytes(32).toString('hex');}
const auth=require('../api/_admin');if(demo)Object.assign(auth,auth.createAuth(require('./local-admin-store.cjs').createStore()));const demoMembers=demo?require('./demo-members.cjs').createDemo():null;
const demoVideo=demo?require('./demo-video.cjs').createDemo():null;
const demoImages=demo?require('./demo-images.cjs').createDemo():null;
const handlers={'/api/admin-consultation':require('../api/admin-consultation').createHandler({roomStore:demo?require('./demo-consultation-rooms.cjs').createStore():undefined}),'/api/admin-inline-ai':require('../api/admin-inline-ai').createHandler({demo}),'/api/admin-video-upload':demo?demoVideo.config:require('../api/admin-video-upload'),'/api/admin-content-history':demo?demoContent.history:require('../api/admin-content-history'),'/api/admin-inquiries':demo?require('./demo-inquiries.cjs').createDemo():require('../api/admin-inquiries'),'/api/ai-assistant':require('../api/ai-assistant').createHandler({demo}),'/api/member-config':require('../api/member-config'),'/api/member-account':require('../api/member-account'),'/api/admin-members':require('../api/admin-members'),'/api/materials-config':require('../api/materials-config'),'/api/admin-auth':require('../api/admin-auth'),'/api/site-content':require('../api/site-content'),'/api/admin-upload':demo?demoImages.upload:require('../api/admin-upload')};
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');res.status=n=>{res.statusCode=n;return res;};res.json=v=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(v));return res;};
 if(demo&&url.pathname==='/api/admin-video-file')return await demoVideo.upload(req,res);
 if(demo&&demoImages.serve(req,res,url.pathname))return;
 if(demo&&demoVideo.serve(req,res,url.pathname))return;
 if(handlers[url.pathname]||(demo&&url.pathname==='/api/member-demo')){
  let data=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>3*1024*1024)return res.status(413).json({error:'요청이 너무 큽니다.'});data.push(chunk);}req.body=Buffer.concat(data).toString();
  if(demo&&url.pathname==='/api/member-config')return res.json({demo:true,ready:true,providers:['google','kakao'],policiesReady:false});
  if(demo&&url.pathname==='/api/member-demo')return demoMembers(req,res);
  if(demo&&url.pathname==='/api/admin-members'){if(!await auth.requireAdmin(req,res))return;if(req.method==='GET'){const q=url.searchParams.get('q')||'',offset=Math.max(0,Number(url.searchParams.get('offset'))||0);return res.json({members:demoMembers.list(q,offset),offset});}if(req.method!=='PATCH')return res.status(405).json({error:'지원하지 않는 요청입니다.'});const body=auth.body(req);if(!['active','inactive','withdrawal_requested'].includes(body.status))return res.status(400).json({error:'상태 오류'});const member=demoMembers.update(body.id,body.status);return member?res.json({member}):res.status(404).json({error:'회원을 찾을 수 없습니다.'});}
  if(demo&&url.pathname==='/api/site-content')return demoContent.content(req,res);
  return await handlers[url.pathname](req,res);
 }
 let name=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!name.startsWith(root+path.sep)&&name!==root)return res.status(403).end();
 if(name===root)name=path.join(root,'index.html');if(!path.extname(name))name+='.html';
 fs.readFile(name,(err,data)=>{if(err)return res.status(404).end('Not found');res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm'})[path.extname(name)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(data);});
 }catch{return res.status(400).json({error:'요청을 처리하지 못했습니다.'});}
}).listen(Number(process.env.KJT_PREVIEW_PORT)||4174,'127.0.0.1',()=>console.log('http://127.0.0.1:'+(Number(process.env.KJT_PREVIEW_PORT)||4174)+(demo?' — local demo, password: preview-only; memory only':'')));
