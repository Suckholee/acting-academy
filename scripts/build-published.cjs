const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'..'),source=path.join(root,'published-source'),out=path.join(root,'dist-published');
require('./build-confirmed-courses.cjs');
require('./build-class-finder.cjs');
require('./build-leadership.cjs');
if(!fs.existsSync(path.join(source,'index.html')))throw Error('published-source snapshot is missing');
fs.rmSync(out,{recursive:true,force:true});fs.cpSync(source,out,{recursive:true});
esbuild.buildSync({entryPoints:[path.join(root,'src/materials/app.js')],outfile:path.join(out,'materials-app.js'),bundle:true,format:'esm',minify:true});
fs.copyFileSync(path.join(root,'src/published-editor/editor.css'),path.join(out,'component-editor.css'));
const curricula={};
for(const id of require('../content/courses.json').map(course=>course.id)){const html=fs.readFileSync(path.join(source,'courses',id+'.html'),'utf8');const section=html.match(/class="section curriculum(?: class-values)?"[^>]*>([\s\S]*?)<\/section>/)?.[1]||'';curricula[id]=[...section.matchAll(/<article>[\s\S]*?<h3>([\s\S]*?)<\/h3>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<\/article>/g)].map(m=>({title:m[1].replace(/<[^>]+>/g,''),description:m[2].replace(/<[^>]+>/g,'')}));}
const registry=require('./build-editor-registry.cjs').buildRegistry(source,curricula);fs.writeFileSync(path.join(root,'content/editor-registry.json'),JSON.stringify(registry));
esbuild.buildSync({define:{__KJT_COURRICULUM__:JSON.stringify(curricula)},entryPoints:[path.join(root,'src/published-editor/editor.js')],outfile:path.join(out,'component-editor.js'),bundle:true,platform:'browser',target:'es2020',minify:true});
esbuild.buildSync({entryPoints:[path.join(root,'src/members/app.js')],outfile:path.join(out,'members.js'),bundle:true,platform:'browser',target:'es2020',minify:true});
fs.copyFileSync(path.join(root,'src/members/members.css'),path.join(out,'members.css'));
esbuild.buildSync({entryPoints:[path.join(root,'src/ai/assistant.js')],outfile:path.join(out,'ai-assistant.js'),bundle:true,platform:'browser',target:'es2020',minify:true});
fs.copyFileSync(path.join(root,'src/ai/assistant.css'),path.join(out,'ai-assistant.css'));
fs.mkdirSync(path.join(out,'admin'),{recursive:true});
fs.writeFileSync(path.join(out,'admin.html'),'<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta http-equiv="refresh" content="0;url=/?admin=1"><title>홈페이지 관리</title></head><body><a href="/?admin=1">홈페이지 인라인 관리 열기</a></body></html>');
fs.writeFileSync(path.join(out,'admin/ai.html'),'<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>AI 작업실 | 김정태 배우아카데미</title><link rel="stylesheet" href="/ai-assistant.css"></head><body class="ai-page"><header class="ai-page-nav"><a href="/">김정태 배우아카데미</a><nav aria-label="관리 메뉴"><a href="/?admin=1">홈페이지 편집</a><a href="/admin/members">회원 관리</a></nav></header><main id="ai-workspace"></main><footer>김정태 배우아카데미 · 관리자 AI 작업실</footer><script defer src="/ai-assistant.js"></script></body></html>');
fs.cpSync(path.join(root,'src/members/assets'),path.join(out,'assets/auth'),{recursive:true});
for(const [route,page,title]of [['login','login','로그인'],['signup','signup','회원가입'],['account','account','내 계정'],['reset-password','reset','비밀번호 재설정'],['admin/members','admin','회원 관리']]){
 const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${title} | 김정태 배우아카데미</title><link rel="stylesheet" href="/members.css"></head><body><header class="member-header"><a class="member-brand" href="/">김정태 배우아카데미</a><nav aria-label="계정 메뉴"><a href="/login">로그인</a><a href="/signup">회원가입</a><a href="/account">내 계정</a></nav></header><main class="member-layout ${page==='admin'?'member-admin-layout':''}">${page==='admin'?'':'<aside class="member-visual"><h2>당신의 다음 장면을 함께합니다.</h2><p>김정태 배우아카데미 회원 서비스</p></aside>'}<section id="member-app" class="member-main" data-page="${page}" aria-label="${title}"></section></main><footer class="member-footer">주식회사 스토리나인 · 김정태 배우아카데미</footer><script defer src="/members.js"></script></body></html>`;
 const file=path.join(out,route+'.html');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,html);
}
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())walk(file);else if(file.endsWith('.html')){let html=fs.readFileSync(file,'utf8');if(!html.includes('id="member-app"')&&!html.includes('id="ai-workspace"')){html=html.replace('</head>','<link rel="stylesheet" href="/component-editor.css"></head>').replace('</body>','<script defer src="/component-editor.js"></script></body>');if(!['materials.html','privacy.html','terms.html'].includes(path.basename(file)))html=html.replace('</head>','<link rel="stylesheet" href="/ai-assistant.css"></head>').replace('</body>','<script defer src="/ai-assistant.js"></script></body>');}fs.writeFileSync(file,html);}}}walk(out);
const appFile=path.join(out,'app.js');let app=fs.readFileSync(appFile,'utf8');app=app.replace('const course=courses[button.dataset.course];',"const course={...courses[button.dataset.course],...(window.kjtEditableCourse?.(button.dataset.course)||{})};");fs.writeFileSync(appFile,app);
require('./build-search-branding.cjs').buildSearchBranding(out);
console.log('Published design + component editor: dist-published');
