const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const {createHash}=require('node:crypto');
function buildEditorial(out){
 const root=path.resolve(__dirname,'..');
 for(const [name,entry]of [['editorial-admin','src/editorial/admin.js'],['editorial-home','src/editorial/home.js']])esbuild.buildSync({entryPoints:[path.join(root,entry)],outfile:path.join(out,name+'.js'),bundle:true,platform:'browser',target:'es2020',minify:true});
 fs.copyFileSync(path.join(root,'src/editorial/style.css'),path.join(out,'editorial.css'));
 const versioned=name=>'/'+name+'?v='+createHash('sha256').update(fs.readFileSync(path.join(out,name))).digest('hex').slice(0,12);
 fs.writeFileSync(path.join(out,'admin/editorial.html'),'<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>정보성 콘텐츠 발행 | 김정태 배우아카데미</title><link rel="stylesheet" href="/editorial.css"></head><body class="editorial-body"><header class="journal-nav"><a class="journal-brand" href="/">김정태 <span>배우아카데미</span></a><nav><a href="/?admin=1">홈페이지 편집</a><a href="/admin/ai">AI 작업실</a><a href="/journal" target="_blank" rel="noopener">공개 글 목록 ↗</a></nav></header><main id="editorial-admin" class="editorial-admin"></main><script defer src="/editorial-admin.js"></script></body></html>');
 const home=path.join(out,'index.html');let html=fs.readFileSync(home,'utf8');
 const section='<section id="journal-home" class="journal-home" hidden><div class="journal-home-heading"><div><p class="journal-label">ACTOR’S NOTE</p><h2>오디션을 준비하며<br>궁금했던 질문들.</h2></div><a href="/journal">연기 노트 전체 보기 ↗</a></div><div class="journal-grid"></div></section>';
 html=html.replace('<section id="closing"',section+'<section id="closing"').replace('</head>','<link rel="stylesheet" href="/editorial.css"></head>').replace('</body>','<script defer src="/editorial-home.js"></script></body>');
 // A durable public entry remains visible even before the first article is posted.
 html=html.replace('<a href="/notices">공지사항</a>','<a href="/journal">연기 노트</a><a href="/notices">공지사항</a>');
 html=html.replaceAll('href="/editorial.css"','href="'+versioned('editorial.css')+'"').replaceAll('src="/editorial-home.js"','src="'+versioned('editorial-home.js')+'"');
 fs.writeFileSync(home,html);
 const admin=path.join(out,'admin/editorial.html');
 fs.writeFileSync(admin,fs.readFileSync(admin,'utf8').replace('href="/editorial.css"','href="'+versioned('editorial.css')+'"').replace('src="/editorial-admin.js"','src="'+versioned('editorial-admin.js')+'"'));
 const robots=path.join(out,'robots.txt');let robotText=fs.readFileSync(robots,'utf8');if(!robotText.includes('/journal-sitemap.xml'))fs.writeFileSync(robots,robotText+'\nSitemap: https://www.kactstar.com/journal-sitemap.xml\n');
 const sitemap=path.join(out,'sitemap.xml');let xml=fs.readFileSync(sitemap,'utf8');if(!xml.includes('/journal</loc>'))xml=xml.replace('</urlset>','<url><loc>https://www.kactstar.com/journal</loc></url></urlset>');fs.writeFileSync(sitemap,xml);
}
module.exports={buildEditorial};
