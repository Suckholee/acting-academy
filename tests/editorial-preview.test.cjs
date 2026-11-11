const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {parseHTML}=require('linkedom'),esbuild=require('esbuild');
const {content}=require('../src/editorial/model.cjs');
const {demoDraft}=require('../api/admin-editorial');
const {memoryRepository}=require('../api/_editorial');
const {previewDocument}=require('../src/editorial/preview.cjs');
const publicHandler=require('../api/journal').createHandler;
test('the deployed editor loads content-versioned files and does not reuse cached admin pages',()=>{
 const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{createHash}=require('node:crypto');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'editorial-cache-test-'));
 try{
  fs.mkdirSync(path.join(dir,'admin'));
  fs.writeFileSync(path.join(dir,'index.html'),'<html><head></head><body><section id="closing"></section></body></html>');
  fs.writeFileSync(path.join(dir,'robots.txt'),'User-agent: *\n');
  fs.writeFileSync(path.join(dir,'sitemap.xml'),'<urlset></urlset>');
  require('../scripts/build-editorial.cjs').buildEditorial(dir);
  const page=parseHTML(fs.readFileSync(path.join(dir,'admin/editorial.html'),'utf8')).document;
  for(const [selector,attr,name]of [['script[src]','src','editorial-admin.js'],['link[rel=stylesheet]','href','editorial.css']]){
   const hash=createHash('sha256').update(fs.readFileSync(path.join(dir,name))).digest('hex').slice(0,12);
   assert.equal(page.querySelector(selector).getAttribute(attr),'/'+name+'?v='+hash);
  }
  const headers=require('../vercel.json').headers;
  for(const route of ['/admin/editorial','/admin/editorial.html','/editorial-admin.js','/editorial.css']){
   assert.match(headers.find(x=>x.source===route)?.headers.find(h=>h.key==='Cache-Control')?.value||'',/no-store/);
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
function draft(){return content({...demoDraft('첫 오디션'),author:'김정태 배우아카데미',course:'',sources:[{title:'확인한 공식 안내',url:'https://example.com/guide'}],cards:Array.from({length:6},(_,i)=>({title:i===5?'웹툰 · 연습을 다시 확인':'준비 항목 '+(i+1),body:'공식 공고를 확인하고 현재 자료로 짧게 연습해보세요.',image:'/assets/course-camera-actors-ai-20261016.jpg',imageAlt:i===5?'가상의 인물로 구성한 세 칸 웹툰':'대본을 읽는 가상의 성인 배우',imagePrompt:'가상의 인물 연습 장면'}))});}
function response(){return {headers:{},code:200,setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},end(html){this.html=html;return this;}};}
test('private preview and public article use the identical complete article layout',async()=>{
 const repo=memoryRepository(),record=await repo.create({id:'10000000-0000-4000-8000-000000000000',draft:draft(),keywords:'첫 오디션',review_notes:['관리자 전용 검토 메모']});
 const privateHTML=previewDocument(record);
 assert.equal(await repo.get(record.id),null);
 assert.doesNotMatch(privateHTML,/Invalid Date|관리자 전용 검토 메모|<script/);
 const live=await repo.update(record.id,0,{published:{...record.draft,modifiedAt:'2026-11-02T00:00:00.000Z'},published_at:'2026-11-02T00:00:00.000Z'});
 const res=response();await publicHandler({repo})({method:'GET',url:'/journal/'+live.id,headers:{}},res);
 const a=parseHTML(privateHTML).document,b=parseHTML(res.html).document;
 a.querySelector('.journal-meta').remove();b.querySelector('.journal-meta').remove();
 assert.equal(a.querySelector('.journal-article').outerHTML,b.querySelector('.journal-article').outerHTML);
 assert.equal(a.querySelectorAll('.editorial-card').length,6);
 assert.equal(a.querySelectorAll('figure.journal-illustration').length,6);
 assert.equal(a.querySelectorAll('figure.journal-illustration-webtoon').length,1);
 assert.equal(a.querySelector('.journal-site-header').outerHTML,b.querySelector('.journal-site-header').outerHTML);
 assert.equal(a.querySelector('.journal-summary').nextElementSibling.tagName,'FIGURE');
 assert.equal(a.querySelectorAll('.journal-answer-section figure').length,record.draft.sections.length);
 const comic=a.querySelector('.journal-illustration-webtoon');
 assert.equal(comic.previousElementSibling.getAttribute('aria-labelledby'),'question-2');
 assert.ok(comic.querySelector('img').getAttribute('alt').includes('웹툰'));
 assert.equal(a.querySelector('figure figcaption'),null);
 assert.equal(comic.textContent,'');
 assert.equal(a.querySelector('.editorial-card:last-child h3').textContent,'연습을 다시 확인');
 assert.equal(record.draft.cards[5].title,'웹툰 · 연습을 다시 확인');
 assert.equal(a.querySelectorAll('.journal-answer-section').length,record.draft.sections.length);
 assert.equal(a.querySelectorAll('.journal-sources a').length,1);
 assert.equal(a.querySelector('link[rel=stylesheet]').getAttribute('href'),'/editorial.css');
 assert.equal(a.querySelector('meta[name=robots]').getAttribute('content'),'noindex,nofollow');
});
test('journal pages retain homepage destinations while excluding the direct-link-only audition route',async()=>{
 const fs=require('node:fs');
 const home=parseHTML(fs.readFileSync('dist-published/index.html','utf8')).document;
 const expected=[...home.querySelectorAll('body>header nav a')].filter(a=>a.getAttribute('href')!=='/ai-audition').map(a=>[a.getAttribute('href'),a.textContent]);
 assert.equal(expected.length,10);
 assert.ok(expected.some(([href])=>href==='/auditions'));
 assert.ok(!expected.some(([href])=>href==='/ai-audition'));
 const repo=memoryRepository(),record=await repo.create({id:'10000000-0000-4000-8000-000000000009',draft:draft(),keywords:'첫 오디션',review_notes:[]});
 await repo.update(record.id,0,{published:{...record.draft,modifiedAt:'2026-11-02T00:00:00.000Z'},published_at:'2026-11-02T00:00:00.000Z'});
 for(const url of ['/journal','/journal/'+record.id,'/journal/10000000-0000-4000-8000-000000000099']){
  const res=response();await publicHandler({repo})({method:'GET',url,headers:{}},res);
  const {document}=parseHTML(res.html),header=document.querySelector('.journal-site-header');
  assert.ok(header);
  assert.deepEqual([...header.querySelectorAll('.journal-desktop-menu a')].map(a=>[a.getAttribute('href'),a.textContent]),expected);
  assert.deepEqual([...header.querySelectorAll('.journal-mobile-menu nav a')].map(a=>[a.getAttribute('href'),a.textContent]),[...expected,['/apply','상담 신청 ↗']]);
  assert.ok(header.querySelector('details>summary[aria-label="전체 메뉴"]'));
  assert.equal(header.querySelector('.journal-desktop-menu [aria-current=page]').getAttribute('href'),'/journal');
 }
});
test('preview escapes unsaved markup, rejects executable source URLs and never modifies its input',()=>{
 const record={draft:{...draft(),title:'<img src=x onerror=alert(1)>',answer:'<script>alert(2)</script>'},published_at:null,review_notes:['PRIVATE']};
 const before=structuredClone(record),html=previewDocument(record);
 assert.deepEqual(record,before);
 const {document}=parseHTML(html);
 assert.equal(document.querySelector('h1').textContent,record.draft.title);
 assert.equal(document.querySelectorAll('script').length,0);
 assert.equal(document.querySelector('[onerror]'),null);
 assert.throws(()=>previewDocument({...record,draft:{...record.draft,sources:[{title:'불안전한 주소',url:'javascript:alert(1)'}]}}));
});
const bundle=esbuild.buildSync({entryPoints:['src/editorial/admin.js'],bundle:true,platform:'browser',format:'iife',write:false}).outputFiles[0].text;
async function studio(){
 const {document,window}=parseHTML('<html><body><main id="editorial-admin"></main></body></html>');
 const record={id:'10000000-0000-4000-8000-000000000001',draft:draft(),keywords:'첫 오디션',review_notes:[],published:null,published_at:null,updated_at:'2026-11-02T00:00:00.000Z',revision:0},requests=[];
 const fetch=async(url,options={})=>{requests.push({url,method:options.method||'GET'});return {ok:true,json:async()=>structuredClone(url==='/api/admin-auth'?{authenticated:true}:{records:[record],nextOffset:null,aiReady:true,demo:false})};};
 vm.runInNewContext(bundle,{document,window,fetch,confirm:()=>true,console,structuredClone,setTimeout,clearTimeout,URL});
 await new Promise(setImmediate);
 const button=name=>[...document.querySelectorAll('button')].find(b=>b.textContent===name);
 return {document,window,record,requests,button};
}
test('opening the studio starts with the publication view and supports mobile and full edit without saving',async()=>{
 const s=await studio();
 assert.ok(s.document.querySelector('iframe[title="발행 화면 미리보기"]'));
 assert.equal(s.document.querySelector('[name=article-title]'),null);
 const frame=s.document.querySelector('iframe');
 assert.ok(!frame.getAttribute('sandbox').includes('allow-scripts'));
 s.button('휴대폰').onclick();
 assert.equal(s.document.querySelector('.editorial-publication-stage').getAttribute('data-viewport'),'mobile');
 assert.equal(s.button('휴대폰').getAttribute('aria-pressed'),'true');
 s.button('PC').onclick();
 assert.equal(s.document.querySelector('.editorial-publication-stage').getAttribute('data-viewport'),'desktop');
 s.button('내용 편집').onclick();
 assert.equal(s.document.querySelector('.editorial-card-download:last-child h3').textContent,'연습을 다시 확인');
 const field=s.document.querySelector('[name=article-title]');assert.ok(field);
 field.value='저장하지 않은 제목 변경';field.dispatchEvent(new s.window.Event('input',{bubbles:true}));
 s.button('발행 화면으로 보기').onclick();
 const html=s.document.querySelector('iframe').srcdoc;
 assert.equal(parseHTML(html).document.querySelector('h1').textContent,'저장하지 않은 제목 변경');
 assert.notEqual(s.record.draft.title,'저장하지 않은 제목 변경');
 assert.equal(s.requests.filter(r=>r.method!=='GET').length,0);
});
test('invalid partial edits stay available in the editor when preview cannot be rendered',async()=>{
 const s=await studio();s.button('내용 편집').onclick();
 const field=s.document.querySelector('[name=article-title]');field.value='';field.dispatchEvent(new s.window.Event('input',{bubbles:true}));
 s.button('발행 화면으로 보기').onclick();
 assert.ok(s.document.querySelector('[name=article-title]'));
 assert.equal(s.document.querySelector('[name=article-title]').value,'');
 assert.match(s.document.querySelector('.editorial-status').textContent,/확인한 뒤 미리보기/);
 assert.equal(s.requests.filter(r=>r.method!=='GET').length,0);
});
