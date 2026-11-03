const {repository}=require('./_editorial');
const {UUID,escape:e}=require('../src/editorial/model.cjs');
const {shell,photo,articleDocument}=require('../src/editorial/article.cjs');
const ORIGIN='https://www.kactstar.com';

function item(row){return {id:row.id,...row.published,publishedAt:row.published_at};}

function listing(article){return `<article class="journal-list-card"><a href="/journal/${article.id}">${photo(article.cards?.[0],'journal-list-image')}<span class="journal-label">ACTOR'S NOTE</span><h2>${e(article.title)}</h2><p>${e(article.summary)}</p><span class="journal-card-bottom">${e(article.author)} <b aria-hidden="true">↗</b></span></a></article>`;}

function createHandler({repo=repository()}={}){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','HEAD'].includes(req.method))return res.status(405).end('Method not allowed');
 const url=new URL(req.url,'http://localhost'),id=url.pathname.match(/^\/journal\/([^/]+)$/)?.[1]||url.searchParams.get('id');
 try{
  if(url.searchParams.get('sitemap')==='1'){
   const items=[];for(let offset=0;offset<10000;offset+=500){const rows=await repo.list(false,offset,500);for(const row of rows)items.push(`<url><loc>${ORIGIN}/journal/${e(row.id)}</loc><lastmod>${e(row.published.modifiedAt||row.published_at)}</lastmod></url>`);if(rows.length<500)break;}
   res.setHeader('Content-Type','application/xml; charset=utf-8');return res.end(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items.join('')}</urlset>`);
  }
  if(id&&!UUID.test(id)){res.setHeader('Content-Type','text/html; charset=utf-8');return res.status(404).end(shell('글을 찾을 수 없습니다.','', '<h1>공개된 글을 찾을 수 없습니다.</h1><a href="/journal">연기 노트 목록으로</a>','/journal',404));}
  if(id){
   const row=await repo.get(id);res.setHeader('Content-Type','text/html; charset=utf-8');
   if(!row)return res.status(404).end(shell('글을 찾을 수 없습니다.','', '<h1>공개된 글을 찾을 수 없습니다.</h1><a href="/journal">연기 노트 목록으로</a>','/journal',404));
   return res.end(articleDocument(item(row)));
  }
  const offset=Number(url.searchParams.get('offset')||0),limit=url.searchParams.get('format')==='json'?3:20;
  if(!Number.isInteger(offset)||offset<0||offset>10000)return res.status(400).end('Invalid offset');
  const rows=await repo.list(false,offset,limit+1),articles=rows.slice(0,limit).map(item).sort((a,b)=>Number(/시니어/.test(a.title))-Number(/시니어/.test(b.title)));
  if(url.searchParams.get('format')==='json')return res.json({articles});
  res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(shell('연기 노트','연기·촬영·오디션을 준비하는 사람들을 위한 김정태 배우아카데미의 연기 노트.',`<section class="journal-intro"><p class="journal-label">ACTOR'S NOTE</p><h1>오디션을 준비하며<br>궁금했던 질문들.</h1><p>첫 지원부터 자유연기, 셀프테이프까지. 준비하며 마주치는 고민에 하나씩 답합니다.</p></section><div class="journal-grid">${articles.map(listing).join('')}</div>${articles.length?'':'<p class="journal-empty">첫 번째 연기 노트를 준비하고 있습니다.</p>'}<nav class="journal-pagination" aria-label="글 목록 페이지">${offset?`<a href="/journal?offset=${Math.max(0,offset-limit)}">← 이전 글</a>`:''}${rows.length>limit?`<a href="/journal?offset=${offset+limit}">다음 글 →</a>`:''}</nav>`));
 }catch{res.setHeader('Content-Type','text/html; charset=utf-8');return res.status(503).end(shell('잠시 후 다시 확인해주세요.','','<h1>글을 불러오지 못했습니다.</h1><p>잠시 후 다시 확인해주세요.</p><a href="/">홈페이지로</a>','/journal',503));}
};}
module.exports=createHandler();module.exports.createHandler=createHandler;module.exports.shell=shell;
