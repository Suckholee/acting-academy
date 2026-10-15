const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../dist-published');const demo=process.argv.includes('--demo');let content={},revision=0;
if(demo){process.env.ADMIN_PASSWORD='preview-only';process.env.ADMIN_SESSION_SECRET=crypto.randomBytes(32).toString('hex');}
const auth=require('../api/_admin');if(demo)Object.assign(auth,auth.createAuth(require('./local-admin-store.cjs').createStore()));const demoMembers=demo?require('./demo-members.cjs').createDemo():null;
const handlers={'/api/member-config':require('../api/member-config'),'/api/member-account':require('../api/member-account'),'/api/admin-members':require('../api/admin-members'),'/api/materials-config':require('../api/materials-config'),'/api/admin-auth':require('../api/admin-auth'),'/api/site-content':require('../api/site-content'),'/api/admin-upload':require('../api/admin-upload')};
http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');res.status=n=>{res.statusCode=n;return res;};res.json=v=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(v));return res;};
 if(handlers[url.pathname]||(demo&&url.pathname==='/api/member-demo')){
  let data=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>3*1024*1024)return res.status(413).json({error:'요청이 너무 큽니다.'});data.push(chunk);}req.body=Buffer.concat(data).toString();
  if(demo&&url.pathname==='/api/member-config')return res.json({demo:true,ready:true,providers:['google','kakao'],policiesReady:false});
  if(demo&&url.pathname==='/api/member-demo')return demoMembers(req,res);
  if(demo&&url.pathname==='/api/admin-members'){if(!await auth.requireAdmin(req,res))return;if(req.method==='GET'){const q=url.searchParams.get('q')||'',offset=Math.max(0,Number(url.searchParams.get('offset'))||0);return res.json({members:demoMembers.list(q,offset),offset});}if(req.method!=='PATCH')return res.status(405).json({error:'지원하지 않는 요청입니다.'});const body=auth.body(req);if(!['active','inactive','withdrawal_requested'].includes(body.status))return res.status(400).json({error:'상태 오류'});const member=demoMembers.update(body.id,body.status);return member?res.json({member}):res.status(404).json({error:'회원을 찾을 수 없습니다.'});}
  if(demo&&url.pathname==='/api/site-content'){
   if(req.method==='GET')return res.json({ready:true,pages:content,revision});
   if(!await auth.requireAdmin(req,res))return;
   if(req.method!=='PUT')return res.status(405).json({error:'지원하지 않는 요청입니다.'});
   const body=auth.body(req);if(!handlers[url.pathname].valid(body.pages))return res.status(400).json({error:'입력 오류'});
   if(body.revision!==revision)return res.status(409).json({error:'다른 곳에서 변경되었습니다. 새로고침 후 다시 수정해주세요.'});content=body.pages;revision++;return res.json({revision});
  }
  return await handlers[url.pathname](req,res);
 }
 let name=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!name.startsWith(root+path.sep)&&name!==root)return res.status(403).end();
 if(name===root)name=path.join(root,'index.html');if(!path.extname(name))name+='.html';
 fs.readFile(name,(err,data)=>{if(err)return res.status(404).end('Not found');res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4'})[path.extname(name)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(data);});
 }catch{return res.status(400).json({error:'요청을 처리하지 못했습니다.'});}
}).listen(4174,'127.0.0.1',()=>console.log('http://127.0.0.1:4174'+(demo?' — local demo, password: preview-only; memory only':'')));
