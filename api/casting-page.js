const core=require('./_casting'),m=require('../src/casting/model.cjs'),p=require('../src/casting/public.cjs');
function createHandler({repo=core.repository()}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','HEAD'].includes(req.method))return res.status(405).end();
 const u=new URL(req.url,'http://localhost'),id=u.pathname.match(/^\/auditions\/([^/]+)$/)?.[1]||u.searchParams.get('id');
 const end=(status,body)=>res.status(status).end(req.method==='HEAD'?'':body);
 try{
  if(u.searchParams.get('sitemap')==='1'||u.pathname==='/auditions-sitemap.xml'){
   const calls=await repo.calls(false);res.setHeader('Content-Type','application/xml; charset=utf-8');return end(200,`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${p.ORIGIN}/auditions</loc></url>${calls.filter(c=>c.document.status==='published'&&m.phase(c.document)!=='접수 마감').map(c=>`<url><loc>${p.ORIGIN}${p.href(c)}</loc><lastmod>${p.e(c.updated_at||c.created_at)}</lastmod></url>`).join('')}</urlset>`);
  }
  res.setHeader('Content-Type','text/html; charset=utf-8');
  if(id){const c=m.uuid(id)?await repo.call(id):null;if(!c||c.document.status==='draft')return end(404,p.shell({title:'공고를 찾을 수 없습니다',description:'',index:false,body:'<h1>공개된 공고를 찾을 수 없습니다.</h1><a href="/auditions">공고 목록</a>'}));
   if(u.pathname==='/auditions'&&u.searchParams.has('id')){res.setHeader('Location',p.href(c));return end(301,'');}
   return end(200,p.shell({title:c.document.title,description:`${c.document.roles.join(', ')} 모집. ${c.document.location}. ${c.document.description}`.slice(0,280),path:p.href(c),body:p.detail(c),structured:p.structured(c),index:m.phase(c.document)!=='접수 마감'}));
  }
  const calls=(await repo.calls(false)).filter(c=>c.document.status!=='draft');return end(200,p.shell({title:'배우 공개 오디션 · 모집 배역과 지원 안내',description:'김정태 배우아카데미의 공개 오디션. 모집 배역, 접수 기간, 촬영 일정과 제출 자료를 확인하고 지원하세요.',body:`<div class="casting-hero"><p class="eyebrow">YOUR NEXT SCENE</p><h1>당신의 다음 장면을<br>기다립니다.</h1><p>모집 배역부터 지원까지, 한곳에서.</p></div><div class="audition-tiles">${calls.map(p.card).join('')}</div>${calls.length?'':'<p>현재 공개된 오디션이 없습니다.</p>'}`,structured:p.structured(null,calls)}));
 }catch{res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Retry-After','300');return end(503,p.shell({title:'공고를 불러오고 있습니다',description:'',index:false,body:'<h1>공고를 잠시 후 다시 확인해주세요.</h1>'}));}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;
